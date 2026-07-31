import Link from "next/link";

// Search + hide-bought for the shopping views. Driven by the URL rather than
// client state: it survives a refresh mid-aisle, works with no JS, and keeps
// these pages plain server components. A GET form puts `q` in the query
// string; the toggle is a link so hiding bought lines is a single tap.
export default function ListFilter({
  basePath,
  q,
  hideBought,
  showing,
  total,
  unit,
}: {
  basePath: string;
  q: string;
  hideBought: boolean;
  showing: number;
  total: number;
  /** what's being counted, e.g. "line" or "item" */
  unit: string;
}) {
  const toggleHref = hideBought
    ? `${basePath}${q ? `?q=${encodeURIComponent(q)}` : ""}`
    : `${basePath}?hide=1${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  const filtered = showing !== total;

  return (
    <div className="mb-4 flex flex-col gap-2">
      <form method="GET" action={basePath} className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search items or people…"
          autoCapitalize="none"
          autoComplete="off"
          enterKeyHint="search"
          className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        {hideBought && <input type="hidden" name="hide" value="1" />}
        <button className="rounded-lg border border-border px-3 py-2 text-sm font-medium">
          Search
        </button>
      </form>

      <div className="flex items-center gap-2 text-xs">
        <Link
          href={toggleHref}
          className={[
            "rounded-full border px-3 py-1 font-medium",
            hideBought
              ? "border-brand bg-brand text-brand-on"
              : "border-border text-foreground/70",
          ].join(" ")}
        >
          {hideBought ? "✓ " : ""}Hide bought
        </Link>
        {q && (
          <Link
            href={hideBought ? `${basePath}?hide=1` : basePath}
            className="rounded-full border border-border px-3 py-1 font-medium text-foreground/70"
          >
            Clear “{q}”
          </Link>
        )}
        <span className="ml-auto text-muted">
          {filtered ? `showing ${showing} of ${total}` : `${total}`} {unit}
          {total === 1 ? "" : "s"}
        </span>
      </div>
    </div>
  );
}
