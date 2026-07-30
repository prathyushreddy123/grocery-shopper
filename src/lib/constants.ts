// Shared enum-like constants. SQLite can't store real enums, so these
// String unions are the single source of truth for valid values.

export const REQUEST_TYPES = ["GROCERIES", "MEAT", "RESTAURANT"] as const;
export type RequestType = (typeof REQUEST_TYPES)[number];

export const REQUEST_TYPE_META: Record<
  RequestType,
  { label: string; emoji: string }
> = {
  GROCERIES: { label: "Groceries", emoji: "🛒" },
  MEAT: { label: "Fresh Meat", emoji: "🥩" },
  RESTAURANT: { label: "Restaurant Food", emoji: "🍛" },
};

export const STORES = [
  "UNASSIGNED",
  "PATEL",
  "COSTCO",
  "AL_MADHINA",
  "RESTAURANT",
] as const;
export type Store = (typeof STORES)[number];

export const STORE_LABELS: Record<Store, string> = {
  UNASSIGNED: "Unassigned",
  PATEL: "Patel Brothers",
  COSTCO: "Costco",
  AL_MADHINA: "Al Madhina",
  RESTAURANT: "Restaurant",
};

// Default store suggestion from request type; admin can always reassign.
export const DEFAULT_STORE_FOR_TYPE: Record<RequestType, Store> = {
  GROCERIES: "UNASSIGNED",
  MEAT: "AL_MADHINA",
  RESTAURANT: "RESTAURANT",
};

// Trip lifecycle. OPEN is the only state that accepts new/edited orders.
export const TRIP_STATUSES = [
  "OPEN",
  "RECEIVED",
  "SHOPPING",
  "RETURNING",
  "DELIVERED",
  "CLOSED",
] as const;
export type TripStatus = (typeof TRIP_STATUSES)[number];

// User-facing tracker stages (post-cutoff), in order.
export const TRACKER_STAGES: { status: TripStatus; label: string }[] = [
  { status: "RECEIVED", label: "List received" },
  { status: "SHOPPING", label: "Shopping in Atlanta" },
  { status: "RETURNING", label: "On the way back" },
  { status: "DELIVERED", label: "Delivered" },
];

export const DEFAULT_SIZE = "Standard — organizer picks";

export function isRequestType(v: string): v is RequestType {
  return (REQUEST_TYPES as readonly string[]).includes(v);
}

export function isStore(v: string): v is Store {
  return (STORES as readonly string[]).includes(v);
}
