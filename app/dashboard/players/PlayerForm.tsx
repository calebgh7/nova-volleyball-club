"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { ErrorBanner, inputClass, labelClass, buttonClass } from "@/components/ui";
import type { Player } from "@/lib/types";

type ActionState = { error: string } | null;
type FormAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

export interface FamilyOption {
  id: string;
  label: string;
}

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={buttonClass("primary")}>
      {pending ? "Saving…" : label}
    </button>
  );
}

export function PlayerForm({
  action,
  families,
  player,
  submitLabel,
  allowNewFamily = false,
}: {
  action: FormAction;
  families: FamilyOption[];
  player?: Player;
  submitLabel: string;
  allowNewFamily?: boolean;
}) {
  const [state, formAction] = useFormState<ActionState, FormData>(action, null);
  const [familyMode, setFamilyMode] = useState<"existing" | "new">("existing");

  return (
    <form action={formAction} className="max-w-lg space-y-4">
      {state?.error && <ErrorBanner message={state.error} />}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>First name</label>
          <input name="first_name" required defaultValue={player?.first_name ?? ""} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Last name</label>
          <input name="last_name" required defaultValue={player?.last_name ?? ""} className={inputClass} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>Birthdate</label>
          <input type="date" name="birthdate" required defaultValue={player?.birthdate ?? ""} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Division</label>
          <select name="gender_division" defaultValue={player?.gender_division ?? "girls"} className={inputClass}>
            <option value="girls">Girls</option>
            <option value="boys">Boys</option>
            <option value="coed">Coed</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Status</label>
          <select name="status" defaultValue={player?.status ?? "tryout"} className={inputClass}>
            <option value="active">Active</option>
            <option value="tryout">Tryout</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Emergency contact name</label>
          <input name="emergency_contact_name" defaultValue={player?.emergency_contact_name ?? ""} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Emergency contact phone</label>
          <input name="emergency_contact_phone" defaultValue={player?.emergency_contact_phone ?? ""} className={inputClass} />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-nova-deep">
        <input type="checkbox" name="media_consent" defaultChecked={player?.media_consent ?? false} />
        Media consent granted (photos/video may be used)
      </label>

      {/* Family assignment */}
      <div className="rounded-lg border bg-gray-50 p-4">
        <p className="mb-2 text-sm font-semibold text-nova-deep">Family</p>

        {allowNewFamily && (
          <div className="mb-3 flex gap-4 text-sm">
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name="family_mode"
                value="existing"
                checked={familyMode === "existing"}
                onChange={() => setFamilyMode("existing")}
              />
              Existing family
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name="family_mode"
                value="new"
                checked={familyMode === "new"}
                onChange={() => setFamilyMode("new")}
              />
              New family
            </label>
          </div>
        )}
        {!allowNewFamily && <input type="hidden" name="family_mode" value="existing" />}

        {familyMode === "existing" ? (
          <select
            name="family_id"
            defaultValue={player?.family_id ?? ""}
            required={familyMode === "existing"}
            className={inputClass}
          >
            <option value="" disabled>
              Select a family…
            </option>
            {families.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input name="new_family_name" placeholder="Family name (e.g. The Garcia Family)" className={inputClass} />
              <input name="new_billing_email" type="email" placeholder="Billing email" className={inputClass} />
            </div>
            <p className="text-xs text-gray-500">Primary guardian (the main contact):</p>
            <div className="grid grid-cols-3 gap-3">
              <input name="new_guardian_name" placeholder="Guardian name" className={inputClass} />
              <input name="new_guardian_email" type="email" placeholder="Guardian email" className={inputClass} />
              <input name="new_guardian_phone" placeholder="Phone (optional)" className={inputClass} />
            </div>
          </div>
        )}
      </div>

      <Submit label={submitLabel} />
    </form>
  );
}
