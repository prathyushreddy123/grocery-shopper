import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import {
  toggleRideDate,
  setRideDateNote,
  setRideCapacity,
} from "@/app/actions/admin";
import { formatPhone } from "@/lib/phone";
import { seatsTaken } from "@/lib/rides";
import AdminNav from "../AdminNav";

const pad = (n: number) => String(n).padStart(2, "0");
const dayKey = (d: Date) => d.toISOString().slice(0, 10);
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

const ERRORS: Record<string, string> = {
  capacitylow: "Seats can't be fewer than the seats already booked — cancel a booking first.",
  nodate: "That date no longer exists.",
  badcapacity: "Enter a number of seats between 1 and 12.",
  baddate: "That date could not be read.",
};

type OpenInfo = { id: string; taken: number; capacity: number };

export default async function AdminRidesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (!(await isAdmin())) redirect("/admin/login");

  const { error } = await searchParams;
  const errorMsg = error ? ERRORS[error] : null;

  const now = new Date();
  const year = now.getUTCFullYear();
  const startOfMonth = new Date(Date.UTC(year, now.getUTCMonth(), 1));
  const todayKey = dayKey(now);

  const rideDates = await prisma.rideDate.findMany({
    where: { date: { gte: startOfMonth } },
    orderBy: { date: "asc" },
    include: {
      bookings: { include: { household: true }, orderBy: { createdAt: "asc" } },
    },
  });

  const open = new Map<string, OpenInfo>();
  for (const rd of rideDates) {
    open.set(dayKey(rd.date), {
      id: rd.id,
      taken: seatsTaken(rd.bookings),
      capacity: rd.capacity,
    });
  }

  // Current month through December of this year.
  const months: { year: number; month: number }[] = [];
  for (let m = now.getUTCMonth(); m <= 11; m++) months.push({ year, month: m });

  const openFuture = rideDates.filter((rd) => dayKey(rd.date) >= todayKey);

  return (
    <main className="flex-1">
      <div className="mx-auto w-full max-w-lg px-4 py-6">
        <h1 className="mb-4 text-lg font-bold">Rides</h1>
        <AdminNav active="/admin/rides" />

        {errorMsg && (
          <p className="mb-4 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
            {errorMsg}
          </p>
        )}

        <div className="mb-5 rounded-xl border border-border bg-card p-3 text-sm">
          <p className="font-semibold">Open dates for rides</p>
          <p className="mt-1 text-muted">
            Tap any day to <b>open</b> it for booking. Tap a{" "}
            <span className="font-semibold text-brand">green</span> day to close
            it. Each open day shows <b>seats booked / seats in the car</b> —
            change the seat count per date below.
          </p>
        </div>

        <div className="flex flex-col gap-6">
          {months.map(({ year: y, month }) => (
            <MonthGrid
              key={`${y}-${month}`}
              year={y}
              month={month}
              open={open}
              todayKey={todayKey}
            />
          ))}
        </div>

        {/* Open dates with notes + who booked */}
        <h2 className="mb-3 mt-8 text-base font-bold">
          Open dates & bookings
        </h2>
        {openFuture.length === 0 && (
          <p className="rounded-xl border border-border bg-card p-4 text-sm opacity-70">
            No dates open yet — tap days in the calendar above.
          </p>
        )}
        <div className="flex flex-col gap-4">
          {openFuture.map((rd) => {
            const taken = seatsTaken(rd.bookings);
            const full = taken >= rd.capacity;
            return (
              <section
                key={rd.id}
                className="rounded-2xl border border-border bg-card p-4 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold">
                    {rd.date.toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "long",
                      day: "numeric",
                      timeZone: "UTC",
                    })}
                  </p>
                  <span
                    className={[
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      full
                        ? "bg-accent-soft text-accent-ink"
                        : "bg-brand-soft text-brand-ink",
                    ].join(" ")}
                  >
                    {taken} of {rd.capacity} seats{full ? " · full" : ""}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  <form
                    action={setRideCapacity}
                    className="flex items-center gap-2"
                  >
                    <input type="hidden" name="rideDateId" value={rd.id} />
                    <label
                      htmlFor={`cap-${rd.id}`}
                      className="text-sm text-muted"
                    >
                      Seats in car
                    </label>
                    <input
                      id={`cap-${rd.id}`}
                      name="capacity"
                      type="number"
                      min={1}
                      max={12}
                      defaultValue={rd.capacity}
                      className="w-16 rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
                    />
                    <button className="rounded-lg border border-border px-3 py-1.5 text-sm">
                      Set
                    </button>
                  </form>
                </div>

                <form action={setRideDateNote} className="mt-2 flex gap-2">
                  <input type="hidden" name="rideDateId" value={rd.id} />
                  <input
                    name="note"
                    defaultValue={rd.note ?? ""}
                    placeholder="Optional note (e.g. Leaving 8am)"
                    className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
                  />
                  <button className="rounded-lg border border-border px-3 py-1.5 text-sm">
                    Save
                  </button>
                </form>

                {rd.bookings.length > 0 && (
                  <ul className="mt-3 flex flex-col gap-1.5">
                    {rd.bookings.map((b) => (
                      <li
                        key={b.id}
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      >
                        <span className="font-medium">{b.household.name}</span>
                        <span className="text-muted">
                          {" "}
                          · {formatPhone(b.household.phone)}
                        </span>
                        <span className="ml-1 rounded-full bg-brand-soft px-1.5 py-0.5 text-xs font-medium text-brand-ink">
                          {b.seats} seat{b.seats > 1 ? "s" : ""}
                        </span>
                        {b.note && (
                          <span className="block text-xs italic text-muted">
                            “{b.note}”
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}

function MonthGrid({
  year,
  month,
  open,
  todayKey,
}: {
  year: number;
  month: number;
  open: Map<string, OpenInfo>;
  todayKey: string;
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
          const info = open.get(key);
          const isPast = key < todayKey;

          if (isPast) {
            return (
              <div
                key={i}
                className="flex h-14 items-center justify-center rounded-lg text-sm opacity-25"
              >
                {day}
              </div>
            );
          }

          return (
            <form key={i} action={toggleRideDate}>
              <input type="hidden" name="date" value={key} />
              <button
                type="submit"
                title={
                  info
                    ? `${info.taken} of ${info.capacity} seats booked — tap to close`
                    : "Tap to open this day"
                }
                className={[
                  "flex h-14 w-full flex-col items-center justify-center rounded-lg text-sm font-semibold",
                  info
                    ? "bg-brand text-brand-on"
                    : "border border-border text-foreground/70 hover:border-brand",
                ].join(" ")}
              >
                {day}
                {info && (
                  <span className="text-[10px] font-medium">
                    {info.taken}/{info.capacity}
                  </span>
                )}
              </button>
            </form>
          );
        })}
      </div>
    </section>
  );
}
