"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { ErrorBanner, inputClass, buttonClass, Badge } from "@/components/ui";
import type { Guardian } from "@/lib/types";

type ActionState = { error: string } | { ok: true } | null;
type FormAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={buttonClass("primary")}>
      {pending ? "Saving…" : label}
    </button>
  );
}

export function GuardianEditor({
  guardian,
  isPrimary,
  updateAction,
  makePrimaryAction,
}: {
  guardian: Guardian;
  isPrimary: boolean;
  updateAction: FormAction;
  makePrimaryAction: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [state, formAction] = useFormState<ActionState, FormData>(updateAction, null);

  return (
    <li className="py-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-nova-deep">
            {guardian.full_name}{" "}
            {isPrimary && <Badge tone="violet">Primary</Badge>}
            {guardian.is_emergency_contact && (
              <Badge tone="amber">Emergency</Badge>
            )}
          </p>
          <p className="text-sm text-gray-500">
            {guardian.email}
            {guardian.phone ? ` · ${guardian.phone}` : ""}
            {guardian.relationship ? ` · ${guardian.relationship}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 gap-3 text-xs font-semibold">
          {!isPrimary && (
            <form action={makePrimaryAction}>
              <button type="submit" className="text-nova-violet hover:underline">
                Make primary
              </button>
            </form>
          )}
          <button
            onClick={() => setEditing((v) => !v)}
            className="text-nova-violet hover:underline"
          >
            {editing ? "Cancel" : "Edit"}
          </button>
        </div>
      </div>

      {editing && (
        <form action={formAction} className="mt-3 space-y-3 rounded-lg bg-gray-50 p-3">
          {state && "error" in state && <ErrorBanner message={state.error} />}
          {state && "ok" in state && (
            <p className="rounded bg-green-50 px-2 py-1 text-xs text-green-700">Saved.</p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <input name="full_name" defaultValue={guardian.full_name} placeholder="Name" className={inputClass} />
            <input name="email" type="email" defaultValue={guardian.email} placeholder="Email" className={inputClass} />
            <input name="phone" defaultValue={guardian.phone ?? ""} placeholder="Phone" className={inputClass} />
            <input name="relationship" defaultValue={guardian.relationship ?? ""} placeholder="Relationship" className={inputClass} />
          </div>
          <label className="flex items-center gap-2 text-sm text-nova-deep">
            <input type="checkbox" name="is_emergency_contact" defaultChecked={guardian.is_emergency_contact} />
            Emergency contact
          </label>
          <Submit label="Save guardian" />
        </form>
      )}
    </li>
  );
}
