import Link from "next/link";

// Groceries and rides are the two things this app does, so they get equal
// billing: a two-tab switcher at the top of both member pages.
const TABS = [
  { href: "/list", label: "Groceries", emoji: "🛒" },
  { href: "/rides", label: "Rides", emoji: "🚗" },
] as const;

export default function AppNav({ active }: { active: "/list" | "/rides" }) {
  return (
    <nav className="mb-5 grid grid-cols-2 gap-1 rounded-2xl border border-border bg-card p-1 shadow-sm">
      {TABS.map((tab) => {
        const current = tab.href === active;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={current ? "page" : undefined}
            className={[
              "flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
              current
                ? "bg-brand text-brand-on"
                : "text-foreground/70 hover:bg-brand-soft hover:text-brand-ink",
            ].join(" ")}
          >
            <span aria-hidden className="text-base">
              {tab.emoji}
            </span>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
