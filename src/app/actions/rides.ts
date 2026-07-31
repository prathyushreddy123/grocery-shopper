"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getHousehold } from "@/lib/session";
import { clampSeats, seatsTaken } from "@/lib/rides";

function refreshRideViews() {
  revalidatePath("/rides");
  revalidatePath("/list"); // the list page teases the next ride + seats left
}

// Book seats on an organizer-opened date — also the "change how many seats"
// path, since it upserts. One booking per household per date; several
// households share the date until its seats are gone.
export async function bookRide(formData: FormData) {
  const household = await getHousehold();
  if (!household) throw new Error("Not signed in");
  const rideDateId = String(formData.get("rideDateId") ?? "");
  const seats = clampSeats(formData.get("seats"));

  // Read the seat count and write the booking in one transaction, so two
  // households tapping the last seat at the same moment can't both win.
  const outcome = await prisma.$transaction(async (tx) => {
    const rideDate = await tx.rideDate.findUnique({
      where: { id: rideDateId },
      include: { bookings: true },
    });
    if (!rideDate) return "gone";

    const mine = rideDate.bookings.find((b) => b.householdId === household.id);
    const takenByOthers = seatsTaken(rideDate.bookings) - (mine?.seats ?? 0);
    if (takenByOthers + seats > rideDate.capacity) return "full";

    await tx.rideBooking.upsert({
      where: { rideDateId_householdId: { rideDateId, householdId: household.id } },
      create: { rideDateId, householdId: household.id, seats },
      update: { seats },
    });
    return "ok";
  });

  if (outcome !== "ok") redirect(`/rides?error=${outcome}`);
  refreshRideViews();
}

export async function cancelRide(formData: FormData) {
  const household = await getHousehold();
  if (!household) throw new Error("Not signed in");
  const rideDateId = String(formData.get("rideDateId") ?? "");

  await prisma.rideBooking.deleteMany({
    where: { rideDateId, householdId: household.id },
  });
  refreshRideViews();
}

// Optional note on your own booking (e.g. "pickup 9am, corner of 5th").
export async function setRideNote(formData: FormData) {
  const household = await getHousehold();
  if (!household) throw new Error("Not signed in");
  const rideDateId = String(formData.get("rideDateId") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;

  await prisma.rideBooking.updateMany({
    where: { rideDateId, householdId: household.id },
    data: { note },
  });
  refreshRideViews();
}
