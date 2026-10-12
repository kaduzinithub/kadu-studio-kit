import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { adminRequest, PROVIDER, requiredEnv, sha256 } from "./meta.server";

function base64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function oauthRedirectUrl(request: Request | undefined) {
  if (!request) throw new Error("Não foi possível obter a requisição OAuth.");
  return process.env.META_OAUTH_REDIRECT_URI || new URL("/api/integrations/meta/callback", request.url).toString();
}

export const startMetaOAuth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({}))
  .handler(async ({ context }) => {
    const request = getRequest();
    const appId = requiredEnv("META_APP_ID");
    requiredEnv("META_APP_SECRET");
    requiredEnv("META_TOKEN_ENCRYPTION_KEY");
    const redirectUri = oauthRedirectUrl(request);
    const graphVersion = process.env.META_GRAPH_VERSION || "v24.0";

    const stateBytes = crypto.getRandomValues(new Uint8Array(32));
    const state = base64Url(stateBytes);
    const stateHash = await sha256(state);
    const stateExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await adminRequest("integration_credentials?on_conflict=user_id,provider", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        user_id: context.userId,
        provider: PROVIDER,
        state_hash: stateHash,
        state_expires_at: stateExpiresAt,
      }),
    });

    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      state,
      response_type: "code",
      scope: "ads_read,ads_management,business_management",
    });

    return { authorizationUrl: `https://www.facebook.com/${graphVersion}/dialog/oauth?${params.toString()}` };
  });

export const disconnectMetaOAuth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({}))
  .handler(async ({ context }) => {
    await adminRequest(
      `integration_credentials?user_id=eq.${encodeURIComponent(context.userId)}&provider=eq.${PROVIDER}`,
      { method: "DELETE" },
    );

    await adminRequest("integration_connections?on_conflict=user_id,provider", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        user_id: context.userId,
        provider: PROVIDER,
        status: "disconnected",
        account_name: null,
        account_id: null,
        connected_at: null,
        last_sync_at: null,
        config: {},
      }),
    });

    return { ok: true };
  });
