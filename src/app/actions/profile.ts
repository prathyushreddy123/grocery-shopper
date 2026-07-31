"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getHousehold } from "@/lib/session";

// Set/update the household's delivery address. Address is per household and
// persists across trips.
export async function updateAddress(formData: FormData) {
  const household = await getHousehold();
  if (!household) throw new Error("Not signed in");
  const address = String(formData.get("address") ?? "").trim() || null;

  await prisma.household.update({
    where: { id: household.id },
    data: { address },
  });
  revalidatePath("/list");
}
