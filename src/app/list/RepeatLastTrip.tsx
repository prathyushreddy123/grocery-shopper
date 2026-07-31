import { copyLastTrip } from "@/app/actions/items";
import { DEFAULT_SIZE } from "@/lib/constants";

type PendingItem = {
  id: string;
  name: string;
  size: string;
  note: string | null;
  quantity: number;
};

// Most households order the same basket every trip, so the fastest way to
// build a list is to not type it at all. One tap adds everything; the
// disclosure below is for trimming first. Both are plain server-action forms,
// and <details> needs no JS, so this works on any phone.
export default function RepeatLastTrip({ items }: { items: PendingItem[] }) {
  return (
    <section className="mb-6 rounded-2xl border border-brand-line bg-brand-soft p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-ink">
        ⚡ Quick start
      </p>
      <p className="mt-1 text-sm text-foreground/80">
        Your last trip had{" "}
        <b>
          {items.length} item{items.length === 1 ? "" : "s"}
        </b>{" "}
        you haven&apos;t added yet.
      </p>

      <form action={copyLastTrip} className="mt-3">
        <button className="w-full rounded-lg bg-brand px-4 py-2.5 font-semibold text-brand-on transition-colors hover:bg-brand-hover">
          Add all {items.length} item{items.length === 1 ? "" : "s"}
        </button>
      </form>

      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-medium text-brand-ink">
          Choose which ones
        </summary>
        <form action={copyLastTrip} className="mt-2 flex flex-col gap-1.5">
          {items.map((item) => (
            <label
              key={item.id}
              className="flex items-start gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                name="itemIds"
                value={item.id}
                defaultChecked
                className="mt-1"
              />
              <span className="min-w-0 flex-1">
                <span className="font-medium">
                  {item.name}
                  {item.quantity > 1 && (
                    <span className="text-muted"> ×{item.quantity}</span>
                  )}
                </span>
                {item.size !== DEFAULT_SIZE && (
                  <span className="block text-xs text-muted">{item.size}</span>
                )}
                {item.note && (
                  <span className="block text-xs italic text-muted">
                    “{item.note}”
                  </span>
                )}
              </span>
            </label>
          ))}
          <button className="mt-1 self-start rounded-lg border border-brand-line bg-card px-3 py-1.5 text-sm font-semibold text-brand-ink">
            Add selected
          </button>
        </form>
      </details>
    </section>
  );
}
