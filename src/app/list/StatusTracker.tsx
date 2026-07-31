import { TRACKER_STAGES, type TripStatus } from "@/lib/constants";

// Post-cutoff progress the user sees:
// List received → Shopping in Atlanta → On the way back → Delivered.
export default function StatusTracker({ status }: { status: TripStatus }) {
  const currentIdx = TRACKER_STAGES.findIndex((s) => s.status === status);

  return (
    <ol className="flex flex-col gap-3">
      {TRACKER_STAGES.map((stage, i) => {
        const done = i < currentIdx;
        const current = i === currentIdx;
        return (
          <li key={stage.status} className="flex items-center gap-3">
            <span
              className={[
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                done
                  ? "bg-brand text-brand-on"
                  : current
                    ? "bg-brand text-brand-on ring-4 ring-brand-line"
                    : "bg-border text-foreground/50",
              ].join(" ")}
            >
              {done ? "✓" : i + 1}
            </span>
            <span
              className={
                current
                  ? "font-semibold"
                  : done
                    ? "opacity-80"
                    : "opacity-50"
              }
            >
              {stage.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
