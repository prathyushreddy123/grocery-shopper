"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getUserContext, assertOwnsItem } from "@/lib/context";
import {
  DEFAULT_SIZE,
  DEFAULT_STORE_FOR_TYPE,
  isRequestType,
} from "@/lib/constants";

function parseQuantity(raw: FormDataEntryValue | null): number {
  const n = parseInt(String(raw ?? "1"), 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, 99);
}

export async function addItem(formData: FormData) {
  const ctx = await getUserContext();
  if (!ctx) throw new Error("Not signed in");
  if (ctx.trip.status !== "OPEN") throw new Error("Ordering is closed");

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

export async function updateItem(formData: FormData) {
  const itemId = String(formData.get("itemId") ?? "");
  const { item } = await assertOwnsItem(itemId);

  // Re-check the trip is still open via the item's order.
  const order = await prisma.order.findUnique({
    where: { id: item.orderId },
    include: { trip: true },
  });
  if (order?.trip.status !== "OPEN") throw new Error("Ordering is closed");

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
  if (order?.trip.status !== "OPEN") throw new Error("Ordering is closed");

  await prisma.item.delete({ where: { id: itemId } });
  revalidatePath("/list");
}
