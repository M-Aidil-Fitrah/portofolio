import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_SESSION_COOKIE = "portfolio-admin-session";
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 8;

type AdminSession = {
  email: string;
  expiresAt: number;
};

function getSessionSecret() {
  if (process.env.ADMIN_SESSION_SECRET) return process.env.ADMIN_SESSION_SECRET;
  if (process.env.NODE_ENV !== "production") {
    return "portfolio-local-development-session-secret";
  }
  return null;
}

export function getAdminCredentials() {
  const isDevelopment = process.env.NODE_ENV !== "production";
  const email = process.env.ADMIN_EMAIL ?? (isDevelopment ? "admin@local.dev" : "");
  const password = process.env.ADMIN_PASSWORD ?? (isDevelopment ? "admin123" : "");

  return email && password ? { email, password } : null;
}

function sign(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export function credentialsMatch(
  email: string,
  password: string,
  expected: { email: string; password: string }
) {
  const emailMatches = safeEqual(
    email.trim().toLowerCase(),
    expected.email.toLowerCase()
  );
  const passwordMatches = safeEqual(password, expected.password);

  return emailMatches && passwordMatches;
}

export function createAdminSession(email: string) {
  const secret = getSessionSecret();
  if (!secret) return null;

  const session: AdminSession = {
    email,
    expiresAt: Date.now() + ADMIN_SESSION_MAX_AGE * 1000,
  };
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");

  return `${payload}.${sign(payload, secret)}`;
}

function verifyAdminSession(token: string | undefined) {
  const secret = getSessionSecret();
  if (!token || !secret) return false;

  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra || !safeEqual(signature, sign(payload, secret))) {
    return false;
  }

  try {
    const session = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as AdminSession;

    return Boolean(session.email) && session.expiresAt > Date.now();
  } catch {
    return false;
  }
}

export async function isAdminAuthenticated() {
  const cookieStore = await cookies();
  return verifyAdminSession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
}
