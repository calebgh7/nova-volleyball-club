"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import type { Division } from "@/lib/types";

interface TeamInput {
  name: string;
  season_id: string;
  age_group: string;
  division: Division;
  skill_level: string | null;
}

function parseTeamForm(formData: FormData): TeamInput | { error: string } {
  const name = String(formData.get("name") ?? "").trim();
  const season_id = String(formData.get("season_id") ?? "").trim();
  const age_group = String(formData.get("age_group") ?? "").trim();
  const division = String(formData.get("division") ?? "").trim() as Division;
  const skill_level = String(formData.get("skill_level") ?? "").trim();

  if (!name) return { error: "Team name is required." };
  if (!season_id) return { error: "A season is required." };
  if (!age_group) return { error: "Age group is required." };
  if (!["girls", "boys", "coed"].includes(division))
    return { error: "Pick a valid division." };

  return {
    name,
    season_id,
    age_group,
    division,
    skill_level: skill_level || null,
  };
}

export async function createTeam(_prev: unknown, formData: FormData) {
  const { userId } = await requireStaff();
  const parsed = parseTeamForm(formData);
  if ("error" in parsed) return parsed;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("teams")
    .insert(parsed)
    .select("id")
    .single();

  if (error) return { error: error.message };

  await logAudit({
    actorUserId: userId,
    action: "create",
    entity: "teams",
    entityId: (data as { id: string }).id,
  });

  revalidatePath("/dashboard/teams");
  redirect(`/dashboard/teams/${(data as { id: string }).id}`);
}

export async function updateTeam(teamId: string, _prev: unknown, formData: FormData) {
  const { userId } = await requireStaff();
  const parsed = parseTeamForm(formData);
  if ("error" in parsed) return parsed;

  const supabase = createClient();
  const { error } = await supabase.from("teams").update(parsed).eq("id", teamId);
  if (error) return { error: error.message };

  await logAudit({
    actorUserId: userId,
    action: "update",
    entity: "teams",
    entityId: teamId,
  });

  revalidatePath(`/dashboard/teams/${teamId}`);
  redirect(`/dashboard/teams/${teamId}`);
}
