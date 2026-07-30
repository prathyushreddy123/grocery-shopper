"use client";

import { useState } from "react";
import { addItem } from "@/app/actions/items";
import type { RequestType } from "@/lib/constants";

// Uses a real server-action form (`action={addItem}`) so it works even without
// JS — important for non-tech users on flaky phone connections. React 19
// auto-resets the uncontrolled fields after a successful submit. The only
// client state is the optional size/note disclosure.
export default function AddItemForm({
  requestType,
}: {
  requestType: RequestType;
}) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <form action={addItem} className="flex flex-col gap-2">
      <input type="hidden" name="requestType" value={requestType} />
      <div className="flex gap-2">
        <input
          name="name"
          required
          placeholder="Add an item…"
          className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2.5 text-base"
        />
        <input
          name="quantity"
          type="number"
          min={1}
          max={99}
          defaultValue={1}
          aria-label="Quantity"
          className="w-16 rounded-lg border border-border bg-background px-2 py-2.5 text-center text-base"
        />
        <button
          type="submit"
          className="shrink-0 rounded-lg bg-emerald-600 px-4 py-2.5 font-semibold text-white"
        >
          Add
        </button>
      </div>

      {showDetails ? (
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-background/60 p-2">
          <input
            name="size"
            placeholder="Size (optional — organizer picks if blank)"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <input
            name="note"
            placeholder="Note — brand, spice level, etc. (optional)"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowDetails(true)}
          className="self-start text-xs underline opacity-70"
        >
          + Add size or note
        </button>
      )}
    </form>
  );
}
