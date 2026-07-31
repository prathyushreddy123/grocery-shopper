# Roadmap — deferred improvements

Ideas we've agreed are worth doing but haven't built yet, with enough detail to
pick up cold. Ordered roughly by value per unit of work.

## Already shipped (context for what follows)

- **Rides**: organizer opens dates; households book **seats** against a
  per-date `capacity` (default 3) and pool onto the same trip. Green calendar,
  `Full` state, admin capacity editor.
- **Phase 1 entry/sorting**: "Repeat my last trip" (`copyLastTrip` +
  `RepeatLastTrip.tsx`), in-flight item row + refocus in `AddItemForm.tsx`,
  URL-driven search and hide-bought on both admin views (`ListFilter.tsx`).

The open question Phase 1 was built to answer: **how much of the entry pain is
just repeat-ordering?** Watch the first trip after everyone has a history. If
people still type everything by hand, skip to the catalog (C below).

---

## First-time entry — the gap Phase 1 doesn't cover

"Repeat my last trip" does nothing for a household's *first* list, which is
exactly when someone decides whether the app is worth using.

### A. Community starter basket — cheapest, do this first

A first-timer has no history, but the community does. `GROUP BY` normalized
item name across all past `Item` rows, take the top ~15, and offer them as a
pre-checked checklist: *"Most families order these — uncheck what you don't
need."*

- Reuses `RepeatLastTrip.tsx` and `copyLastTrip` almost as-is — a second data
  source and a card variant. **No schema change.**
- Improves by itself as trips accumulate, and nudges households onto the same
  item names, which raises merge quality on By Store.

### B. Bulk paste — "type it like a WhatsApp message"

These households came from a WhatsApp group and already know how to thumb out a
whole list in one message. One textarea → parsed rows → **editable review
screen** → one submit.

```
atta 2
toor dal
onions 3 lb
paneer (low fat)
goat curry cut x2
```

Parsing rules: a bare leading/trailing number is quantity (`atta 2`, `x2`); a
number followed by a unit (`kg`, `lb`, `oz`, `packet`, `dozen`) stays part of
the size with quantity 1; text in parentheses becomes the note. Split on
newlines; if the whole input is one line with several commas, split on commas.

The review step is what makes this safe — a misparse is corrected before it's
saved, never silently. **Biggest hidden win:** the phone keyboard's mic button
works inside a textarea, so a household that struggles to type can dictate the
entire list. Say so in the placeholder copy.

### C. Catalog chips — best steady state, needs a data model

Tap `Onions` → added; tap again → ×2. No typing, no spelling, no keyboard.

```prisma
model CatalogItem {
  id           String  @id @default(cuid())
  name         String              // "Aashirvaad Atta"
  aliases      String?             // "atta, wheat flour, आटा" — searched
  requestType  String              // GROCERIES | MEAT | RESTAURANT
  defaultStore String              // PATEL | COSTCO | AL_MADHINA …
  category     String?             // aisle grouping
  popularity   Int     @default(0)
  active       Boolean @default(true)
}
// Item gains: catalogItemId String?   ← nullable, free text still works
```

Seed it **from order history** (top ~80 normalized names), not by hand, then
let the admin edit. Merge key becomes `catalogItemId ?? mergeKey(name, size)`,
so nothing breaks for free-text items. Chips, aisle sorting, and remembered
per-household sizes all fall out of this one table.

Cost to be honest about: a catalog needs curation, and a stale one is worse
than none. Seeding from history plus a free-text escape hatch keeps it
manageable; the `popularity` counter re-ranks it each trip without manual work.

---

## Organizer / sorting

1. **Aisle grouping within a store** — sort lines by `category` so the store is
   walked once. Free once the catalog exists.
2. **Per-household cost split** — enter what a merged line actually cost, split
   it by quantity share, sum per household, apply the existing $10/$15/$20 fee
   tiers from `InfoNotes.tsx`. Probably the biggest remaining time sink after
   shopping itself.
3. **Delivery-route ordering** — sort By Person by address for the drop-off
   run, with per-household packing slips.
4. **Export / print** — plain-text list per store as a fallback when the phone
   is flaky mid-aisle.

## Rides

- Pickup-order by household address.
- Nudge the organizer to reuse an existing open date instead of opening a new
  one (better pooling).
- Waitlist on full dates.

---

## Deliberately deferred

**Photo of a handwritten list → OCR/LLM.** Appealing for this audience and the
one place an LLM would earn its keep, but it adds an API dependency, per-request
cost, latency on a flaky connection, and a new privacy surface — and a wrong
parse from a photo is much harder for the user to catch than one from text they
just typed. Revisit after A and B are proven.

## Small open item

`AddItemForm` sets `enterKeyHint="done"`. On some mobile keyboards "Done"
dismisses the keyboard instead of submitting, which would break the
type-Enter-type rhythm on exactly the devices that matter. Test on a real
phone; if it closes the keyboard instead of adding the item, switch to
`"send"` or `"next"`.
