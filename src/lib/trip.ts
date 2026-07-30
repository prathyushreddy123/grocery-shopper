import { prisma } from "@/lib/prisma";
import { TRIP_STATUSES, type TripStatus } from "@/lib/constants";

type TripLike = { status: string; cutoffAt: Date };

// At the cutoff moment, ordering locks even if the admin hasn't pressed
// anything yet. We don't run a cron in v1, so the lock is computed on read:
// an OPEN trip past its cutoff behaves as RECEIVED ("List received").
export function effectiveStatus(trip: TripLike): TripStatus {
  if (trip.status === "OPEN" && Date.now() >= trip.cutoffAt.getTime()) {
    return "RECEIVED";
  }
  return trip.status as TripStatus;
}

// Ordering (add/edit/delete) is allowed only before the cutoff on an OPEN trip.
export function isOrderingOpen(trip: TripLike): boolean {
  return trip.status === "OPEN" && Date.now() < trip.cutoffAt.getTime();
}

// The trip users currently see: the most recently created one, whatever its
// state. When the admin opens a new trip it becomes the most recent, so
// everyone rolls forward to it. On an empty database we seed one so the app is
// usable on first run.
export async function getCurrentTrip() {
  const latest = await prisma.trip.findFirst({ orderBy: { createdAt: "desc" } });
  if (latest) return latest;

  const now = new Date();
  return prisma.trip.create({
    data: {
      tripDate: new Date(now.getTime() + 14 * 864e5),
      cutoffAt: new Date(now.getTime() + 10 * 864e5),
      status: "OPEN",
    },
  });
}

// Next status in the lifecycle, or null at the end (CLOSED).
export function nextStatus(status: string): TripStatus | null {
  const i = (TRIP_STATUSES as readonly string[]).indexOf(status);
  if (i < 0 || i >= TRIP_STATUSES.length - 1) return null;
  return TRIP_STATUSES[i + 1];
}
