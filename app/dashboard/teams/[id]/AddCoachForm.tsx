"use client";

import { useFormState, useFormStatus } from "react-dom";
import { ErrorBanner, inputClass, buttonClass } from "@/components/ui";

type ActionState = { error: string } | null;
type FormAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

export interface CoachOption {
  id: string;
  label: string;
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={buttonClass("secondary")}>
      {pending ? "Assigning…" : "Assign coach"}
    </button>
  );
}

export function AddCoachForm({
  action,
  coaches,
}: {
  action: FormAction;
  coaches: CoachOption[];
}) {
  const [state, formAction] = useFormState<ActionState, FormData>(action, null);

  if (coaches.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        No unassigned coaches available. Coach accounts are created when a user
        signs up and is given the coach role.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      {state?.error && <ErrorBanner message={state.error} />}
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <select name="coach_id" required defaultValue="" className={inputClass}>
          <option value="" disabled>
            Select a coach…
          </option>
          {coaches.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <select name="role" defaultValue="head" className={inputClass}>
          <option value="head">Head</option>
          <option value="assistant">Assistant</option>
        </select>
        <Submit />
      </div>
    </form>
  );
}
