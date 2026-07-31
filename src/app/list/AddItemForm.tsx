"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
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
  const nameRef = useRef<HTMLInputElement>(null);

  return (
    <form action={addItem} className="flex flex-col gap-2">
      <input type="hidden" name="requestType" value={requestType} />

      {/* Shows the item the moment you hit Enter, and puts the cursor back in
          the box when the save lands — so a long list is type/Enter/type/Enter
          with no taps. Both are pure enhancements: without JS the form still
          posts normally and this renders nothing. */}
      <PendingItem nameRef={nameRef} />

      <div className="flex gap-2">
        <input
          ref={nameRef}
          name="name"
          required
          placeholder="Add an item…"
          autoCapitalize="words"
          autoComplete="off"
          enterKeyHint="done"
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
          className="shrink-0 rounded-lg bg-brand px-4 py-2.5 font-semibold text-brand-on"
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

// Must be rendered inside the <form> — useFormStatus reads the enclosing
// form's submission.
function PendingItem({
  nameRef,
}: {
  nameRef: React.RefObject<HTMLInputElement | null>;
}) {
  const { pending, data } = useFormStatus();
  const wasPending = useRef(false);

  useEffect(() => {
    if (pending) {
      wasPending.current = true;
    } else if (wasPending.current) {
      // Only steal focus after this form's own submit, never on page load —
      // there are three of these on the page.
      wasPending.current = false;
      nameRef.current?.focus();
    }
  }, [pending, nameRef]);

  if (!pending) return null;

  const name = String(data?.get("name") ?? "").trim();
  if (!name) return null;
  const quantity = Number(data?.get("quantity") ?? 1);

  return (
    <div className="flex items-center gap-2 rounded-lg border border-dashed border-brand-line bg-brand-soft/60 px-3 py-2 text-sm">
      <span className="animate-pulse" aria-hidden>
        ⏳
      </span>
      <span className="min-w-0 flex-1 font-medium">
        {name}
        {quantity > 1 && <span className="text-muted"> ×{quantity}</span>}
      </span>
      <span className="text-xs text-muted">adding…</span>
    </div>
  );
}
