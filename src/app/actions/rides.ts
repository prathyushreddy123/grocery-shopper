"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getHousehold } from "@/lib/session";

// Book a seat on an organizer-opened ride date. Idempotent per household+date.
export async function bookRide(formData: FormData) {
  const household = await getHousehold();
  if (!household) throw new Error("Not signed in");
  const rideDateId = String(formData.get("rideDateId") ?? "");

  const rideDate = await prisma.rideDate.findUnique({ where: { id: rideDateId } });
  if (!rideDate) throw new Error("That ride date is no longer available");

  await prisma.rideBooking.upsert({
    where: { rideDateId_householdId: { rideDateId, householdId: household.id } },
    create: { rideDateId, householdId: household.id },
    update: {},
  });
  revalidatePath("/rides");
}

export async function cancelRide(formData: FormData) {
  const household = await getHousehold();
  if (!household) throw new Error("Not signed in");
  const rideDateId = String(formData.get("rideDateId") ?? "");

  await prisma.rideBooking.deleteMany({
    where: { rideDateId, householdId: household.id },
  });
  revalidatePath("/rides");
}

// Optional note on your own booking (e.g. "2 people, pickup 9am").
export async function setRideNote(formData: FormData) {
  const household = await getHousehold();
  if (!household) throw new Error("Not signed in");
  const rideDateId = String(formData.get("rideDateId") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;

  await prisma.rideBooking.updateMany({
    where: { rideDateId, householdId: household.id },
    data: { note },
  });
  revalidatePath("/rides");
}
