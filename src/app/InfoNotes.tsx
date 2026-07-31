// Static informational card shown to members: the delivery fee tiers and the
// stores the organizer visits each trip. Edit the copy here in one place.
export default function InfoNotes() {
  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-950/30">
      <p className="mb-2 font-bold">Good to know</p>

      <p className="flex gap-2">
        <span aria-hidden>💵</span>
        <span>
          <span className="font-semibold">Delivery fee</span> (based on your
          grocery total): <b>$10</b> for $50 or less · <b>$15</b> for $50–$100 ·{" "}
          <b>$20</b> for over $100.
        </span>
      </p>

      <p className="mt-2 flex gap-2">
        <span aria-hidden>🛍️</span>
        <span>
          Each trip I shop at <b>Costco</b>, <b>Patel Brothers</b>,{" "}
          <b>Desi District</b>, <b>Al Madina Halal Market</b>, and{" "}
          <b>any other place on demand</b> — for your Indian &amp; Nepali
          groceries, fresh halal meat, and prepared food.
        </span>
      </p>
    </div>
  );
}
