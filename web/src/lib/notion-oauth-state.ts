import { createHmac } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";

export const NOTION_STATE_COOKIE = "cd_notion_oauth";
const AUDIENCE = "contextdrop:notion-oauth";

function stateKey(secret: string | undefined): Buffer {
  if (!secret) throw new Error("Missing JWT_SECRET");
  // Domain separation prevents an OAuth state token becoming a session JWT.
  return createHmac("sha256", secret).update("contextdrop:notion-oauth-state:v1").digest();
}

export async function createNotionOAuthState(userId: string, nonce: string, analysisId: string | null, secret: string | undefined): Promise<string> {
  return new SignJWT({ nonce, analysisId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId).setAudience(AUDIENCE).setIssuer("contextdrop")
    .setIssuedAt().setExpirationTime("10m").sign(stateKey(secret));
}

export async function verifyNotionOAuthState(state: string | null, nonce: string | undefined, userId: string, secret: string | undefined): Promise<{ analysisId: string | null } | null> {
  if (!state || state.length > 4096 || !nonce) return null;
  try {
    const { payload } = await jwtVerify(state, stateKey(secret), { algorithms: ["HS256"], audience: AUDIENCE, issuer: "contextdrop" });
    if (payload.sub !== userId || payload.nonce !== nonce || (payload.analysisId !== null && typeof payload.analysisId !== "string")) return null;
    return { analysisId: payload.analysisId as string | null };
  } catch { return null; }
}
