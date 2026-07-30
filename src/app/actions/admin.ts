"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { checkPasscode, setAdmin, clearAdmin, isAdmin } from "@/lib/admin";
import { nextStatus } from "@/lib/trip";

export async function adminLogin(formData: FormData) {
  const passcode = String(formData.get("passcode") ?? "");
  if (!checkPasscode(passcode)) {
    redirect("/admin/login?error=1");
  }
  await setAdmin();
  redirect("/admin");
}

export async function adminLogout() {
  await clearAdmin();
  redirect("/admin/login");
}

async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}

// Create (and open) a new trip. It becomes the current trip everyone sees, so
// this is also how the organizer reopens ordering after a run.
export async function createTrip(formData: FormData) {
  await requireAdmin();

  const tripDateRaw = String(formData.get("tripDate") ?? "");
  const cutoffRaw = String(formData.get("cutoffAt") ?? "");
  // date input -> noon local (avoids off-by-one from UTC midnight);
  // datetime-local input -> parsed as local time.
  const tripDate = tripDateRaw ? new Date(`${tripDateRaw}T12:00`) : null;
  const cutoffAt = cutoffRaw ? new Date(cutoffRaw) : null;

  if (!tripDate || Number.isNaN(tripDate.getTime())) {
    redirect("/admin?error=baddate");
  }
  if (!cutoffAt || Number.isNaN(cutoffAt.getTime())) {
    redirect("/admin?error=badcutoff");
  }
  if (cutoffAt.getTime() > tripDate.getTime() + 864e5) {
    // cutoff should be on/before the trip day (allow same day slack).
    redirect("/admin?error=cutofforder");
  }

  await prisma.trip.create({ data: { tripDate, cutoffAt, status: "OPEN" } });
  revalidatePath("/admin");
  revalidatePath("/list");
  redirect("/admin");
}

// Advance the trip one step along the lifecycle
// (OPEN → RECEIVED → SHOPPING → RETURNING → DELIVERED → CLOSED).
export async function advanceTripStatus(formData: FormData) {
  await requireAdmin();
  const tripId = String(formData.get("tripId") ?? "");
  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip) redirect("/admin?error=notrip");

  const next = nextStatus(trip.status);
  if (!next) redirect("/admin?error=terminal");

  await prisma.trip.update({ where: { id: tripId }, data: { status: next } });
  revalidatePath("/admin");
  revalidatePath("/list");
  redirect("/admin");
}
