"use client";

import { useFormState, useFormStatus } from "react-dom";
import { ErrorBanner, inputClass, labelClass, buttonClass } from "@/components/ui";
import type { Family } from "@/lib/types";

type ActionState = { error: string } | { ok: true } | null;
type FormAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={buttonClass("primary")}>
      {pending ? "Saving…" : "Save family"}
    </button>
  );
}

export function FamilyEditForm({
  action,
  family,
}: {
  action: FormAction;
  family: Family;
}) {
  const [state, formAction] = useFormState<ActionState, FormData>(action, null);

  return (
    <form action={formAction} className="space-y-4">
      {state && "error" in state && <ErrorBanner message={state.error} />}
      {state && "ok" in state && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          Saved.
        </p>
      )}

      <div>
        <label className={labelClass}>Family name</label>
        <input name="family_name" required defaultValue={family.family_name} className={inputClass} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Billing email</label>
          <input name="billing_email" type="email" required defaultValue={family.billing_email} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Address (optional)</label>
          <input name="address" defaultValue={family.address ?? ""} className={inputClass} />
        </div>
      </div>
      <Submit />
    </form>
  );
}
