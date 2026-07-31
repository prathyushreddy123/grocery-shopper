"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getUserContext, assertOwnsItem } from "@/lib/context";
import { isOrderingOpen } from "@/lib/trip";
import {
  DEFAULT_SIZE,
  DEFAULT_STORE_FOR_TYPE,
  isRequestType,
  type RequestType,
} from "@/lib/constants";
import { mergeKey } from "@/lib/byStore";

function parseQuantity(raw: FormDataEntryValue | null): number {
  const n = parseInt(String(raw ?? "1"), 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, 99);
}

export async function addItem(formData: FormData) {
  const ctx = await getUserContext();
  if (!ctx) throw new Error("Not signed in");
  if (!isOrderingOpen(ctx.trip)) throw new Error("Ordering is closed");

  const requestType = String(formData.get("requestType") ?? "");
  if (!isRequestType(requestType)) throw new Error("Invalid request type");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Item name is required");

  const size = String(formData.get("size") ?? "").trim() || DEFAULT_SIZE;
  const note = String(formData.get("note") ?? "").trim() || null;

  await prisma.item.create({
    data: {
      orderId: ctx.order.id,
      requestType,
      name,
      size,
      note,
      quantity: parseQuantity(formData.get("quantity")),
      store: DEFAULT_STORE_FOR_TYPE[requestType],
    },
  });

  revalidatePath("/list");
}

// The household's most recent list from any earlier trip — the source for
// "repeat my last trip". Exported so the page can render the card without
// duplicating the query.
export async function getLastTripItems() {
  const ctx = await getUserContext();
  if (!ctx) return null;

  const lastOrder = await prisma.order.findFirst({
    where: {
      householdId: ctx.household.id,
      tripId: { not: ctx.trip.id },
      items: { some: {} },
    },
    orderBy: { createdAt: "desc" },
    include: { items: { orderBy: { createdAt: "asc" } } },
  });
  if (!lastOrder) return null;

  // Only offer what isn't already on the current list, so the card disappears
  // once it's been used instead of going stale.
  const present = new Set(
    ctx.order.items.map((i) => mergeKey(i.name, i.size)),
  );
  const pending = lastOrder.items.filter(
    (i) => !present.has(mergeKey(i.name, i.size)),
  );

  return pending.length > 0 ? { tripId: lastOrder.tripId, items: pending } : null;
}

// Copy last trip's items onto the current list. With no `itemIds` it copies
// everything still missing; with them, just the ones ticked. Skipping items
// already present makes a double submit — likely on a phone with a flaky
// connection — a no-op rather than a doubled list.
export async function copyLastTrip(formData: FormData) {
  const ctx = await getUserContext();
  if (!ctx) throw new Error("Not signed in");
  if (!isOrderingOpen(ctx.trip)) throw new Error("Ordering is closed");

  const last = await getLastTripItems();
  if (!last) return;

  const picked = formData.getAll("itemIds").map(String).filter(Boolean);
  const chosen = picked.length
    ? last.items.filter((i) => picked.includes(i.id))
    : last.items;
  if (chosen.length === 0) return;

  await prisma.item.createMany({
    data: chosen.map((i) => ({
      orderId: ctx.order.id,
      requestType: i.requestType,
      name: i.name,
      size: i.size,
      note: i.note,
      quantity: i.quantity,
      // Re-derived rather than copied: the organizer may have reassigned the
      // old item to a different store for that trip.
      store: DEFAULT_STORE_FOR_TYPE[i.requestType as RequestType] ?? "UNASSIGNED",
    })),
  });

  revalidatePath("/list");
}

export async function updateItem(formData: FormData) {
  const itemId = String(formData.get("itemId") ?? "");
  const { item } = await assertOwnsItem(itemId);

  // Re-check the trip is still open via the item's order.
  const order = await prisma.order.findUnique({
    where: { id: item.orderId },
    include: { trip: true },
  });
  if (!order || !isOrderingOpen(order.trip)) throw new Error("Ordering is closed");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Item name is required");

  const size = String(formData.get("size") ?? "").trim() || DEFAULT_SIZE;
  const note = String(formData.get("note") ?? "").trim() || null;

  await prisma.item.update({
    where: { id: itemId },
    data: { name, size, note, quantity: parseQuantity(formData.get("quantity")) },
  });

  revalidatePath("/list");
}

export async function deleteItem(formData: FormData) {
  const itemId = String(formData.get("itemId") ?? "");
  const { item } = await assertOwnsItem(itemId);

  const order = await prisma.order.findUnique({
    where: { id: item.orderId },
    include: { trip: true },
  });
  if (!order || !isOrderingOpen(order.trip)) throw new Error("Ordering is closed");

  await prisma.item.delete({ where: { id: itemId } });
  revalidatePath("/list");
}
