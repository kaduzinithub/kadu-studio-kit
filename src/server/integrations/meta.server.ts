import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PROVIDER = "meta-ads";
const GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v24.0";

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Configuração ausente no servidor: ${name}`);
  return value;
}

function base64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return base64Url(new Uint8Array(digest));
}

function isNewSupabaseSecret(value: string) {
  return value.startsWith("sb_secret_");
}

function adminHeaders() {
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Configuração ausente no servidor: SUPABASE_SECRET_KEY");
  const headers = new Headers({ apikey: key, "Content-Type": "application/json" });
  if (!isNewSupabaseSecret(key)) headers.set("Authorization", `Bearer ${key}`);
  return headers;
}

async function adminRequest(path: string, init: RequestInit = {}) {
  const base = requiredEnv("SUPABASE_URL");
  const response = await fetch(`${base}/rest/v1/${path}`, {
    ...init,
    headers: new Headers({
      ...Object.fromEntries(adminHeaders().entries()),
      ...(init.headers ? Object.fromEntries(new Headers(init.headers).entries()) : {}),
    }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Supabase admin request failed [${response.status}]: ${body.slice(0, 400)}`);
  }
  return response;
}

async function encryptToken(token: string) {
  const secret = requiredEnv("META_TOKEN_ENCRYPTION_KEY");
  const keyMaterial = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  const key = await crypto.subtle.importKey("raw", keyMaterial, "AES-GCM", false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(token));
  const payload = new Uint8Array(iv.length + encrypted.byteLength);
  payload.set(iv, 0);
  payload.set(new Uint8Array(encrypted), iv.length);
  return base64Url(payload);
}

function oauthRedirectUrl(request: Request) {
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

    const stateBytes = crypto.getRandomValues(new Uint8Array(32));
    const state = base64Url(stateBytes);
    const stateHash = await sha256(state);
    const stateExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await adminRequest(
      `integration_credentials?on_conflict=user_id,provider`,
      {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({
          user_id: context.userId,
          provider: PROVIDER,
          state_hash: stateHash,
          state_expires_at: stateExpiresAt,
        }),
      },
    );

    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      state,
      response_type: "code",
      scope: "ads_read,ads_management,business_management",
    });

    return {
      authorizationUrl: `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${params.toString()}`,
    };
  });

export const disconnectMetaOAuth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({}))
  .handler(async ({ context }) => {
    await adminRequest(
      `integration_credentials?user_id=eq.${encodeURIComponent(context.userId)}&provider=eq.${PROVIDER}`,
      { method: "DELETE" },
    );

    await adminRequest(
      `integration_connections?user_id=eq.${encodeURIComponent(context.userId)}&provider=eq.${PROVIDER}`,
      {
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
      },
    );

    return { ok: true };
  });

export { adminRequest, encryptToken, GRAPH_VERSION, PROVIDER, sha256, oauthRedirectUrl, requiredEnv };
