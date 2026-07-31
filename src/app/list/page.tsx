import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/context";
import { logout } from "@/app/actions/auth";
import { isOrderingOpen, effectiveStatus } from "@/lib/trip";
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
  const ordering = isOrderingOpen(trip);
  const eff = effectiveStatus(trip);
  // CLOSED sits past the tracker; show it as fully Delivered.
  const trackerStatus: TripStatus = eff === "CLOSED" ? "DELIVERED" : eff;
  const totalItems = order.items.length;

  return (
    <main className="flex-1">
      <div className="mx-auto w-full max-w-lg px-4 py-6">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm opacity-70">Signed in as</p>
            <p className="font-semibold">{household.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/rides"
              className="rounded-lg border border-indigo-400 px-3 py-1.5 text-sm font-medium text-indigo-700 dark:text-indigo-300"
            >
              🚗 Rides
            </Link>
            <form action={logout}>
              <button className="rounded-lg border border-border px-3 py-1.5 text-sm">
                Sign out
              </button>
            </form>
          </div>
        </header>

        {/* Trip ticket */}
        <div className="mb-6 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/40">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
            Next grocery run
          </p>
          <p className="text-lg font-bold">{formatDate(trip.tripDate)}</p>
          {ordering ? (
            <p className="mt-1 text-sm opacity-80">
              <Countdown cutoffMs={trip.cutoffAt.getTime()} /> — add everything
              you need below. You can edit until the cutoff.
            </p>
          ) : (
            <p className="mt-1 text-sm opacity-80">
              Ordering is closed for this trip. Your list is locked — here&apos;s
              where things stand:
            </p>
          )}
        </div>

        <div className="mb-6">
          <InfoNotes />
        </div>

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
                    <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
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
