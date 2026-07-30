import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { openRideDate, closeRideDate } from "@/app/actions/admin";
import { formatPhone } from "@/lib/phone";
import AdminNav from "../AdminNav";

const ERRORS: Record<string, string> = {
  baddate: "Please pick a valid date.",
};

export default async function AdminRidesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (!(await isAdmin())) redirect("/admin/login");
  const { error } = await searchParams;
  const errorMsg = error ? ERRORS[error] : null;

  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);

  const rideDates = await prisma.rideDate.findMany({
    where: { date: { gte: startOfToday } },
    orderBy: { date: "asc" },
    include: {
      bookings: {
        include: { household: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const defaultDate = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);

  return (
    <main className="flex-1">
      <div className="mx-auto w-full max-w-lg px-4 py-6">
        <h1 className="mb-4 text-lg font-bold">Rides</h1>
        <AdminNav active="/admin/rides" />

        {errorMsg && (
          <p className="mb-4 rounded-lg bg-red-100 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
            {errorMsg}
          </p>
        )}

        {/* Open a new ride date */}
        <section className="mb-6 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <h2 className="mb-1 text-base font-bold">Open a ride date</h2>
          <p className="mb-3 text-sm opacity-70">
            Members will be able to tap this date to book a ride.
          </p>
          <form action={openRideDate} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Date</span>
              <input
                type="date"
                name="date"
                required
                defaultValue={defaultDate}
                className="rounded-lg border border-border bg-background px-3 py-2.5 text-base"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">
                Note <span className="opacity-60">(optional)</span>
              </span>
              <input
                name="note"
                placeholder="e.g. Leaving 8am, Atlanta airport run"
                className="rounded-lg border border-border bg-background px-3 py-2.5 text-base"
              />
            </label>
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white"
            >
              Open this date
            </button>
          </form>
        </section>

        {/* Open dates + bookings */}
        <h2 className="mb-3 text-base font-bold">Open dates</h2>
        {rideDates.length === 0 && (
          <p className="rounded-xl border border-border bg-card p-4 text-sm opacity-70">
            No ride dates open yet.
          </p>
        )}
        <div className="flex flex-col gap-4">
          {rideDates.map((rd) => (
            <section
              key={rd.id}
              className="rounded-2xl border border-border bg-card p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold">
                    {rd.date.toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "long",
                      day: "numeric",
                      timeZone: "UTC",
                    })}
                  </p>
                  {rd.note && (
                    <p className="text-xs opacity-70">{rd.note}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                    {rd.bookings.length} booked
                  </span>
                  <form action={closeRideDate}>
                    <input type="hidden" name="rideDateId" value={rd.id} />
                    <button className="rounded px-2 py-1 text-xs text-red-600 underline">
                      Close
                    </button>
                  </form>
                </div>
              </div>

              {rd.bookings.length > 0 && (
                <ul className="mt-3 flex flex-col gap-1.5">
                  {rd.bookings.map((b) => (
                    <li
                      key={b.id}
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    >
                      <span className="font-medium">{b.household.name}</span>
                      <span className="opacity-60">
                        {" "}
                        · {formatPhone(b.household.phone)}
                      </span>
                      {b.note && (
                        <span className="block text-xs italic opacity-70">
                          “{b.note}”
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
