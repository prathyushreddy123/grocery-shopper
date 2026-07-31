import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { getCurrentTrip, effectiveStatus } from "@/lib/trip";
import { toggleItemBought, toggleOrderFlag } from "@/app/actions/admin";
import { formatPhone } from "@/lib/phone";
import {
  REQUEST_TYPES,
  REQUEST_TYPE_META,
  STORE_LABELS,
  DEFAULT_SIZE,
  type Store,
} from "@/lib/constants";
import AdminNav from "../AdminNav";

export default async function ByPersonPage() {
  if (!(await isAdmin())) redirect("/admin/login");

  const trip = await getCurrentTrip();
  const orders = await prisma.order.findMany({
    where: { tripId: trip.id, items: { some: {} } },
    include: { household: true, items: { orderBy: { createdAt: "asc" } } },
    orderBy: { household: { name: "asc" } },
  });

  const totalItems = orders.reduce((n, o) => n + o.items.length, 0);
  const deliveredCount = orders.filter((o) => o.delivered).length;
  const paidCount = orders.filter((o) => o.paid).length;

  return (
    <main className="flex-1">
      <div className="mx-auto w-full max-w-lg px-4 py-6">
        <h1 className="mb-4 text-lg font-bold">By Person</h1>
        <AdminNav active="/admin/by-person" />

        <div className="mb-5 rounded-xl border border-border bg-card p-3 text-sm">
          <p className="font-semibold">
            {trip.tripDate.toLocaleDateString("en-US", {
              weekday: "short",
              month: "long",
              day: "numeric",
            })}{" "}
            <span className="ml-1 rounded-full bg-slate-800 px-2 py-0.5 text-xs font-medium text-white dark:bg-slate-700">
              {effectiveStatus(trip)}
            </span>
          </p>
          <p className="mt-1 opacity-70">
            {orders.length} household{orders.length === 1 ? "" : "s"} ·{" "}
            {totalItems} item{totalItems === 1 ? "" : "s"} · {deliveredCount}{" "}
            delivered · {paidCount} paid
          </p>
        </div>

        {orders.length === 0 && (
          <p className="rounded-xl border border-border bg-card p-4 text-sm opacity-70">
            No one has added items to this trip yet.
          </p>
        )}

        <div className="flex flex-col gap-5">
          {orders.map((order) => {
            const bought = order.items.filter((i) => i.bought).length;
            return (
              <section
                key={order.id}
                className="rounded-2xl border border-border bg-card p-4 shadow-sm"
              >
                <header className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold">{order.household.name}</p>
                    <p className="text-xs opacity-60">
                      {formatPhone(order.household.phone)}
                    </p>
                    <p className="mt-0.5 text-xs opacity-70">
                      📍{" "}
                      {order.household.address ? (
                        order.household.address
                      ) : (
                        <span className="italic text-amber-600 dark:text-amber-400">
                          no address given
                        </span>
                      )}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                    {bought}/{order.items.length} bought
                  </span>
                </header>

                {/* Per-household flags */}
                <div className="mb-4 flex gap-2">
                  <FlagButton
                    orderId={order.id}
                    field="delivered"
                    on={order.delivered}
                    label="Delivered"
                  />
                  <FlagButton
                    orderId={order.id}
                    field="paid"
                    on={order.paid}
                    label="Paid"
                  />
                </div>

                {/* Items grouped by request type */}
                <div className="flex flex-col gap-3">
                  {REQUEST_TYPES.map((type) => {
                    const items = order.items.filter(
                      (i) => i.requestType === type,
                    );
                    if (items.length === 0) return null;
                    const meta = REQUEST_TYPE_META[type];
                    return (
                      <div key={type}>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide opacity-60">
                          {meta.emoji} {meta.label}
                        </p>
                        <div className="flex flex-col gap-1.5">
                          {items.map((item) => (
                            <form
                              key={item.id}
                              action={toggleItemBought}
                              className="contents"
                            >
                              <input
                                type="hidden"
                                name="itemId"
                                value={item.id}
                              />
                              <button
                                type="submit"
                                className={[
                                  "flex w-full items-start gap-2 rounded-lg border px-3 py-2 text-left",
                                  item.bought
                                    ? "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40"
                                    : "border-border bg-background",
                                ].join(" ")}
                              >
                                <span className="mt-0.5 text-lg leading-none">
                                  {item.bought ? "☑" : "☐"}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span
                                    className={
                                      item.bought
                                        ? "font-medium line-through opacity-60"
                                        : "font-medium"
                                    }
                                  >
                                    {item.name}
                                    {item.quantity > 1 && (
                                      <span className="opacity-70">
                                        {" "}
                                        ×{item.quantity}
                                      </span>
                                    )}
                                  </span>
                                  <span className="block text-xs opacity-60">
                                    {item.size !== DEFAULT_SIZE
                                      ? item.size
                                      : "Standard size"}
                                    {item.store !== "UNASSIGNED" &&
                                      ` · ${STORE_LABELS[item.store as Store]}`}
                                  </span>
                                  {item.note && (
                                    <span className="block text-xs italic opacity-70">
                                      “{item.note}”
                                    </span>
                                  )}
                                </span>
                              </button>
                            </form>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}

function FlagButton({
  orderId,
  field,
  on,
  label,
}: {
  orderId: string;
  field: "delivered" | "paid";
  on: boolean;
  label: string;
}) {
  return (
    <form action={toggleOrderFlag} className="flex-1">
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="field" value={field} />
      <button
        type="submit"
        className={[
          "w-full rounded-lg border px-3 py-2 text-sm font-medium",
          on
            ? "border-emerald-500 bg-emerald-600 text-white"
            : "border-border bg-background opacity-80",
        ].join(" ")}
      >
        {on ? "✓ " : ""}
        {label}
      </button>
    </form>
  );
}
