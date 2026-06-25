"use client";

import { useFormState, useFormStatus } from "react-dom";
import { ErrorBanner, inputClass, labelClass, buttonClass } from "@/components/ui";
import type { Season, Team } from "@/lib/types";

type ActionState = { error: string } | null;
type FormAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={buttonClass("primary")}>
      {pending ? "Saving…" : label}
    </button>
  );
}

export function TeamForm({
  action,
  seasons,
  team,
  defaultSeasonId,
  submitLabel,
}: {
  action: FormAction;
  seasons: Season[];
  team?: Team;
  defaultSeasonId?: string;
  submitLabel: string;
}) {
  const [state, formAction] = useFormState<ActionState, FormData>(action, null);

  return (
    <form action={formAction} className="max-w-lg space-y-4">
      {state?.error && <ErrorBanner message={state.error} />}

      <div>
        <label className={labelClass}>Team name</label>
        <input
          name="name"
          required
          defaultValue={team?.name ?? ""}
          placeholder="Nova 16 Elite"
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>Season</label>
        <select
          name="season_id"
          required
          defaultValue={team?.season_id ?? defaultSeasonId ?? ""}
          className={inputClass}
        >
          <option value="" disabled>
            Select a season
          </option>
          {seasons.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Age group</label>
          <input
            name="age_group"
            required
            defaultValue={team?.age_group ?? ""}
            placeholder="U16"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Division</label>
          <select
            name="division"
            defaultValue={team?.division ?? "girls"}
            className={inputClass}
          >
            <option value="girls">Girls</option>
            <option value="boys">Boys</option>
            <option value="coed">Coed</option>
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>Skill level (optional)</label>
        <input
          name="skill_level"
          defaultValue={team?.skill_level ?? ""}
          placeholder="Elite, Regional, Developmental…"
          className={inputClass}
        />
      </div>

      <SubmitButton label={submitLabel} />
    </form>
  );
}
