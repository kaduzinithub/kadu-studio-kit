
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

export { adminRequest, encryptToken, GRAPH_VERSION, PROVIDER, sha256, oauthRedirectUrl, requiredEnv };
