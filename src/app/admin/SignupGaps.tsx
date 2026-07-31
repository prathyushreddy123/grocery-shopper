import { formatPhone } from "@/lib/phone";

export type GapHousehold = {
  id: string;
  name: string;
  phone: string;
  createdAt: Date;
  rideBookings: number;
};

export type MissingAddress = { id: string; name: string; phone: string };

const joined = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

// Who to follow up with. By Person only lists households that actually
// ordered, so both of these groups are invisible there:
//   • new signups who have never ordered anything — the "did they get stuck?"
//     list, worth a personal nudge
//   • regulars with nothing on this trip yet — the "remind before cutoff" list
export default function SignupGaps({
  neverOrdered,
  quietThisTrip,
  missingAddress,
}: {
  neverOrdered: GapHousehold[];
  quietThisTrip: GapHousehold[];
  missingAddress: MissingAddress[];
}) {
  if (
    neverOrdered.length === 0 &&
    quietThisTrip.length === 0 &&
    missingAddress.length === 0
  ) {
    return null;
  }

  return (
    <div className="mb-5 flex flex-col gap-3">
      {neverOrdered.length > 0 && (
        <Panel
          title={`Signed up, never ordered — ${neverOrdered.length}`}
          hint="They joined but have never added an item. Worth checking they aren't stuck."
          tone="accent"
          open={neverOrdered.length <= 8}
        >
          {neverOrdered.map((h) => (
            <Row key={h.id} household={h} action="Nudge" />
          ))}
        </Panel>
      )}

      {quietThisTrip.length > 0 && (
        <Panel
          title={`Ordered before, nothing on this trip — ${quietThisTrip.length}`}
          hint="Remind them before the cutoff."
          tone="plain"
          open={quietThisTrip.length <= 5}
        >
          {quietThisTrip.map((h) => (
            <Row key={h.id} household={h} action="Remind" />
          ))}
        </Panel>
      )}

      {missingAddress.length > 0 && (
        <Panel
          title={`Ordered but no delivery address — ${missingAddress.length}`}
          hint="You'd have nowhere to drop this off."
          tone="accent"
          open
        >
          {missingAddress.map((h) => (
            <Row
              key={h.id}
              household={{ ...h, createdAt: null, rideBookings: 0 }}
              action="Ask"
            />
          ))}
        </Panel>
      )}
    </div>
  );
}

function Panel({
  title,
  hint,
  tone,
  open,
  children,
}: {
  title: string;
  hint: string;
  tone: "accent" | "plain";
  open?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      open={open}
      className={[
        "rounded-xl border p-3 text-sm",
        tone === "accent"
          ? "border-accent-line bg-accent-soft"
          : "border-border bg-card",
      ].join(" ")}
    >
      <summary
        className={[
          "cursor-pointer font-semibold",
          tone === "accent" ? "text-accent-ink" : "",
        ].join(" ")}
      >
        {title}
      </summary>
      <p className="mt-1 text-xs text-muted">{hint}</p>
      <ul className="mt-2 flex flex-col gap-1.5">{children}</ul>
    </details>
  );
}

function Row({
  household,
  action,
}: {
  household: {
    name: string;
    phone: string;
    createdAt?: Date | null;
    rideBookings?: number;
  };
  action: string;
}) {
  const { name, phone, createdAt, rideBookings = 0 } = household;
  return (
    <li className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-border bg-card px-3 py-2">
      <span className="font-medium">{name}</span>
      {(createdAt || rideBookings > 0) && (
        <span className="text-xs text-muted">
          {createdAt && `joined ${joined(createdAt)}`}
          {rideBookings > 0 &&
            `${createdAt ? " · " : ""}${rideBookings} ride${rideBookings === 1 ? "" : "s"} booked`}
        </span>
      )}
      <span className="ml-auto flex items-center gap-2 text-xs">
        <a href={`tel:${phone}`} className="underline">
          {formatPhone(phone)}
        </a>
        <a
          href={`https://wa.me/1${phone}`}
          className="rounded-full border border-border px-2 py-0.5 font-medium"
        >
          {action}
        </a>
      </span>
    </li>
  );
}
