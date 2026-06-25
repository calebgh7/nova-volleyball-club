"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import type { MembershipStatus, CoachRole } from "@/lib/types";

export async function addPlayerToTeam(
  teamId: string,
  _prev: unknown,
  formData: FormData
) {
  const { userId } = await requireStaff();
  const playerId = String(formData.get("player_id") ?? "").trim();
  if (!playerId) return { error: "Pick a player to add." };

  const jerseyRaw = String(formData.get("jersey_number") ?? "").trim();
  const position = String(formData.get("position") ?? "").trim();
  const status = (String(formData.get("status") ?? "active").trim() ||
    "active") as MembershipStatus;

  const supabase = createClient();
  const { error } = await supabase.from("team_memberships").insert({
    team_id: teamId,
    player_id: playerId,
    jersey_number: jerseyRaw ? Number(jerseyRaw) : null,
    position: position || null,
    status,
  });
  if (error) return { error: error.message };

  await logAudit({
    actorUserId: userId,
    action: "create",
    entity: "team_memberships",
    entityId: teamId,
  });
  revalidatePath(`/dashboard/teams/${teamId}`);
  return null;
}

export async function removePlayerFromTeam(
  teamId: string,
  membershipId: string
): Promise<void> {
  const { userId } = await requireStaff();
  const supabase = createClient();
  const { error } = await supabase
    .from("team_memberships")
    .delete()
    .eq("id", membershipId);
  if (error) {
    console.error("[removePlayerFromTeam]", error.message);
    return;
  }

  await logAudit({
    actorUserId: userId,
    action: "delete",
    entity: "team_memberships",
    entityId: membershipId,
  });
  revalidatePath(`/dashboard/teams/${teamId}`);
}

export async function addCoachToTeam(
  teamId: string,
  _prev: unknown,
  formData: FormData
) {
  const { userId } = await requireStaff();
  const coachId = String(formData.get("coach_id") ?? "").trim();
  if (!coachId) return { error: "Pick a coach to assign." };
  const role = (String(formData.get("role") ?? "head").trim() ||
    "head") as CoachRole;

  const supabase = createClient();
  const { error } = await supabase
    .from("team_coaches")
    .insert({ team_id: teamId, coach_id: coachId, role });
  if (error) return { error: error.message };

  await logAudit({
    actorUserId: userId,
    action: "create",
    entity: "team_coaches",
    entityId: teamId,
  });
  revalidatePath(`/dashboard/teams/${teamId}`);
  return null;
}

export async function removeCoachFromTeam(
  teamId: string,
  teamCoachId: string
): Promise<void> {
  const { userId } = await requireStaff();
  const supabase = createClient();
  const { error } = await supabase
    .from("team_coaches")
    .delete()
    .eq("id", teamCoachId);
  if (error) {
    console.error("[removeCoachFromTeam]", error.message);
    return;
  }

  await logAudit({
    actorUserId: userId,
    action: "delete",
    entity: "team_coaches",
    entityId: teamCoachId,
  });
  revalidatePath(`/dashboard/teams/${teamId}`);
}
