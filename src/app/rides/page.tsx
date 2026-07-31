import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getHousehold } from "@/lib/session";
import { bookRide, cancelRide, setRideNote } from "@/app/actions/rides";
import { MAX_SEATS_PER_HOUSEHOLD, seatsTaken } from "@/lib/rides";
import { logout } from "@/app/actions/auth";
import AppNav from "@/app/AppNav";
import Logo from "@/app/Logo";

// All ride-date math is in UTC (dates are stored at UTC noon) so the calendar
// day is identical in local dev and on Vercel.
const pad = (n: number) => String(n).padStart(2, "0");
const dayKey = (d: Date) => d.toISOString().slice(0, 10);
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

const ERRORS: Record<string, string> = {
  full: "That date just filled up — those seats are taken. Try another day.",
  gone: "That date is no longer open for booking.",
};

type DayInfo = {
  id: string;
  capacity: number;
  taken: number;
  mySeats: number; // 0 = not booked by this household
};

export default async function RidesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const household = await getHousehold();
  if (!household) redirect("/");

  const { error } = await searchParams;
  const errorMsg = error ? ERRORS[error] : null;

  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);

  // All bookings, not just mine — seats left is a property of the date.
  const rideDates = await prisma.rideDate.findMany({
    where: { date: { gte: startOfToday } },
    orderBy: { date: "asc" },
    include: { bookings: true },
  });

  // Map each open day -> its info, and collect the months to render.
  const info = new Map<string, DayInfo>();
  const months: { year: number; month: number }[] = [];
  const seenMonths = new Set<string>();
  for (const rd of rideDates) {
    const mine = rd.bookings.find((b) => b.householdId === household.id);
    info.set(dayKey(rd.date), {
      id: rd.id,
      capacity: rd.capacity,
      taken: seatsTaken(rd.bookings),
      mySeats: mine?.seats ?? 0,
    });
    const y = rd.date.getUTCFullYear();
    const m = rd.date.getUTCMonth();
    const mk = `${y}-${m}`;
    if (!seenMonths.has(mk)) {
      seenMonths.add(mk);
      months.push({ year: y, month: m });
    }
  }

  const myRides = rideDates.filter((rd) =>
    rd.bookings.some((b) => b.householdId === household.id),
  );

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

        <AppNav active="/rides" />

        {errorMsg && (
          <p className="mb-4 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
            {errorMsg}
          </p>
        )}

        <div className="mb-6 rounded-2xl border border-brand-line bg-brand-soft p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-ink">
            🚗 Book a ride
          </p>
          <p className="mt-1 text-sm text-foreground/80">
            Tap a <b className="text-brand-ink">green</b> date to grab a seat —
            tap it again to cancel. Each date is one car, and neighbors share
            it, so each day shows how many seats are still free. Book only the
            seats you need.
          </p>
        </div>

        {months.length === 0 && (
          <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted">
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

        {months.length > 0 && <Legend />}

        {myRides.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-base font-bold">Your booked rides</h2>
            <div className="flex flex-col gap-3">
              {myRides.map((rd) => {
                const mine = rd.bookings.find(
                  (b) => b.householdId === household.id,
                )!;
                const others = rd.bookings.length - 1;
                const seatsLeft = rd.capacity - seatsTaken(rd.bookings);
                const maxForMe = Math.min(
                  MAX_SEATS_PER_HOUSEHOLD,
                  mine.seats + seatsLeft,
                );

                return (
                  <div
                    key={rd.id}
                    className="rounded-2xl border border-brand-line bg-card p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">
                          {rd.date.toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "long",
                            day: "numeric",
                            timeZone: "UTC",
                          })}
                        </p>
                        <p className="text-sm text-brand-ink">
                          {mine.seats} seat{mine.seats > 1 ? "s" : ""} booked ·{" "}
                          {seatsLeft} of {rd.capacity} still free
                        </p>
                      </div>
                      <form action={cancelRide}>
                        <input type="hidden" name="rideDateId" value={rd.id} />
                        <button className="rounded-lg border border-border px-2.5 py-1 text-xs text-red-600 dark:text-red-400">
                          Cancel
                        </button>
                      </form>
                    </div>

                    {others > 0 && (
                      <p className="mt-2 text-xs text-muted">
                        🤝 Sharing this trip with {others} other household
                        {others > 1 ? "s" : ""}.
                      </p>
                    )}
                    {rd.note && (
                      <p className="mt-1 text-xs text-muted">
                        Organizer: {rd.note}
                      </p>
                    )}

                    <form
                      action={bookRide}
                      className="mt-3 flex items-center gap-2"
                    >
                      <input type="hidden" name="rideDateId" value={rd.id} />
                      <label
                        htmlFor={`seats-${rd.id}`}
                        className="text-sm font-medium"
                      >
                        People riding
                      </label>
                      <select
                        id={`seats-${rd.id}`}
                        name="seats"
                        defaultValue={mine.seats}
                        className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
                      >
                        {Array.from({ length: maxForMe }, (_, i) => i + 1).map(
                          (n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ),
                        )}
                      </select>
                      <button className="rounded-lg border border-brand-line bg-brand-soft px-3 py-1.5 text-sm font-semibold text-brand-ink">
                        Update
                      </button>
                    </form>

                    <form action={setRideNote} className="mt-2 flex gap-2">
                      <input type="hidden" name="rideDateId" value={rd.id} />
                      <input
                        name="note"
                        defaultValue={mine.note ?? ""}
                        placeholder="Add a note (e.g. pickup 9am, corner of 5th)"
                        className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
                      />
                      <button className="rounded-lg border border-border px-3 py-1.5 text-sm">
                        Save
                      </button>
                    </form>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function Legend() {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
      <span className="flex items-center gap-1.5">
        <span className="h-3.5 w-3.5 rounded border-2 border-brand bg-brand-soft" />
        Seats open
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-3.5 w-3.5 rounded bg-brand" />
        You&apos;re booked
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-3.5 w-3.5 rounded border border-border bg-foreground/10" />
        Full
      </span>
    </div>
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
          <div key={i} className="py-1 text-xs font-semibold text-muted">
            {w}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />;
          const key = `${year}-${pad(month + 1)}-${pad(day)}`;
          const di = info.get(key);

          // Day the organizer hasn't opened.
          if (!di) {
            return (
              <div
                key={i}
                className="flex h-14 items-center justify-center rounded-lg text-sm text-foreground/25"
              >
                {day}
              </div>
            );
          }

          const seatsLeft = di.capacity - di.taken;

          // Someone else took the last seat — visible, but not bookable.
          if (di.mySeats === 0 && seatsLeft <= 0) {
            return (
              <div
                key={i}
                className="flex h-14 flex-col items-center justify-center rounded-lg border border-border bg-foreground/5 text-sm font-semibold text-foreground/40"
                title="This date is fully booked"
              >
                {day}
                <span className="text-[10px] font-medium">Full</span>
              </div>
            );
          }

          return (
            <form key={i} action={di.mySeats > 0 ? cancelRide : bookRide}>
              <input type="hidden" name="rideDateId" value={di.id} />
              <button
                type="submit"
                title={
                  di.mySeats > 0
                    ? `You have ${di.mySeats} seat(s) — tap to cancel`
                    : `${seatsLeft} of ${di.capacity} seats open`
                }
                className={[
                  "flex h-14 w-full flex-col items-center justify-center rounded-lg text-sm font-semibold transition-colors",
                  di.mySeats > 0
                    ? "bg-brand text-brand-on"
                    : "border-2 border-brand bg-brand-soft text-brand-ink hover:bg-brand hover:text-brand-on",
                ].join(" ")}
              >
                {di.mySeats > 0 ? (
                  <>
                    <span aria-hidden>✓</span>
                    <span className="text-[10px] font-medium">
                      {di.mySeats} seat{di.mySeats > 1 ? "s" : ""}
                    </span>
                  </>
                ) : (
                  <>
                    {day}
                    <span className="text-[10px] font-medium">
                      {seatsLeft} left
                    </span>
                  </>
                )}
              </button>
            </form>
          );
        })}
      </div>
    </section>
  );
}
