import { createHash, randomBytes } from "node:crypto";
import { EncryptJWT, jwtDecrypt } from "jose";
import { GOOGLE_AUTH_STORAGE_KEY } from "./supabase-auth";

export const GOOGLE_FLOW_COOKIE = process.env.NODE_ENV === "production" ? "__Host-cd_google_flow" : "cd_google_flow";
export const GOOGLE_FLOW_SECONDS = 10 * 60;
const AUDIENCE = "contextdrop-google-login";
export const googleFlowCookieOptions = {
  httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const,
  path: "/", maxAge: GOOGLE_FLOW_SECONDS,
};

export function googleAuthConfigured(env: Readonly<Record<string, string | undefined>> = process.env): boolean {
  return !!(env.SUPABASE_URL && env.SUPABASE_ANON_KEY && env.SUPABASE_SERVICE_KEY && env.JWT_SECRET);
}

export function newGoogleState(): string { return randomBytes(32).toString("base64url"); }

export function googleAuthStorage(verifier?: string) {
  const values = new Map<string, string>();
  const key = `${GOOGLE_AUTH_STORAGE_KEY}-code-verifier`;
  if (verifier) values.set(key, verifier);
  return {
    getItem: (name: string) => values.get(name) ?? null,
    setItem: (name: string, value: string) => { values.set(name, value); },
    removeItem: (name: string) => { values.delete(name); },
    verifier: () => values.get(key),
  };
}

export type GoogleFlow = { state: string; verifier: string; claimToken?: string };

function flowKey(secret: string) { return createHash("sha256").update(`${AUDIENCE}:${secret}`).digest(); }

export async function signGoogleFlow(flow: GoogleFlow, secret: string): Promise<string> {
  return new EncryptJWT(flow).setProtectedHeader({ alg: "dir", enc: "A256GCM" }).setAudience(AUDIENCE)
    .setIssuedAt().setExpirationTime(`${GOOGLE_FLOW_SECONDS}s`).encrypt(flowKey(secret));
}

export async function readGoogleFlow(cookie: string | undefined, state: string, secret: string): Promise<GoogleFlow | null> {
  if (!cookie || cookie.length > 4000) return null;
  try {
    const { payload } = await jwtDecrypt(cookie, flowKey(secret), { keyManagementAlgorithms: ["dir"], contentEncryptionAlgorithms: ["A256GCM"], audience: AUDIENCE, maxTokenAge: `${GOOGLE_FLOW_SECONDS}s` });
    if (payload.state !== state || typeof payload.verifier !== "string" || payload.verifier.length > 256 || !payload.verifier) return null;
    if (payload.claimToken !== undefined && (typeof payload.claimToken !== "string" || payload.claimToken.length > 2048)) return null;
    return { state, verifier: payload.verifier, ...(typeof payload.claimToken === "string" ? { claimToken: payload.claimToken } : {}) };
  } catch { return null; }
}
