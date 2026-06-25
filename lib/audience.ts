// Audience resolution (C4). Turns an audience choice into a de-duplicated set
// of GUARDIANS — never players (the parent-only-contact decision, A6).
//
// Stored audience_type values are limited to the data-model enum
// (team | season | club | custom). "Age group" and "specific people" are
// recorded as 'custom' because what matters for the record is the actual
// guardian set, captured in message_recipients.
import type { SupabaseClient } from "@supabase/supabase-js";

export type AudienceKind = "team" | "age_group" | "season" | "club" | "custom";

export interface Recipient {
  guardianId: string;
  email: string;
  name: string;
}

export interface AudienceSelection {
  kind: AudienceKind;
  teamId?: string;
  ageGroup?: string;
  seasonId?: string;
  guardianIds?: string[];
}

// Map a UI audience kind onto the persisted audience_type enum + ref.
export function toStoredAudience(sel: AudienceSelection): {
  audience_type: "team" | "season" | "club" | "custom";
  audience_ref: string | null;
} {
  switch (sel.kind) {
    case "team":
      return { audience_type: "team", audience_ref: sel.teamId ?? null };
    case "season":
      return { audience_type: "season", audience_ref: sel.seasonId ?? null };
    case "club":
      return { audience_type: "club", audience_ref: null };
    default: // age_group, custom
      return { audience_type: "custom", audience_ref: null };
  }
}

async function guardiansForFamilies(
  client: SupabaseClient,
  familyIds: string[]
): Promise<Recipient[]> {
  if (familyIds.length === 0) return [];
  const { data } = await client
    .from("guardians")
    .select("id, email, full_name")
    .in("family_id", familyIds);
  return ((data as { id: string; email: string; full_name: string }[] | null) ?? []).map(
    (g) => ({ guardianId: g.id, email: g.email, name: g.full_name })
  );
}

async function familyIdsForTeams(
  client: SupabaseClient,
  teamIds: string[]
): Promise<string[]> {
  if (teamIds.length === 0) return [];
  const { data: memberships } = await client
    .from("team_memberships")
    .select("player_id")
    .in("team_id", teamIds);
  const playerIds = ((memberships as { player_id: string }[] | null) ?? []).map(
    (m) => m.player_id
  );
  if (playerIds.length === 0) return [];
  const { data: players } = await client
    .from("players")
    .select("family_id")
    .in("id", playerIds);
  return Array.from(
    new Set(((players as { family_id: string }[] | null) ?? []).map((p) => p.family_id))
  );
}

function dedupe(recipients: Recipient[]): Recipient[] {
  const seen = new Set<string>();
  const out: Recipient[] = [];
  for (const r of recipients) {
    if (!r.email) continue;
    const key = r.guardianId;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

export async function resolveRecipients(
  client: SupabaseClient,
  sel: AudienceSelection
): Promise<Recipient[]> {
  switch (sel.kind) {
    case "club": {
      const { data } = await client.from("guardians").select("id, email, full_name");
      return dedupe(
        ((data as { id: string; email: string; full_name: string }[] | null) ?? []).map(
          (g) => ({ guardianId: g.id, email: g.email, name: g.full_name })
        )
      );
    }
    case "team": {
      if (!sel.teamId) return [];
      const familyIds = await familyIdsForTeams(client, [sel.teamId]);
      return dedupe(await guardiansForFamilies(client, familyIds));
    }
    case "season": {
      if (!sel.seasonId) return [];
      const { data: teams } = await client
        .from("teams")
        .select("id")
        .eq("season_id", sel.seasonId);
      const teamIds = ((teams as { id: string }[] | null) ?? []).map((t) => t.id);
      const familyIds = await familyIdsForTeams(client, teamIds);
      return dedupe(await guardiansForFamilies(client, familyIds));
    }
    case "age_group": {
      if (!sel.ageGroup || !sel.seasonId) return [];
      const { data: teams } = await client
        .from("teams")
        .select("id")
        .eq("season_id", sel.seasonId)
        .eq("age_group", sel.ageGroup);
      const teamIds = ((teams as { id: string }[] | null) ?? []).map((t) => t.id);
      const familyIds = await familyIdsForTeams(client, teamIds);
      return dedupe(await guardiansForFamilies(client, familyIds));
    }
    case "custom": {
      if (!sel.guardianIds || sel.guardianIds.length === 0) return [];
      const { data } = await client
        .from("guardians")
        .select("id, email, full_name")
        .in("id", sel.guardianIds);
      return dedupe(
        ((data as { id: string; email: string; full_name: string }[] | null) ?? []).map(
          (g) => ({ guardianId: g.id, email: g.email, name: g.full_name })
        )
      );
    }
    default:
      return [];
  }
}
