import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";

// Admin access is a single shared passcode (ADMIN_PASSCODE). On success we set
// a signed cookie so only the organizer reaches the admin pages. This is the
// minimal gate needed for trip management in Step 2; the full admin views
// (By Person / By Store) come in Steps 3–4.
const COOKIE_NAME = "admin_session";
const ONE_WEEK = 60 * 60 * 24 * 7;

function secret(): string {
  return process.env.APP_SECRET ?? "insecure-dev-secret";
}

function token(): string {
  // Bind the cookie to the current passcode so rotating it logs admins out.
  return createHmac("sha256", secret())
    .update(`admin:${process.env.ADMIN_PASSCODE ?? ""}`)
    .digest("hex");
}

export function checkPasscode(input: string): boolean {
  const expected = process.env.ADMIN_PASSCODE ?? "";
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function setAdmin(): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, token(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_WEEK,
  });
}

export async function clearAdmin(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return false;
  const expected = token();
  const a = Buffer.from(raw);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
