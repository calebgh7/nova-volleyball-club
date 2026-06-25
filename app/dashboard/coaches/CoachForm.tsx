"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { ErrorBanner, inputClass, labelClass, buttonClass } from "@/components/ui";

type ActionState = { error: string } | null;
type FormAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

export interface AccountOption {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface CoachValues {
  full_name: string;
  email: string;
  phone: string | null;
  certifications: string | null;
  background_check_status: string;
  is_active: boolean;
}

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={buttonClass("primary")}>
      {pending ? "Saving…" : label}
    </button>
  );
}

export function CoachForm({
  action,
  accounts,
  coach,
  submitLabel,
}: {
  action: FormAction;
  accounts?: AccountOption[];
  coach?: CoachValues;
  submitLabel: string;
}) {
  const isNew = Boolean(accounts);
  const [state, formAction] = useFormState<ActionState, FormData>(action, null);
  const [name, setName] = useState(coach?.full_name ?? "");
  const [email, setEmail] = useState(coach?.email ?? "");

  if (isNew && accounts && accounts.length === 0) {
    return (
      <p className="text-sm text-gray-600">
        No eligible login accounts found. A coach needs an account first: have
        them sign up at <code>/signup</code>, then add them here.
      </p>
    );
  }

  return (
    <form action={formAction} className="max-w-lg space-y-4">
      {state?.error && <ErrorBanner message={state.error} />}

      {isNew && accounts && (
        <div>
          <label className={labelClass}>Login account</label>
          <select
            name="user_id"
            required
            defaultValue=""
            onChange={(e) => {
              const acct = accounts.find((a) => a.id === e.target.value);
              if (acct) {
                if (acct.name) setName(acct.name);
                setEmail(acct.email);
              }
            }}
            className={inputClass}
          >
            <option value="" disabled>
              Select an account…
            </option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.email}
                {a.name ? ` — ${a.name}` : ""} ({a.role})
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            This account will be set to the <strong>coach</strong> role.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Full name</label>
          <input
            name="full_name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Email</label>
          <input
            name="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Phone (optional)</label>
          <input name="phone" defaultValue={coach?.phone ?? ""} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Background check</label>
          <select
            name="background_check_status"
            defaultValue={coach?.background_check_status ?? "pending"}
            className={inputClass}
          >
            <option value="pending">Pending</option>
            <option value="cleared">Cleared</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>Certifications (optional)</label>
        <input
          name="certifications"
          defaultValue={coach?.certifications ?? ""}
          placeholder="e.g. USAV IMPACT, CPR"
          className={inputClass}
        />
      </div>

      {!isNew && (
        <label className="flex items-center gap-2 text-sm text-nova-deep">
          <input type="checkbox" name="is_active" defaultChecked={coach?.is_active ?? true} />
          Active (inactive coaches can&apos;t be assigned to teams)
        </label>
      )}

      <Submit label={submitLabel} />
    </form>
  );
}
