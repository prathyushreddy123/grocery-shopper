// Seat math for ride dates. A date is one car making one trip, so several
// households share it: bookings pool against the date's capacity (3 by
// default) until the seats run out.

/** Nobody books more than this in one go, whatever the car's capacity is. */
export const MAX_SEATS_PER_HOUSEHOLD = 3;

export const DEFAULT_CAPACITY = 3;

export function seatsTaken(bookings: { seats: number }[]): number {
  return bookings.reduce((n, b) => n + b.seats, 0);
}

/**
 * Seats a household may still claim on a date: everything unbooked, plus
 * whatever it already holds (so changing 1 → 3 is allowed if 2 are free).
 */
export function seatsAvailableTo(
  capacity: number,
  bookings: { seats: number }[],
  mySeats = 0,
): number {
  return Math.max(0, capacity - seatsTaken(bookings) + mySeats);
}

/** Parse a seats form value; anything bogus falls back to 1. */
export function clampSeats(raw: FormDataEntryValue | null): number {
  const n = Number(String(raw ?? "1"));
  if (!Number.isFinite(n)) return 1;
  return Math.min(MAX_SEATS_PER_HOUSEHOLD, Math.max(1, Math.trunc(n)));
}
