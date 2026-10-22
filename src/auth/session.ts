import { createHash, randomBytes } from "node:crypto";

const MAX_AGE = 60 * 60 * 24 * 30;

export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("base64url");
}

export function readSessionToken(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null;
  const pair = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("session="));
  if (!pair) return null;
  const token = pair.slice("session=".length);
  return token || null;
}

export function sessionCookie(token: string): string {
  return `session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${MAX_AGE}`;
}

export function clearSessionCookie(): string {
  return "session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0";
}
