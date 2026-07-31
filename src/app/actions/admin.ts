"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { checkPasscode, setAdmin, clearAdmin, isAdmin } from "@/lib/admin";
import { nextStatus } from "@/lib/trip";
import { isStore } from "@/lib/constants";
import { seatsTaken } from "@/lib/rides";

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

const ORDER_FLAGS = ["delivered", "paid"] as const;

// Shopping checklist: flip whether an item has been bought.
export async function toggleItemBought(formData: FormData) {
  await requireAdmin();
  const itemId = String(formData.get("itemId") ?? "");
  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (item) {
    await prisma.item.update({
      where: { id: itemId },
      data: { bought: !item.bought },
    });
  }
  revalidatePath("/admin/by-person");
  revalidatePath("/admin/by-store");
}

// Per-household flags. Payment happens outside the app (Zelle/Venmo); we only
// track the flag. `field` is validated against an allowlist so it can't be
// used to write arbitrary columns.
export async function toggleOrderFlag(formData: FormData) {
  await requireAdmin();
  const orderId = String(formData.get("orderId") ?? "");
  const field = String(formData.get("field") ?? "");
  if (!(ORDER_FLAGS as readonly string[]).includes(field)) return;

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (order) {
    const key = field as (typeof ORDER_FLAGS)[number];
    await prisma.order.update({
      where: { id: orderId },
      data: { [key]: !order[key] },
    });
  }
  revalidatePath("/admin/by-person");
}

function parseIds(formData: FormData): string[] {
  return String(formData.get("itemIds") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// By-Store shopping: mark a whole merged line (all requesters' copies) bought
// or not in one tap. Keeps By-Person in sync since it's the same rows.
export async function setGroupBought(formData: FormData) {
  await requireAdmin();
  const ids = parseIds(formData);
  const bought = String(formData.get("bought") ?? "") === "true";
  if (ids.length) {
    await prisma.item.updateMany({
      where: { id: { in: ids } },
      data: { bought },
    });
  }
  revalidatePath("/admin/by-store");
  revalidatePath("/admin/by-person");
}

// Reassign a merged line to another store (moves every underlying item).
export async function reassignGroup(formData: FormData) {
  await requireAdmin();
  const ids = parseIds(formData);
  const store = String(formData.get("store") ?? "");
  if (!isStore(store)) return;
  if (ids.length) {
    await prisma.item.updateMany({
      where: { id: { in: ids } },
      data: { store },
    });
  }
  revalidatePath("/admin/by-store");
  revalidatePath("/admin/by-person");
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

// --- Rides (organizer opens/closes bookable dates) ---

export async function openRideDate(formData: FormData) {
  await requireAdmin();
  const dateRaw = String(formData.get("date") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;
  // Store at UTC noon so the calendar day reads back identically in dev
  // (local tz) and on Vercel (UTC) — no off-by-one.
  const date = dateRaw ? new Date(`${dateRaw}T12:00:00Z`) : null;
  if (!date || Number.isNaN(date.getTime())) redirect("/admin/rides?error=baddate");

  await prisma.rideDate.create({ data: { date, note } });
  revalidatePath("/admin/rides");
  revalidatePath("/rides");
  redirect("/admin/rides");
}

export async function closeRideDate(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("rideDateId") ?? "");
  // Cascade removes any bookings on that date.
  await prisma.rideDate.deleteMany({ where: { id } });
  revalidatePath("/admin/rides");
  revalidatePath("/rides");
  redirect("/admin/rides");
}

// Calendar toggle: open a day if closed, close it if already open. Dates are
// stored at UTC noon (see openRideDate) so a day maps to one exact timestamp.
export async function toggleRideDate(formData: FormData) {
  await requireAdmin();
  const dateRaw = String(formData.get("date") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) redirect("/admin/rides?error=baddate");
  const date = new Date(`${dateRaw}T12:00:00Z`);

  const existing = await prisma.rideDate.findFirst({ where: { date } });
  if (existing) {
    await prisma.rideDate.delete({ where: { id: existing.id } }); // cascade removes bookings
  } else {
    await prisma.rideDate.create({ data: { date } });
  }
  revalidatePath("/admin/rides");
  revalidatePath("/rides");
  redirect("/admin/rides");
}

// Seats in the car for a given date. Can't drop below what's already booked —
// the organizer would have to cancel someone first.
export async function setRideCapacity(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("rideDateId") ?? "");
  const capacity = Math.min(12, Math.max(1, Math.trunc(Number(formData.get("capacity")))));
  if (!Number.isFinite(capacity)) redirect("/admin/rides?error=badcapacity");

  const rideDate = await prisma.rideDate.findUnique({
    where: { id },
    include: { bookings: true },
  });
  if (!rideDate) redirect("/admin/rides?error=nodate");
  if (capacity < seatsTaken(rideDate.bookings)) {
    redirect("/admin/rides?error=capacitylow");
  }

  await prisma.rideDate.update({ where: { id }, data: { capacity } });
  revalidatePath("/admin/rides");
  revalidatePath("/rides");
  revalidatePath("/list");
  redirect("/admin/rides");
}

// Optional organizer note on an open date (e.g. "Leaving 8am").
export async function setRideDateNote(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("rideDateId") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;
  await prisma.rideDate.updateMany({ where: { id }, data: { note } });
  revalidatePath("/admin/rides");
  revalidatePath("/rides");
  redirect("/admin/rides");
}
