import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/context";
import { logout } from "@/app/actions/auth";
import { REQUEST_TYPES, REQUEST_TYPE_META } from "@/lib/constants";
import AddItemForm from "./AddItemForm";
import ItemRow from "./ItemRow";

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export default async function ListPage() {
  const ctx = await getUserContext();
  if (!ctx) redirect("/");

  const { household, trip, order } = ctx;

  return (
    <main className="flex-1">
      <div className="mx-auto w-full max-w-lg px-4 py-6">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm opacity-70">Signed in as</p>
            <p className="font-semibold">{household.name}</p>
          </div>
          <form action={logout}>
            <button className="rounded-lg border border-border px-3 py-1.5 text-sm">
              Sign out
            </button>
          </form>
        </header>

        {/* Trip ticket — countdown & lock arrive in Step 2. */}
        <div className="mb-6 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/40">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
            Next Atlanta trip
          </p>
          <p className="text-lg font-bold">{formatDate(trip.tripDate)}</p>
          <p className="mt-1 text-sm opacity-75">
            Ordering is open — add everything you need below. You can edit your
            list until the organizer&apos;s cutoff.
          </p>
        </div>

        <div className="flex flex-col gap-6">
          {REQUEST_TYPES.map((type) => {
            const meta = REQUEST_TYPE_META[type];
            const items = order.items.filter((i) => i.requestType === type);
            return (
              <section
                key={type}
                className="rounded-2xl border border-border bg-card p-4 shadow-sm"
              >
                <h2 className="mb-3 flex items-center gap-2 text-base font-bold">
                  <span className="text-xl">{meta.emoji}</span>
                  {meta.label}
                  {items.length > 0 && (
                    <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                      {items.length}
                    </span>
                  )}
                </h2>

                {items.length > 0 && (
                  <div className="mb-3 flex flex-col gap-2">
                    {items.map((item) => (
                      <ItemRow
                        key={item.id}
                        item={{
                          id: item.id,
                          name: item.name,
                          size: item.size,
                          note: item.note,
                          quantity: item.quantity,
                        }}
                      />
                    ))}
                  </div>
                )}

                <AddItemForm requestType={type} />
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}
