"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import type { Division, PlayerStatus } from "@/lib/types";

interface PlayerFields {
  first_name: string;
  last_name: string;
  birthdate: string;
  gender_division: Division;
  status: PlayerStatus;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  media_consent: boolean;
}

function parsePlayerFields(formData: FormData): PlayerFields | { error: string } {
  const first_name = String(formData.get("first_name") ?? "").trim();
  const last_name = String(formData.get("last_name") ?? "").trim();
  const birthdate = String(formData.get("birthdate") ?? "").trim();
  const gender_division = String(formData.get("gender_division") ?? "").trim() as Division;
  const status = (String(formData.get("status") ?? "tryout").trim() ||
    "tryout") as PlayerStatus;

  if (!first_name || !last_name) return { error: "First and last name are required." };
  if (!birthdate) return { error: "Birthdate is required." };
  if (!["girls", "boys", "coed"].includes(gender_division))
    return { error: "Pick a valid division." };

  return {
    first_name,
    last_name,
    birthdate,
    gender_division,
    status,
    emergency_contact_name:
      String(formData.get("emergency_contact_name") ?? "").trim() || null,
    emergency_contact_phone:
      String(formData.get("emergency_contact_phone") ?? "").trim() || null,
    media_consent: formData.get("media_consent") === "on",
  };
}

/** Resolve the family for a new player: an existing family id, or create one. */
async function resolveFamily(
  supabase: ReturnType<typeof createClient>,
  formData: FormData
): Promise<{ familyId: string } | { error: string }> {
  const mode = String(formData.get("family_mode") ?? "existing");

  if (mode === "existing") {
    const familyId = String(formData.get("family_id") ?? "").trim();
    if (!familyId) return { error: "Select an existing family or create a new one." };
    return { familyId };
  }

  // Create a new family + primary guardian.
  const familyName = String(formData.get("new_family_name") ?? "").trim();
  const billingEmail = String(formData.get("new_billing_email") ?? "").trim();
  const guardianName = String(formData.get("new_guardian_name") ?? "").trim();
  const guardianEmail = String(formData.get("new_guardian_email") ?? "").trim();
  const guardianPhone = String(formData.get("new_guardian_phone") ?? "").trim();

  if (!familyName) return { error: "New family name is required." };
  if (!billingEmail) return { error: "Billing email is required for a new family." };
  if (!guardianName || !guardianEmail)
    return { error: "A primary guardian name and email are required." };

  const { data: fam, error: famErr } = await supabase
    .from("families")
    .insert({ family_name: familyName, billing_email: billingEmail })
    .select("id")
    .single();
  if (famErr) return { error: famErr.message };
  const familyId = (fam as { id: string }).id;

  const { data: guardian, error: gErr } = await supabase
    .from("guardians")
    .insert({
      family_id: familyId,
      full_name: guardianName,
      email: guardianEmail,
      phone: guardianPhone || null,
      is_emergency_contact: true,
    })
    .select("id")
    .single();
  if (gErr) return { error: gErr.message };

  await supabase
    .from("families")
    .update({ primary_guardian_id: (guardian as { id: string }).id })
    .eq("id", familyId);

  return { familyId };
}

export async function createPlayer(_prev: unknown, formData: FormData) {
  const { userId } = await requireStaff();
  const fields = parsePlayerFields(formData);
  if ("error" in fields) return fields;

  const supabase = createClient();
  const fam = await resolveFamily(supabase, formData);
  if ("error" in fam) return fam;

  const { data, error } = await supabase
    .from("players")
    .insert({
      ...fields,
      family_id: fam.familyId,
      media_consent_at: fields.media_consent ? new Date().toISOString() : null,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await logAudit({
    actorUserId: userId,
    action: "create",
    entity: "players",
    entityId: (data as { id: string }).id,
    sensitive: true,
  });

  revalidatePath("/dashboard/players");
  redirect(`/dashboard/players/${(data as { id: string }).id}`);
}

export async function updatePlayer(playerId: string, _prev: unknown, formData: FormData) {
  const { userId } = await requireStaff();
  const fields = parsePlayerFields(formData);
  if ("error" in fields) return fields;

  const supabase = createClient();

  // Track media-consent grant/revoke timestamps.
  const { data: existing } = await supabase
    .from("players")
    .select("media_consent")
    .eq("id", playerId)
    .maybeSingle();
  const wasConsented = (existing as { media_consent: boolean } | null)?.media_consent;

  const patch: Record<string, unknown> = { ...fields };
  if (fields.media_consent && !wasConsented) {
    patch.media_consent_at = new Date().toISOString();
    patch.media_consent_revoked_at = null;
  } else if (!fields.media_consent && wasConsented) {
    patch.media_consent_revoked_at = new Date().toISOString();
  }

  const familyId = String(formData.get("family_id") ?? "").trim();
  if (familyId) patch.family_id = familyId;

  const { error } = await supabase.from("players").update(patch).eq("id", playerId);
  if (error) return { error: error.message };

  await logAudit({
    actorUserId: userId,
    action: "update",
    entity: "players",
    entityId: playerId,
    sensitive: true,
  });

  revalidatePath(`/dashboard/players/${playerId}`);
  redirect(`/dashboard/players/${playerId}`);
}
