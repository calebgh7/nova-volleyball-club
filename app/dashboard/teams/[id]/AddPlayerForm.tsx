"use client";

import { useFormState, useFormStatus } from "react-dom";
import { ErrorBanner, inputClass, buttonClass } from "@/components/ui";

type ActionState = { error: string } | null;
type FormAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

export interface PlayerOption {
  id: string;
  label: string;
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={buttonClass("primary")}>
      {pending ? "Adding…" : "Add player"}
    </button>
  );
}

export function AddPlayerForm({
  action,
  players,
}: {
  action: FormAction;
  players: PlayerOption[];
}) {
  const [state, formAction] = useFormState<ActionState, FormData>(action, null);

  if (players.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        Every player in this season&apos;s club is already on this roster, or
        there are no players yet. Add players from the Players section.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      {state?.error && <ErrorBanner message={state.error} />}
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
        <select name="player_id" required defaultValue="" className={inputClass}>
          <option value="" disabled>
            Select a player…
          </option>
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <input
          name="jersey_number"
          type="number"
          min={0}
          placeholder="#"
          className={`${inputClass} w-20`}
        />
        <input
          name="position"
          placeholder="Position"
          className={`${inputClass} w-36`}
        />
        <select name="status" defaultValue="active" className={inputClass}>
          <option value="active">Active</option>
          <option value="tryout">Tryout</option>
          <option value="dropped">Dropped</option>
        </select>
      </div>
      <Submit />
    </form>
  );
}
