import { prisma } from "@/lib/prisma";

// The current OPEN trip is where new orders/items land. Admin trip management
// arrives in Step 2; until then we seed one OPEN trip so the user flow works
// end to end. Once Step 2 lands, the admin creates trips and this seed is a
// harmless fallback (only fires when there is genuinely no open trip).
export async function getOrSeedOpenTrip() {
  const existing = await prisma.trip.findFirst({
    where: { status: "OPEN" },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return existing;

  const now = new Date();
  const tripDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const cutoffAt = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);
  return prisma.trip.create({
    data: { tripDate, cutoffAt, status: "OPEN" },
  });
}
