import Link from "next/link";
import { redirect } from "next/navigation";
import { getHousehold } from "@/lib/session";
import { formatPhone } from "@/lib/phone";
import { startLogin, register, verifyPinAction } from "@/app/actions/auth";
import InfoNotes from "@/app/InfoNotes";
import Logo from "@/app/Logo";

const ERRORS: Record<string, string> = {
  badphone: "Please enter a valid 10-digit phone number.",
  noname: "Please enter your name.",
  badpin: "PIN must be exactly 4 digits.",
};

export default async function EntryPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string; phone?: string; error?: string }>;
}) {
  // Already signed in? Go straight to the list.
  const existing = await getHousehold();
  if (existing) redirect("/list");

  const { step, phone, error } = await searchParams;
  const errorMsg = error ? ERRORS[error] : null;

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <header className="mb-8 flex flex-col items-center text-center">
          <Logo size={64} showWordmark={false} />
          <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight">
            Tifton<span className="text-brand">Wala</span>
          </h1>
          <p className="text-sm font-medium text-muted">Groceries &amp; Rides</p>
          <p className="mt-3 text-lg font-bold italic text-brand">
            We drive, so you don&apos;t have to.
          </p>
          <p className="mt-2 text-xs text-muted">
            Indian &amp; Nepali groceries, meat &amp; prepared food — for Tifton
            families and neighbors.
          </p>
        </header>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          {errorMsg && (
            <p className="mb-4 rounded-lg bg-red-100 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
              {errorMsg}
            </p>
          )}

          {step === "register" ? (
            <form action={register} className="flex flex-col gap-4">
              <h2 className="font-semibold">Welcome! First time here</h2>
              <input type="hidden" name="phone" value={phone ?? ""} />
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">Your name</span>
                <input
                  name="name"
                  autoFocus
                  required
                  placeholder="e.g. Priya Sharma"
                  className="rounded-lg border border-border bg-background px-3 py-2.5 text-base"
                />
              </label>
              <p className="text-sm opacity-70">
                Phone: {phone ? formatPhone(phone) : ""}
              </p>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">
                  Delivery address{" "}
                  <span className="opacity-60">(where should I drop off?)</span>
                </span>
                <textarea
                  name="address"
                  rows={2}
                  placeholder="Street address, apt #, city"
                  className="rounded-lg border border-border bg-background px-3 py-2.5 text-base"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">
                  Set a 4-digit PIN{" "}
                  <span className="opacity-60">(optional, for privacy)</span>
                </span>
                <input
                  name="pin"
                  inputMode="numeric"
                  pattern="\d{4}"
                  maxLength={4}
                  placeholder="Leave blank to skip"
                  className="rounded-lg border border-border bg-background px-3 py-2.5 text-base tracking-widest"
                />
                <span className="text-xs opacity-60">
                  If you set a PIN, you&apos;ll enter it each visit so only you
                  can see your list.
                </span>
              </label>
              <SubmitButton>Start my list →</SubmitButton>
            </form>
          ) : step === "pin" ? (
            <form action={verifyPinAction} className="flex flex-col gap-4">
              <h2 className="font-semibold">Welcome back</h2>
              <input type="hidden" name="phone" value={phone ?? ""} />
              <p className="text-sm opacity-70">
                Enter your PIN for {phone ? formatPhone(phone) : "your number"}.
              </p>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">4-digit PIN</span>
                <input
                  name="pin"
                  autoFocus
                  inputMode="numeric"
                  pattern="\d{4}"
                  maxLength={4}
                  required
                  className="rounded-lg border border-border bg-background px-3 py-2.5 text-lg tracking-[0.4em]"
                />
              </label>
              <SubmitButton>Open my list →</SubmitButton>
              <Link
                href="/"
                className="text-center text-sm underline opacity-70"
              >
                Use a different number
              </Link>
            </form>
          ) : (
            <form action={startLogin} className="flex flex-col gap-4">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">Your phone number</span>
                <input
                  name="phone"
                  autoFocus
                  inputMode="tel"
                  required
                  placeholder="(229) 555-0100"
                  className="rounded-lg border border-border bg-background px-3 py-2.5 text-base"
                />
              </label>
              <SubmitButton>Continue →</SubmitButton>
              <p className="text-center text-xs opacity-60">
                No password needed. Your phone number is your login.
              </p>
            </form>
          )}
        </div>

        <div className="mt-6">
          <InfoNotes />
        </div>
      </div>
    </main>
  );
}

function SubmitButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="submit"
      className="rounded-lg bg-brand px-4 py-3 text-base font-semibold text-brand-on transition-colors hover:bg-brand-hover"
    >
      {children}
    </button>
  );
}
