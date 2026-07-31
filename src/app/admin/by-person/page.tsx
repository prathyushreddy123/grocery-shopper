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
import ListFilter from "../ListFilter";
import SignupGaps from "../SignupGaps";
import AdminNav from "../AdminNav";

export default async function ByPersonPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; hide?: string }>;
}) {
  if (!(await isAdmin())) redirect("/admin/login");

  const { q: rawQ, hide } = await searchParams;
  const q = (rawQ ?? "").trim();
  const hideBought = hide === "1";

  const trip = await getCurrentTrip();
  const orders = await prisma.order.findMany({
    where: { tripId: trip.id, items: { some: {} } },
    include: { household: true, items: { orderBy: { createdAt: "asc" } } },
    orderBy: { household: { name: "asc" } },
  });

  const totalItems = orders.reduce((n, o) => n + o.items.length, 0);
  const deliveredCount = orders.filter((o) => o.delivered).length;
  const paidCount = orders.filter((o) => o.paid).length;

  // Households with nothing on this trip — invisible in the list above, since
  // that only includes orders that have items. Split by whether they've ever
  // ordered: a new signup who never ordered may be stuck and needs a different
  // kind of follow-up than a regular who just hasn't got to it yet.
  const withoutItems = await prisma.household.findMany({
    where: { orders: { none: { tripId: trip.id, items: { some: {} } } } },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { rideBookings: true } },
      orders: { select: { _count: { select: { items: true } } } },
    },
  });
  const gaps = withoutItems.map((h) => ({
    id: h.id,
    name: h.name,
    phone: h.phone,
    createdAt: h.createdAt,
    everOrdered: h.orders.some((o) => o._count.items > 0),
    rideBookings: h._count.rideBookings,
  }));
  const neverOrdered = gaps.filter((h) => !h.everOrdered);
  const quietThisTrip = gaps.filter((h) => h.everOrdered);

  // Ordered, but nowhere to deliver it — the one that bites on delivery day.
  const missingAddress = orders
    .filter((o) => !o.household.address?.trim())
    .map((o) => ({
      id: o.household.id,
      name: o.household.name,
      phone: o.household.phone,
    }));

  // Searching a person's name keeps their whole list; searching a product
  // narrows to matching items. Households left with nothing drop out.
  const needle = q.toLowerCase();
  const visibleOrders = orders
    .map((order) => {
      const householdMatches =
        !q || order.household.name.toLowerCase().includes(needle);
      const items = order.items.filter((i) => {
        if (hideBought && i.bought) return false;
        if (!q) return true;
        return householdMatches || i.name.toLowerCase().includes(needle);
      });
      return { order, items };
    })
    .filter((o) => o.items.length > 0);

  const shownItems = visibleOrders.reduce((n, o) => n + o.items.length, 0);

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
            <span className="ml-1 rounded-full bg-foreground px-2 py-0.5 text-xs font-medium text-background">
              {effectiveStatus(trip)}
            </span>
          </p>
          <p className="mt-1 opacity-70">
            {orders.length} household{orders.length === 1 ? "" : "s"} ·{" "}
            {totalItems} item{totalItems === 1 ? "" : "s"} · {deliveredCount}{" "}
            delivered · {paidCount} paid
          </p>
        </div>

        {/* Follow-ups, hidden while searching so the results stay clean */}
        {!q && (
          <SignupGaps
            neverOrdered={neverOrdered}
            quietThisTrip={quietThisTrip}
            missingAddress={missingAddress}
          />
        )}

        <ListFilter
          basePath="/admin/by-person"
          q={q}
          hideBought={hideBought}
          showing={shownItems}
          total={totalItems}
          unit="item"
        />

        {orders.length === 0 && (
          <p className="rounded-xl border border-border bg-card p-4 text-sm opacity-70">
            No one has added items to this trip yet.
          </p>
        )}

        {orders.length > 0 && visibleOrders.length === 0 && (
          <p className="rounded-xl border border-border bg-card p-4 text-sm opacity-70">
            Nothing matches{q && ` “${q}”`}
            {hideBought && " — everything shown is bought"}.
          </p>
        )}

        <div className="flex flex-col gap-5">
          {visibleOrders.map(({ order, items: shownForOrder }) => {
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
                        <span className="italic text-accent">
                          no address given
                        </span>
                      )}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand-ink">
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
                    const items = shownForOrder.filter(
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
                                    ? "border-brand-line bg-brand-soft"
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
            ? "border-brand bg-brand text-brand-on"
            : "border-border bg-background opacity-80",
        ].join(" ")}
      >
        {on ? "✓ " : ""}
        {label}
      </button>
    </form>
  );
}
