// Season scoping (B5). The "active season" is whichever season the user has
// selected, stored in a cookie; it falls back to the season flagged is_active,
// then the most recent. Read-only helpers live here; the cookie is set by the
// server action in app/dashboard/season-actions.ts.
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { Season } from "@/lib/types";

export const SEASON_COOKIE = "nova_season";

export async function getSeasons(): Promise<Season[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("seasons")
    .select("id, name, type, starts_on, ends_on, registration_open, is_active")
    .order("starts_on", { ascending: false });
  return (data as Season[] | null) ?? [];
}

export async function getActiveSeason(): Promise<Season | null> {
  const seasons = await getSeasons();
  if (seasons.length === 0) return null;

  const selectedId = cookies().get(SEASON_COOKIE)?.value;
  if (selectedId) {
    const match = seasons.find((s) => s.id === selectedId);
    if (match) return match;
  }
  return seasons.find((s) => s.is_active) ?? seasons[0];
}
