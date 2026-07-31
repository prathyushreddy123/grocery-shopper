"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";
import { hashPin, isValidPin, verifyPin } from "@/lib/pin";
import { setSession, clearSession } from "@/lib/session";

// Step 1 of entry: user submits a phone number. We branch to registration,
// PIN prompt, or straight into the list depending on what we find.
export async function startLogin(formData: FormData) {
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  if (!phone) redirect(`/?error=badphone`);

  const household = await prisma.household.findUnique({ where: { phone } });
  if (!household) redirect(`/?step=register&phone=${phone}`);
  if (household.pinHash) redirect(`/?step=pin&phone=${phone}`);

  await setSession(household.id);
  redirect("/list");
}

// New household: name + phone + optional PIN.
export async function register(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  const pinRaw = String(formData.get("pin") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim() || null;

  if (!phone) redirect(`/?error=badphone`);
  if (!name) redirect(`/?step=register&phone=${phone}&error=noname`);
  if (pinRaw && !isValidPin(pinRaw)) {
    redirect(`/?step=register&phone=${phone}&error=badpin`);
  }

  // Guard against a race / double-submit where the phone already exists.
  const existing = await prisma.household.findUnique({ where: { phone } });
  if (existing) {
    if (existing.pinHash) redirect(`/?step=pin&phone=${phone}`);
    await setSession(existing.id);
    redirect("/list");
  }

  const household = await prisma.household.create({
    data: { name, phone, pinHash: pinRaw ? hashPin(pinRaw) : null, address },
  });
  await setSession(household.id);
  redirect("/list");
}

// Returning household that has a PIN set.
export async function verifyPinAction(formData: FormData) {
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  const pin = String(formData.get("pin") ?? "").trim();
  if (!phone) redirect(`/?error=badphone`);

  const household = await prisma.household.findUnique({ where: { phone } });
  // Don't leak whether the phone exists; both paths look the same to the user.
  if (!household || !household.pinHash || !verifyPin(pin, household.pinHash)) {
    redirect(`/?step=pin&phone=${phone}&error=badpin`);
  }

  await setSession(household.id);
  redirect("/list");
}

export async function logout() {
  await clearSession();
  redirect("/");
}
