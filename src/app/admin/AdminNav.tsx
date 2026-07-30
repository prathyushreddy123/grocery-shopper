import Link from "next/link";

const TABS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/by-person", label: "By Person" },
  { href: "/admin/by-store", label: "By Store" },
  { href: "/admin/rides", label: "Rides" },
] as const;

export default function AdminNav({ active }: { active: string }) {
  return (
    <nav className="mb-5 flex gap-1 rounded-xl border border-border bg-card p-1 text-sm">
      {TABS.map((t) => {
        const isActive = t.href === active;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={[
              "flex-1 rounded-lg px-3 py-2 text-center font-medium transition-colors",
              isActive
                ? "bg-slate-800 text-white dark:bg-slate-700"
                : "opacity-70 hover:opacity-100",
            ].join(" ")}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
