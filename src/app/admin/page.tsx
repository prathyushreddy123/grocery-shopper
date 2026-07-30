import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { getCurrentTrip, effectiveStatus, nextStatus } from "@/lib/trip";
import { adminLogout, createTrip, advanceTripStatus } from "@/app/actions/admin";
import { TRIP_STATUSES } from "@/lib/constants";
import AdminNav from "./AdminNav";

const ERRORS: Record<string, string> = {
  baddate: "Please pick a valid trip date.",
  badcutoff: "Please pick a valid cutoff date and time.",
  cutofforder: "The cutoff should be on or before the trip date.",
  notrip: "Trip not found.",
  terminal: "This trip is already complete.",
};

// YYYY-MM-DD (for <input type=date>) and YYYY-MM-DDTHH:mm (datetime-local),
// in local time, for prefilled defaults.
function dateValue(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function dateTimeValue(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${dateValue(d)}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (!(await isAdmin())) redirect("/admin/login");
  const { error } = await searchParams;
  const errorMsg = error ? ERRORS[error] : null;

  const trip = await getCurrentTrip();
  const eff = effectiveStatus(trip);
  const next = nextStatus(trip.status);
  const orderCount = await prisma.order.count({ where: { tripId: trip.id } });
  const itemCount = await prisma.item.count({
    where: { order: { tripId: trip.id } },
  });

  const now = new Date();
  const defaultTrip = new Date(now.getTime() + 14 * 864e5);
  const defaultCutoff = new Date(now.getTime() + 10 * 864e5);

  return (
    <main className="flex-1">
      <div className="mx-auto w-full max-w-lg px-4 py-6">
        <header className="mb-4 flex items-center justify-between">
          <h1 className="text-lg font-bold">Organizer dashboard</h1>
          <form action={adminLogout}>
            <button className="rounded-lg border border-border px-3 py-1.5 text-sm">
              Sign out
            </button>
          </form>
        </header>

        <AdminNav active="/admin" />

        {errorMsg && (
          <p className="mb-4 rounded-lg bg-red-100 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
            {errorMsg}
          </p>
        )}

        {/* Current trip */}
        <section className="mb-6 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide opacity-60">
            Current trip
          </p>
          <p className="text-lg font-bold">
            {trip.tripDate.toLocaleDateString("en-US", {
              weekday: "short",
              month: "long",
              day: "numeric",
            })}
          </p>
          <p className="text-sm opacity-75">
            Cutoff:{" "}
            {trip.cutoffAt.toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>

          <div className="mt-3 flex items-center gap-2">
            <span className="rounded-full bg-slate-800 px-3 py-1 text-sm font-semibold text-white dark:bg-slate-700">
              {eff}
            </span>
            {eff !== trip.status && (
              <span className="text-xs opacity-60">
                (auto-locked at cutoff; stored: {trip.status})
              </span>
            )}
          </div>

          <p className="mt-3 text-sm opacity-75">
            {orderCount} household{orderCount === 1 ? "" : "s"} · {itemCount}{" "}
            item{itemCount === 1 ? "" : "s"}
          </p>

          {/* Advance status */}
          <div className="mt-4">
            <p className="mb-2 text-xs opacity-60">
              Lifecycle: {TRIP_STATUSES.join(" → ")}
            </p>
            {next ? (
              <form action={advanceTripStatus}>
                <input type="hidden" name="tripId" value={trip.id} />
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white"
                >
                  Advance to “{next}”
                </button>
              </form>
            ) : (
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                Trip complete.
              </p>
            )}
          </div>
        </section>

        {/* Create a new trip / reopen ordering */}
        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <h2 className="mb-1 text-base font-bold">Start a new trip</h2>
          <p className="mb-3 text-sm opacity-70">
            Creating a trip opens ordering again for everyone.
          </p>
          <form action={createTrip} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Trip date</span>
              <input
                type="date"
                name="tripDate"
                required
                defaultValue={dateValue(defaultTrip)}
                className="rounded-lg border border-border bg-background px-3 py-2.5 text-base"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Order cutoff</span>
              <input
                type="datetime-local"
                name="cutoffAt"
                required
                defaultValue={dateTimeValue(defaultCutoff)}
                className="rounded-lg border border-border bg-background px-3 py-2.5 text-base"
              />
            </label>
            <button
              type="submit"
              className="rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white"
            >
              Create trip & open ordering
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
