"use client";

import { useActionState, useEffect, useState } from "react";
import { updateItem, deleteItem } from "@/app/actions/items";
import { DEFAULT_SIZE } from "@/lib/constants";

type ItemView = {
  id: string;
  name: string;
  size: string;
  note: string | null;
  quantity: number;
};

export default function ItemRow({ item }: { item: ItemView }) {
  const [editing, setEditing] = useState(false);

  // Wrap the void server action so we get a success signal to close the editor.
  const [saveTick, saveAction, saving] = useActionState(
    async (_prev: number, fd: FormData) => {
      await updateItem(fd);
      return Date.now();
    },
    0,
  );
  useEffect(() => {
    if (saveTick) setEditing(false);
  }, [saveTick]);

  if (editing) {
    return (
      <form
        action={saveAction}
        className="flex flex-col gap-2 rounded-lg border border-brand bg-background p-3"
      >
        <input type="hidden" name="itemId" value={item.id} />
        <div className="flex gap-2">
          <input
            name="name"
            defaultValue={item.name}
            required
            className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-base"
          />
          <input
            name="quantity"
            type="number"
            min={1}
            max={99}
            defaultValue={item.quantity}
            aria-label="Quantity"
            className="w-16 rounded-lg border border-border bg-background px-2 py-2 text-center text-base"
          />
        </div>
        <input
          name="size"
          defaultValue={item.size === DEFAULT_SIZE ? "" : item.size}
          placeholder="Size (optional)"
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <input
          name="note"
          defaultValue={item.note ?? ""}
          placeholder="Note (optional)"
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-brand-on disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-lg border border-border px-3 py-1.5 text-sm"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2.5">
      <div className="min-w-0">
        <p className="font-medium">
          {item.name}
          {item.quantity > 1 && (
            <span className="ml-1 text-sm opacity-70">×{item.quantity}</span>
          )}
        </p>
        <p className="text-xs opacity-60">{item.size}</p>
        {item.note && <p className="text-xs italic opacity-70">“{item.note}”</p>}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          onClick={() => setEditing(true)}
          className="rounded px-2 py-1 text-xs underline opacity-70"
        >
          Edit
        </button>
        <form action={deleteItem}>
          <input type="hidden" name="itemId" value={item.id} />
          <button
            type="submit"
            className="rounded px-2 py-1 text-xs text-red-600 underline"
          >
            Delete
          </button>
        </form>
      </div>
    </div>
  );
}
