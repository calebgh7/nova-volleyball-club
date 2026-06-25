"use client";

import { useTransition } from "react";
import type { Season } from "@/lib/types";
import { setSeasonAction } from "./season-actions";

export function SeasonSelector({
  seasons,
  activeSeasonId,
}: {
  seasons: Season[];
  activeSeasonId: string | null;
}) {
  const [pending, startTransition] = useTransition();

  if (seasons.length === 0) return null;

  return (
    <label className="flex items-center gap-2 text-xs font-medium text-gray-500">
      Season
      <select
        value={activeSeasonId ?? ""}
        disabled={pending}
        onChange={(e) => {
          const id = e.target.value;
          startTransition(() => {
            setSeasonAction(id);
          });
        }}
        className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm font-semibold text-nova-deep focus:border-nova-violet focus:outline-none disabled:opacity-60"
      >
        {seasons.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </label>
  );
}
