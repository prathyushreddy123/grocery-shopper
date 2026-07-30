import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getHousehold } from "@/lib/session";
import { bookRide, cancelRide, setRideNote } from "@/app/actions/rides";

// All ride-date math is in UTC (dates are stored at UTC noon) so the calendar
// day is identical in local dev and on Vercel.
const pad = (n: number) => String(n).padStart(2, "0");
const dayKey = (d: Date) => d.toISOString().slice(0, 10);
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

type DayInfo = { id: string; note: string | null; booked: boolean };

export default async function RidesPage() {
  const household = await getHousehold();
  if (!household) redirect("/");

  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);

  const rideDates = await prisma.rideDate.findMany({
    where: { date: { gte: startOfToday } },
    orderBy: { date: "asc" },
    include: { bookings: { where: { householdId: household.id } } },
  });

  // Map each open day -> its info, and collect the months to render.
  const info = new Map<string, DayInfo>();
  const months: { year: number; month: number }[] = [];
  const seenMonths = new Set<string>();
  for (const rd of rideDates) {
    info.set(dayKey(rd.date), {
      id: rd.id,
      note: rd.bookings[0]?.note ?? null,
      booked: rd.bookings.length > 0,
    });
    const y = rd.date.getUTCFullYear();
    const m = rd.date.getUTCMonth();
    const mk = `${y}-${m}`;
    if (!seenMonths.has(mk)) {
      seenMonths.add(mk);
      months.push({ year: y, month: m });
    }
  }

  const myRides = rideDates.filter((rd) => rd.bookings.length > 0);

  return (
    <main className="flex-1">
      <div className="mx-auto w-full max-w-lg px-4 py-6">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm opacity-70">Signed in as</p>
            <p className="font-semibold">{household.name}</p>
          </div>
          <Link
            href="/list"
            className="rounded-lg border border-border px-3 py-1.5 text-sm"
          >
            ← My list
          </Link>
        </header>

        <div className="mb-6 rounded-2xl border border-indigo-300 bg-indigo-50 p-4 dark:border-indigo-800 dark:bg-indigo-950/40">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
            🚗 Book a ride
          </p>
          <p className="mt-1 text-sm opacity-80">
            Tap a highlighted date to book a ride. Tap it again to cancel.
          </p>
        </div>

        {months.length === 0 && (
          <p className="rounded-xl border border-border bg-card p-4 text-sm opacity-70">
            No ride dates are open right now. Please check back later.
          </p>
        )}

        <div className="flex flex-col gap-6">
          {months.map(({ year, month }) => (
            <MonthGrid
              key={`${year}-${month}`}
              year={year}
              month={month}
              info={info}
            />
          ))}
        </div>

        {myRides.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-base font-bold">Your booked rides</h2>
            <div className="flex flex-col gap-3">
              {myRides.map((rd) => (
                <div
                  key={rd.id}
                  className="rounded-xl border border-border bg-card p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">
                      {rd.date.toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "long",
                        day: "numeric",
                        timeZone: "UTC",
                      })}
                    </p>
                    <form action={cancelRide}>
                      <input type="hidden" name="rideDateId" value={rd.id} />
                      <button className="rounded px-2 py-1 text-xs text-red-600 underline">
                        Cancel
                      </button>
                    </form>
                  </div>
                  {rd.note && (
                    <p className="mt-0.5 text-xs opacity-60">
                      Organizer: {rd.note}
                    </p>
                  )}
                  <form action={setRideNote} className="mt-2 flex gap-2">
                    <input type="hidden" name="rideDateId" value={rd.id} />
                    <input
                      name="note"
                      defaultValue={rd.bookings[0]?.note ?? ""}
                      placeholder="Add a note (e.g. 2 people, pickup 9am)"
                      className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
                    />
                    <button className="rounded-lg border border-border px-3 py-1.5 text-sm">
                      Save
                    </button>
                  </form>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function MonthGrid({
  year,
  month,
  info,
}: {
  year: number;
  month: number;
  info: Map<string, DayInfo>;
}) {
  const monthName = new Date(Date.UTC(year, month, 1)).toLocaleDateString(
    "en-US",
    { month: "long", year: "numeric", timeZone: "UTC" },
  );
  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <h2 className="mb-3 text-center text-base font-bold">{monthName}</h2>
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((w, i) => (
          <div key={i} className="py-1 text-xs font-semibold opacity-50">
            {w}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />;
          const key = `${year}-${pad(month + 1)}-${pad(day)}`;
          const di = info.get(key);
          if (!di) {
            return (
              <div
                key={i}
                className="flex h-11 items-center justify-center rounded-lg text-sm opacity-30"
              >
                {day}
              </div>
            );
          }
          return (
            <form key={i} action={di.booked ? cancelRide : bookRide}>
              <input type="hidden" name="rideDateId" value={di.id} />
              <button
                type="submit"
                className={[
                  "flex h-11 w-full items-center justify-center rounded-lg text-sm font-semibold",
                  di.booked
                    ? "bg-indigo-600 text-white"
                    : "border-2 border-indigo-400 text-indigo-700 dark:text-indigo-300",
                ].join(" ")}
              >
                {di.booked ? "✓" : day}
              </button>
            </form>
          );
        })}
      </div>
    </section>
  );
}
