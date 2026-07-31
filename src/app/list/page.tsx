import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/context";
import { prisma } from "@/lib/prisma";
import { logout } from "@/app/actions/auth";
import { updateAddress } from "@/app/actions/profile";
import { getLastTripItems } from "@/app/actions/items";
import { isOrderingOpen, effectiveStatus } from "@/lib/trip";
import { seatsTaken } from "@/lib/rides";
import AppNav from "@/app/AppNav";
import Logo from "@/app/Logo";
import {
  REQUEST_TYPES,
  REQUEST_TYPE_META,
  DEFAULT_SIZE,
  COMMUNITY_TZ,
  type TripStatus,
} from "@/lib/constants";
import AddItemForm from "./AddItemForm";
import ItemRow from "./ItemRow";
import InfoNotes from "@/app/InfoNotes";
import Countdown from "./Countdown";
import StatusTracker from "./StatusTracker";
import RepeatLastTrip from "./RepeatLastTrip";

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: COMMUNITY_TZ,
  });
}

export default async function ListPage() {
  const ctx = await getUserContext();
  if (!ctx) redirect("/");

  const { household, trip, order } = ctx;

  // The next open ride date (any household's), for the rides teaser card.
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);
  const nextRide = await prisma.rideDate.findFirst({
    where: { date: { gte: startOfToday } },
    orderBy: { date: "asc" },
    include: { bookings: true },
  });

  const ordering = isOrderingOpen(trip);
  // Items from this household's previous list that aren't on the current one.
  const lastTrip = ordering ? await getLastTripItems() : null;
  const eff = effectiveStatus(trip);
  // CLOSED sits past the tracker; show it as fully Delivered.
  const trackerStatus: TripStatus = eff === "CLOSED" ? "DELIVERED" : eff;
  const totalItems = order.items.length;

  return (
    <main className="flex-1">
      <div className="mx-auto w-full max-w-lg px-4 py-6">
        <header className="mb-4 flex items-center justify-between gap-3">
          <Logo size={36} className="text-lg" />
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-muted">Signed in as</p>
              <p className="text-sm font-semibold">{household.name}</p>
            </div>
            <form action={logout}>
              <button className="rounded-lg border border-border px-3 py-1.5 text-sm">
                Sign out
              </button>
            </form>
          </div>
        </header>

        <AppNav active="/list" />

        {/* Trip ticket */}
        <div className="mb-4 rounded-2xl border border-brand-line bg-brand-soft p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-ink">
            Next grocery run
          </p>
          <p className="text-lg font-bold">{formatDate(trip.tripDate)}</p>
          {ordering ? (
            <p className="mt-1 text-sm text-foreground/80">
              <Countdown cutoffMs={trip.cutoffAt.getTime()} /> — add everything
              you need below. You can edit until the cutoff.
            </p>
          ) : (
            <p className="mt-1 text-sm text-foreground/80">
              Ordering is closed for this trip. Your list is locked — here&apos;s
              where things stand:
            </p>
          )}
        </div>

        {/* Rides teaser — the app's other half, not a corner link */}
        <RideTeaser
          ride={
            nextRide && {
              date: nextRide.date,
              capacity: nextRide.capacity,
              taken: seatsTaken(nextRide.bookings),
              mine: nextRide.bookings.some(
                (b) => b.householdId === household.id,
              ),
            }
          }
        />

        <div className="mb-6">
          <InfoNotes />
        </div>

        {/* Delivery address */}
        <div
          className={[
            "mb-6 rounded-2xl border p-4",
            household.address
              ? "border-border bg-card"
              : "border-accent-line bg-accent-soft",
          ].join(" ")}
        >
          <form action={updateAddress} className="flex flex-col gap-2">
            <label className="text-sm font-semibold" htmlFor="address">
              📍 Delivery address
            </label>
            {!household.address && (
              <p className="text-xs text-accent-ink">
                Add your address so I know where to drop off your order.
              </p>
            )}
            <textarea
              id="address"
              name="address"
              rows={2}
              defaultValue={household.address ?? ""}
              placeholder="Street address, apt #, city"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            <button className="self-start rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-brand-on transition-colors hover:bg-brand-hover">
              Save address
            </button>
          </form>
        </div>

        {/* One tap to re-add last trip's basket */}
        {lastTrip && <RepeatLastTrip items={lastTrip.items} />}

        {/* Status tracker (locked trips only) */}
        {!ordering && (
          <div className="mb-6 rounded-2xl border border-border bg-card p-4 shadow-sm">
            <h2 className="mb-3 text-base font-bold">Trip status</h2>
            <StatusTracker status={trackerStatus} />
          </div>
        )}

        {!ordering && totalItems === 0 && (
          <p className="mb-6 rounded-xl border border-border bg-card p-4 text-sm opacity-70">
            You didn&apos;t add any items before the cutoff for this trip.
          </p>
        )}

        <div className="flex flex-col gap-6">
          {REQUEST_TYPES.map((type) => {
            const meta = REQUEST_TYPE_META[type];
            const items = order.items.filter((i) => i.requestType === type);
            // When locked, hide empty sections to keep the read-only list tidy.
            if (!ordering && items.length === 0) return null;

            return (
              <section
                key={type}
                className="rounded-2xl border border-border bg-card p-4 shadow-sm"
              >
                <h2 className="mb-3 flex items-center gap-2 text-base font-bold">
                  <span className="text-xl">{meta.emoji}</span>
                  {meta.label}
                  {items.length > 0 && (
                    <span className="ml-auto rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand-ink">
                      {items.length}
                    </span>
                  )}
                </h2>

                {items.length > 0 && (
                  <div className="mb-3 flex flex-col gap-2">
                    {items.map((item) =>
                      ordering ? (
                        <ItemRow
                          key={item.id}
                          item={{
                            id: item.id,
                            name: item.name,
                            size: item.size,
                            note: item.note,
                            quantity: item.quantity,
                          }}
                        />
                      ) : (
                        <ReadOnlyItem key={item.id} item={item} />
                      ),
                    )}
                  </div>
                )}

                {ordering && <AddItemForm requestType={type} />}
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}

// Rides at a glance: next open date and how many of its seats are left, so the
// feature is visible from the grocery page instead of hiding behind a link.
function RideTeaser({
  ride,
}: {
  ride: { date: Date; capacity: number; taken: number; mine: boolean } | null;
}) {
  const seatsLeft = ride ? ride.capacity - ride.taken : 0;

  return (
    <Link
      href="/rides"
      className="mb-6 flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-brand"
    >
      <span
        aria-hidden
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-xl"
      >
        🚗
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold uppercase tracking-wide text-brand-ink">
          Need a ride?
        </span>
        {ride ? (
          <>
            <span className="block font-semibold">
              {ride.date.toLocaleDateString("en-US", {
                weekday: "short",
                month: "long",
                day: "numeric",
                timeZone: "UTC",
              })}
            </span>
            <span className="block text-sm text-muted">
              {ride.mine
                ? "You're booked on this trip · "
                : seatsLeft > 0
                  ? ""
                  : "Fully booked · "}
              {seatsLeft} of {ride.capacity} seats free
            </span>
          </>
        ) : (
          <span className="block text-sm text-muted">
            No ride dates open yet — check the calendar.
          </span>
        )}
      </span>
      <span aria-hidden className="text-muted">
        →
      </span>
    </Link>
  );
}

function ReadOnlyItem({
  item,
}: {
  item: { name: string; size: string; note: string | null; quantity: number };
}) {
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2.5">
      <p className="font-medium">
        {item.name}
        {item.quantity > 1 && (
          <span className="ml-1 text-sm opacity-70">×{item.quantity}</span>
        )}
      </p>
      {item.size !== DEFAULT_SIZE && (
        <p className="text-xs opacity-60">{item.size}</p>
      )}
      {item.note && <p className="text-xs italic opacity-70">“{item.note}”</p>}
    </div>
  );
}
