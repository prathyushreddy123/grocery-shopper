import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "hh_session";
const ONE_YEAR = 60 * 60 * 24 * 365;

function secret(): string {
  return process.env.APP_SECRET ?? "insecure-dev-secret";
}

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

// Cookie value is "<householdId>.<hmac>" so a tampered id is rejected.
function serialize(householdId: string): string {
  return `${householdId}.${sign(householdId)}`;
}

function verify(cookieValue: string): string | null {
  const idx = cookieValue.lastIndexOf(".");
  if (idx < 0) return null;
  const id = cookieValue.slice(0, idx);
  const sig = cookieValue.slice(idx + 1);
  const expected = sign(id);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return id;
}

export async function setSession(householdId: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, serialize(householdId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR,
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

// Returns the logged-in household, or null. Also self-heals if the cookie
// points at a household that no longer exists.
export async function getHousehold() {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  const id = verify(raw);
  if (!id) return null;
  return prisma.household.findUnique({ where: { id } });
}
