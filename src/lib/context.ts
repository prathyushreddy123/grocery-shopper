import { prisma } from "@/lib/prisma";
import { getHousehold } from "@/lib/session";
import { getCurrentTrip } from "@/lib/trip";

// Resolves everything the list page needs for the logged-in user, creating
// their order for the current open trip on demand. Returns null if not signed
// in. The order is ALWAYS derived server-side from the session + current trip,
// never from a client-supplied id — that is what keeps one household's list
// private from another.
export async function getUserContext() {
  const household = await getHousehold();
  if (!household) return null;

  const trip = await getCurrentTrip();

  const order = await prisma.order.upsert({
    where: { tripId_householdId: { tripId: trip.id, householdId: household.id } },
    create: { tripId: trip.id, householdId: household.id },
    update: {},
    include: { items: { orderBy: { createdAt: "asc" } } },
  });

  return { household, trip, order };
}

// Loads the caller's order for the current trip and asserts they own the given
// item. Throws on any mismatch so item mutations can't touch another
// household's data even if an id is guessed.
export async function assertOwnsItem(itemId: string) {
  const household = await getHousehold();
  if (!household) throw new Error("Not signed in");
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    include: { order: true },
  });
  if (!item || item.order.householdId !== household.id) {
    throw new Error("Item not found");
  }
  return { household, item };
}
