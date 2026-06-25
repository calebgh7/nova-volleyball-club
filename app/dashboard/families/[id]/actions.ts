"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

type FormResult = { error: string } | { ok: true };

export async function updateFamily(
  familyId: string,
  _prev: unknown,
  formData: FormData
): Promise<FormResult> {
  const { userId } = await requireStaff();
  const family_name = String(formData.get("family_name") ?? "").trim();
  const billing_email = String(formData.get("billing_email") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();

  if (!family_name) return { error: "Family name is required." };
  if (!billing_email) return { error: "Billing email is required." };

  const supabase = createClient();
  const { error } = await supabase
    .from("families")
    .update({ family_name, billing_email, address: address || null })
    .eq("id", familyId);
  if (error) return { error: error.message };

  await logAudit({
    actorUserId: userId,
    action: "update",
    entity: "families",
    entityId: familyId,
    sensitive: true,
  });
  revalidatePath(`/dashboard/families/${familyId}`);
  return { ok: true };
}

export async function updateGuardian(
  familyId: string,
  guardianId: string,
  _prev: unknown,
  formData: FormData
): Promise<FormResult> {
  const { userId } = await requireStaff();
  const full_name = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const relationship = String(formData.get("relationship") ?? "").trim();
  const is_emergency_contact = formData.get("is_emergency_contact") === "on";

  if (!full_name || !email)
    return { error: "Guardian name and email are required." };

  const supabase = createClient();
  const { error } = await supabase
    .from("guardians")
    .update({
      full_name,
      email,
      phone: phone || null,
      relationship: relationship || null,
      is_emergency_contact,
    })
    .eq("id", guardianId);
  if (error) return { error: error.message };

  await logAudit({
    actorUserId: userId,
    action: "update",
    entity: "guardians",
    entityId: guardianId,
    sensitive: true,
  });
  revalidatePath(`/dashboard/families/${familyId}`);
  return { ok: true };
}

export async function addGuardian(
  familyId: string,
  _prev: unknown,
  formData: FormData
): Promise<FormResult> {
  const { userId } = await requireStaff();
  const full_name = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const relationship = String(formData.get("relationship") ?? "").trim();
  const is_emergency_contact = formData.get("is_emergency_contact") === "on";

  if (!full_name || !email)
    return { error: "Guardian name and email are required." };

  const supabase = createClient();
  const { error } = await supabase.from("guardians").insert({
    family_id: familyId,
    full_name,
    email,
    phone: phone || null,
    relationship: relationship || null,
    is_emergency_contact,
  });
  if (error) return { error: error.message };

  await logAudit({
    actorUserId: userId,
    action: "create",
    entity: "guardians",
    entityId: familyId,
    sensitive: true,
  });
  revalidatePath(`/dashboard/families/${familyId}`);
  return { ok: true };
}

export async function setPrimaryGuardian(
  familyId: string,
  guardianId: string
): Promise<void> {
  const { userId } = await requireStaff();
  const supabase = createClient();
  const { error } = await supabase
    .from("families")
    .update({ primary_guardian_id: guardianId })
    .eq("id", familyId);
  if (error) {
    console.error("[setPrimaryGuardian]", error.message);
    return;
  }

  await logAudit({
    actorUserId: userId,
    action: "update",
    entity: "families",
    entityId: familyId,
    sensitive: true,
  });
  revalidatePath(`/dashboard/families/${familyId}`);
}
