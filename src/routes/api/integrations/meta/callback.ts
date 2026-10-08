import { createFileRoute } from "@tanstack/react-router";
import { adminRequest, encryptToken, GRAPH_VERSION, PROVIDER, oauthRedirectUrl, requiredEnv, sha256 } from "@/server/integrations/meta.server";

export const Route = createFileRoute("/api/integrations/meta/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const error = url.searchParams.get("error");
        const errorDescription = url.searchParams.get("error_description");
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");

        const redirectWith = (params: Record<string, string>) => {
          const target = new URL("/integrations", request.url);
          for (const [key, value] of Object.entries(params)) target.searchParams.set(key, value);
          return Response.redirect(target.toString(), 302);
        };

        if (error) {
          return redirectWith({ meta: "error", message: errorDescription || error });
        }
        if (!code || !state) {
          return redirectWith({ meta: "error", message: "Resposta OAuth incompleta." });
        }

        try {
          const stateHash = await sha256(state);
          const stateResponse = await adminRequest(
            `integration_credentials?provider=eq.${PROVIDER}&state_hash=eq.${encodeURIComponent(stateHash)}&select=user_id,state_expires_at`,
          );
          const rows = await stateResponse.json() as Array<{ user_id: string; state_expires_at: string | null }>;
          const stateRow = rows[0];

          if (!stateRow || !stateRow.state_expires_at || new Date(stateRow.state_expires_at).getTime() < Date.now()) {
            return redirectWith({ meta: "error", message: "Estado OAuth inválido ou expirado. Tente conectar novamente." });
          }

          const appId = requiredEnv("META_APP_ID");
          const appSecret = requiredEnv("META_APP_SECRET");
          const redirectUri = oauthRedirectUrl(request);
          const tokenUrl = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token`);
          tokenUrl.searchParams.set("client_id", appId);
          tokenUrl.searchParams.set("client_secret", appSecret);
          tokenUrl.searchParams.set("redirect_uri", redirectUri);
          tokenUrl.searchParams.set("code", code);

          const tokenResponse = await fetch(tokenUrl);
          const tokenPayload = await tokenResponse.json() as {
            access_token?: string;
            expires_in?: number;
            error?: { message?: string };
          };

          if (!tokenResponse.ok || !tokenPayload.access_token) {
            throw new Error(tokenPayload.error?.message || `Falha ao trocar o código OAuth [${tokenResponse.status}]`);
          }

          const longLivedUrl = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token`);
          longLivedUrl.searchParams.set("grant_type", "fb_exchange_token");
          longLivedUrl.searchParams.set("client_id", appId);
          longLivedUrl.searchParams.set("client_secret", appSecret);
          longLivedUrl.searchParams.set("fb_exchange_token", tokenPayload.access_token);

          const longLivedResponse = await fetch(longLivedUrl);
          const longLivedPayload = await longLivedResponse.json() as {
            access_token?: string;
            expires_in?: number;
            error?: { message?: string };
          };

          const accessToken = longLivedResponse.ok && longLivedPayload.access_token
            ? longLivedPayload.access_token
            : tokenPayload.access_token;
          const expiresIn = longLivedResponse.ok && longLivedPayload.expires_in
            ? longLivedPayload.expires_in
            : tokenPayload.expires_in;

          const graph = async (path: string) => {
            const graphUrl = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${path}`);
            graphUrl.searchParams.set("access_token", accessToken);
            const response = await fetch(graphUrl);
            const payload = await response.json();
            if (!response.ok) {
              throw new Error(payload?.error?.message || `Meta Graph API [${response.status}]`);
            }
            return payload;
          };

          const me = await graph("me?fields=id,name");
          const accounts = await graph("me/adaccounts?fields=id,account_id,name,currency,account_status&limit=100");

          const encryptedToken = await encryptToken(accessToken);
          const tokenExpiresAt = expiresIn ? new Date(Date.now() + Number(expiresIn) * 1000).toISOString() : null;
          const accountList = Array.isArray(accounts?.data)
            ? accounts.data.map((account: Record<string, unknown>) => ({
                id: String(account.id ?? ""),
                account_id: String(account.account_id ?? account.id ?? ""),
                name: String(account.name ?? "Conta de anúncios"),
                currency: account.currency ?? null,
                account_status: account.account_status ?? null,
              }))
            : [];

          await adminRequest(
            `integration_credentials?user_id=eq.${encodeURIComponent(stateRow.user_id)}&provider=eq.${PROVIDER}`,
            {
              method: "PATCH",
              headers: { Prefer: "return=minimal" },
              body: JSON.stringify({
                access_token_encrypted: encryptedToken,
                token_expires_at: tokenExpiresAt,
                state_hash: null,
                state_expires_at: null,
                metadata: {
                  meta_user_id: String(me?.id ?? ""),
                  meta_user_name: String(me?.name ?? ""),
                  ad_accounts: accountList,
                },
              }),
            },
          );

          const firstAccount = accountList[0];
          await adminRequest(
            `integration_connections?on_conflict=user_id,provider`,
            {
              method: "POST",
              headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
              body: JSON.stringify({
                user_id: stateRow.user_id,
                provider: PROVIDER,
                status: "connected",
                account_name: firstAccount?.name || String(me?.name || "Meta Ads"),
                account_id: firstAccount?.account_id || null,
                connected_at: new Date().toISOString(),
                last_sync_at: new Date().toISOString(),
                config: {
                  meta_user_id: String(me?.id ?? ""),
                  ad_accounts_count: accountList.length,
                },
              }),
            },
          );

          return redirectWith({
            meta: "connected",
            accounts: String(accountList.length),
          });
        } catch (err) {
          console.error("[Meta OAuth]", err);
          return redirectWith({
            meta: "error",
            message: err instanceof Error ? err.message.slice(0, 180) : "Falha ao conectar o Meta Ads.",
          });
        }
      },
    },
  },
});
