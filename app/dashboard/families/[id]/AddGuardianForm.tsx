"use client";

import { useFormState, useFormStatus } from "react-dom";
import { ErrorBanner, inputClass, buttonClass } from "@/components/ui";

type ActionState = { error: string } | { ok: true } | null;
type FormAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={buttonClass("secondary")}>
      {pending ? "Adding…" : "Add guardian"}
    </button>
  );
}

export function AddGuardianForm({ action }: { action: FormAction }) {
  const [state, formAction] = useFormState<ActionState, FormData>(action, null);

  return (
    <form action={formAction} className="space-y-3">
      {state && "error" in state && <ErrorBanner message={state.error} />}
      {state && "ok" in state && (
        <p className="rounded bg-green-50 px-2 py-1 text-xs text-green-700">
          Guardian added.
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <input name="full_name" placeholder="Guardian name" className={inputClass} />
        <input name="email" type="email" placeholder="Email" className={inputClass} />
        <input name="phone" placeholder="Phone (optional)" className={inputClass} />
        <input name="relationship" placeholder="Relationship (optional)" className={inputClass} />
      </div>
      <label className="flex items-center gap-2 text-sm text-nova-deep">
        <input type="checkbox" name="is_emergency_contact" />
        Emergency contact
      </label>
      <Submit />
    </form>
  );
}
