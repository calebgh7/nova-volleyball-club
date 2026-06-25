"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

type CheckStatus = "pending" | "cleared" | "expired";

interface CoachFields {
  full_name: string;
  email: string;
  phone: string | null;
  certifications: string | null;
  background_check_status: CheckStatus;
}

function parseCoachFields(formData: FormData): CoachFields | { error: string } {
  const full_name = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const certifications = String(formData.get("certifications") ?? "").trim();
  const status = String(formData.get("background_check_status") ?? "pending").trim();
  const background_check_status = (
    ["pending", "cleared", "expired"].includes(status) ? status : "pending"
  ) as CheckStatus;

  if (!full_name || !email) return { error: "Coach name and email are required." };
  return {
    full_name,
    email,
    phone: phone || null,
    certifications: certifications || null,
    background_check_status,
  };
}

/** Create a coach record from an existing login account and set its role. */
export async function createCoach(
  _prev: unknown,
  formData: FormData
): Promise<{ error: string } | null> {
  const { userId } = await requireStaff();

  if (!hasServiceRole())
    return {
      error:
        "Adding a coach needs the Supabase service role. Set SUPABASE_SERVICE_ROLE_KEY in .env.local.",
    };

  const accountId = String(formData.get("user_id") ?? "").trim();
  if (!accountId) return { error: "Pick the login account for this coach." };

  const fields = parseCoachFields(formData);
  if ("error" in fields) return fields;

  const admin = createAdminClient();

  // Promote the account to the coach role (service role bypasses the
  // director-only profiles write policy, so admins can do this too).
  const { error: roleErr } = await admin
    .from("profiles")
    .update({ role: "coach" })
    .eq("id", accountId);
  if (roleErr) return { error: roleErr.message };

  const { data, error } = await admin
    .from("coaches")
    .insert({ user_id: accountId, is_active: true, ...fields })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await logAudit({
    actorUserId: userId,
    action: "create",
    entity: "coaches",
    entityId: (data as { id: string }).id,
    sensitive: true,
  });

  revalidatePath("/dashboard/coaches");
  redirect("/dashboard/coaches");
}

export async function updateCoach(
  coachId: string,
  _prev: unknown,
  formData: FormData
): Promise<{ error: string } | null> {
  const { userId } = await requireStaff();
  const fields = parseCoachFields(formData);
  if ("error" in fields) return fields;

  const is_active = formData.get("is_active") === "on";

  const supabase = createClient();
  const { error } = await supabase
    .from("coaches")
    .update({ ...fields, is_active })
    .eq("id", coachId);
  if (error) return { error: error.message };

  await logAudit({
    actorUserId: userId,
    action: "update",
    entity: "coaches",
    entityId: coachId,
    sensitive: true,
  });

  revalidatePath("/dashboard/coaches");
  redirect("/dashboard/coaches");
}
