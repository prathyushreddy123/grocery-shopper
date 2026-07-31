import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { getCurrentTrip, effectiveStatus } from "@/lib/trip";
import { setGroupBought, reassignGroup } from "@/app/actions/admin";
import { mergeByStore, type MergedLine } from "@/lib/byStore";
import { STORE_LABELS, STORES, type Store } from "@/lib/constants";
import AdminNav from "../AdminNav";

// Unassigned first (needs a decision), then in a natural shopping order.
const DISPLAY_ORDER: Store[] = [
  "UNASSIGNED",
  "PATEL",
  "COSTCO",
  "AL_MADHINA",
  "RESTAURANT",
];

export default async function ByStorePage() {
  if (!(await isAdmin())) redirect("/admin/login");

  const trip = await getCurrentTrip();
  const items = await prisma.item.findMany({
    where: { order: { tripId: trip.id } },
    include: { order: { include: { household: true } } },
  });

  const grouped = mergeByStore(items);
  const totalItems = items.length;
  const boughtItems = items.filter((i) => i.bought).length;
  const unassigned = grouped.get("UNASSIGNED")?.length ?? 0;

  return (
    <main className="flex-1">
      <div className="mx-auto w-full max-w-lg px-4 py-6">
        <h1 className="mb-4 text-lg font-bold">By Store</h1>
        <AdminNav active="/admin/by-store" />

        <div className="mb-5 rounded-xl border border-border bg-card p-3 text-sm">
          <p className="font-semibold">
            {trip.tripDate.toLocaleDateString("en-US", {
              weekday: "short",
              month: "long",
              day: "numeric",
            })}{" "}
            <span className="ml-1 rounded-full bg-foreground px-2 py-0.5 text-xs font-medium text-background">
              {effectiveStatus(trip)}
            </span>
          </p>
          <p className="mt-1 opacity-70">
            {boughtItems}/{totalItems} item{totalItems === 1 ? "" : "s"} bought
            {unassigned > 0 && ` · ${unassigned} unassigned`}
          </p>
        </div>

        {totalItems === 0 && (
          <p className="rounded-xl border border-border bg-card p-4 text-sm opacity-70">
            No items on this trip yet.
          </p>
        )}

        <div className="flex flex-col gap-5">
          {DISPLAY_ORDER.map((store) => {
            const lines = grouped.get(store);
            if (!lines || lines.length === 0) return null;
            const isUnassigned = store === "UNASSIGNED";
            return (
              <section
                key={store}
                className={[
                  "rounded-2xl border p-4 shadow-sm",
                  isUnassigned
                    ? "border-accent-line bg-accent-soft"
                    : "border-border bg-card",
                ].join(" ")}
              >
                <h2 className="mb-3 flex items-center gap-2 text-base font-bold">
                  {STORE_LABELS[store]}
                  <span className="ml-auto rounded-full bg-foreground/10 px-2 py-0.5 text-xs font-medium text-foreground/80">
                    {lines.length} line{lines.length === 1 ? "" : "s"}
                  </span>
                </h2>
                {isUnassigned && (
                  <p className="mb-3 text-xs text-accent-ink">
                    Assign these to a store below.
                  </p>
                )}
                <div className="flex flex-col gap-2">
                  {lines.map((line) => (
                    <StoreLine key={line.key} line={line} store={store} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}

function StoreLine({ line, store }: { line: MergedLine; store: Store }) {
  const ids = line.itemIds.join(",");
  const requesterText = line.requesters
    .map((r) => {
      const q = r.quantity > 1 ? ` ×${r.quantity}` : "";
      const n = r.note ? ` (${r.note})` : "";
      return `${r.name}${q}${n}`;
    })
    .join(", ");

  return (
    <div
      className={[
        "rounded-lg border",
        line.allBought
          ? "border-brand-line bg-brand-soft"
          : "border-border bg-background",
      ].join(" ")}
    >
      {/* Tap to mark the whole merged line bought/unbought */}
      <form action={setGroupBought}>
        <input type="hidden" name="itemIds" value={ids} />
        <input type="hidden" name="bought" value={String(!line.allBought)} />
        <button
          type="submit"
          className="flex w-full items-start gap-2 px-3 py-2 text-left"
        >
          <span className="mt-0.5 text-lg leading-none">
            {line.allBought ? "☑" : "☐"}
          </span>
          <span className="min-w-0 flex-1">
            <span
              className={
                line.allBought
                  ? "font-medium line-through opacity-60"
                  : "font-medium"
              }
            >
              {line.name}
              {line.totalQty > 1 && (
                <span className="opacity-70"> ×{line.totalQty}</span>
              )}
            </span>
            {line.size && (
              <span className="block text-xs opacity-50">{line.size}</span>
            )}
            <span className="block text-xs opacity-70">— {requesterText}</span>
          </span>
        </button>
      </form>

      {/* Reassign to another store */}
      <form
        action={reassignGroup}
        className="flex items-center gap-2 border-t border-border/70 px-3 py-2"
      >
        <input type="hidden" name="itemIds" value={ids} />
        <label className="text-xs opacity-60">Move to</label>
        <select
          name="store"
          defaultValue={store}
          className="flex-1 rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
        >
          {STORES.map((s) => (
            <option key={s} value={s}>
              {STORE_LABELS[s]}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium"
        >
          Move
        </button>
      </form>
    </div>
  );
}
