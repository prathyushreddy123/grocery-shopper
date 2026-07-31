import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { adminLogin } from "@/app/actions/admin";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await isAdmin()) redirect("/admin");
  const { error } = await searchParams;

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <header className="mb-6 text-center">
          <div className="text-3xl mb-2">🔒</div>
          <h1 className="text-lg font-bold">Organizer sign-in</h1>
        </header>
        <form
          action={adminLogin}
          className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm"
        >
          {error && (
            <p className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
              Incorrect passcode.
            </p>
          )}
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Admin passcode</span>
            <input
              name="passcode"
              type="password"
              autoFocus
              required
              className="rounded-lg border border-border bg-background px-3 py-2.5 text-base"
            />
          </label>
          <button
            type="submit"
            className="rounded-lg bg-foreground px-4 py-3 font-semibold text-background"
          >
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
}
