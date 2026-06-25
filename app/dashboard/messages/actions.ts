"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { requireUser, isStaff } from "@/lib/auth";
import { getActiveSeason } from "@/lib/season";
import { logAudit } from "@/lib/audit";
import { isEmailConfigured, sendEmail } from "@/lib/email";
import {
  resolveRecipients,
  toStoredAudience,
  type AudienceKind,
  type AudienceSelection,
} from "@/lib/audience";
import type { Role } from "@/lib/types";

// Authorized senders (C1 default): director/admin may send to any audience.
// Coaches may only send to a team they coach. Documented in docs/domains/communication.md.
async function buildSelection(
  formData: FormData
): Promise<AudienceSelection | { error: string }> {
  const kind = String(formData.get("audience_kind") ?? "") as AudienceKind;
  const activeSeason = await getActiveSeason();

  switch (kind) {
    case "team":
      return { kind, teamId: String(formData.get("team_id") ?? "").trim() };
    case "age_group":
      return {
        kind,
        ageGroup: String(formData.get("age_group") ?? "").trim(),
        seasonId: activeSeason?.id,
      };
    case "season":
      return { kind, seasonId: activeSeason?.id };
    case "club":
      return { kind };
    case "custom": {
      const ids = formData.getAll("guardian_ids").map((v) => String(v));
      return { kind, guardianIds: ids };
    }
    default:
      return { error: "Choose an audience." };
  }
}

async function authorize(
  sel: AudienceSelection,
  role: Role | undefined
): Promise<{ error: string } | null> {
  if (isStaff(role)) return null;
  if (role === "coach") {
    if (sel.kind !== "team" || !sel.teamId)
      return { error: "Coaches can only message their own teams." };
    const supabase = createClient();
    // RLS limits team_coaches to the coach's own assignments.
    const { data } = await supabase
      .from("team_coaches")
      .select("id")
      .eq("team_id", sel.teamId)
      .maybeSingle();
    if (!data) return { error: "You can only message a team you coach." };
    return null;
  }
  return { error: "You are not authorized to send messages." };
}

/** Resolve the recipient count for the compose screen preview. */
export async function previewAudience(
  _prev: unknown,
  formData: FormData
): Promise<{ count: number; sample: string[] } | { error: string }> {
  const { profile } = await requireUser();
  const sel = await buildSelection(formData);
  if ("error" in sel) return sel;

  const authErr = await authorize(sel, profile?.role);
  if (authErr) return authErr;

  // Resolve under the caller's RLS so the preview matches what they may send.
  const supabase = createClient();
  const recipients = await resolveRecipients(supabase, sel);
  return {
    count: recipients.length,
    sample: recipients.slice(0, 5).map((r) => r.name),
  };
}

export async function sendMessage(
  _prev: unknown,
  formData: FormData
): Promise<{ error: string } | { ok: true; sent: number; failed: number }> {
  const { profile, userId } = await requireUser();

  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!subject) return { error: "A subject is required." };
  if (!body) return { error: "A message body is required." };

  const sel = await buildSelection(formData);
  if ("error" in sel) return sel;

  const authErr = await authorize(sel, profile?.role);
  if (authErr) return authErr;

  if (!isEmailConfigured())
    return {
      error:
        "Email isn't configured yet. Set SMTP_HOST/PORT/USER/PASSWORD and EMAIL_FROM in .env.local (Google Workspace App Password).",
    };
  if (!hasServiceRole())
    return {
      error:
        "Sending needs the Supabase service role. Set SUPABASE_SERVICE_ROLE_KEY in .env.local.",
    };

  // Resolve recipients under the caller's RLS (correct, authorized set).
  const session = createClient();
  const recipients = await resolveRecipients(session, sel);
  if (recipients.length === 0)
    return { error: "That audience has no guardian recipients." };

  // Persist the message + per-recipient rows with the service role (the
  // append-only recipient table and coach sends need it).
  const admin = createAdminClient();
  const stored = toStoredAudience(sel);
  const { data: msg, error: msgErr } = await admin
    .from("messages")
    .insert({
      sender_user_id: userId,
      channel: "email",
      audience_type: stored.audience_type,
      audience_ref: stored.audience_ref,
      subject,
      body,
      sent_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (msgErr) return { error: msgErr.message };
  const messageId = (msg as { id: string }).id;

  await admin.from("message_recipients").insert(
    recipients.map((r) => ({
      message_id: messageId,
      guardian_id: r.guardianId,
      delivery_status: "queued" as const,
    }))
  );

  // Send individually so recipients never see each other's addresses.
  let sent = 0;
  let failed = 0;
  const results = await Promise.allSettled(
    recipients.map(async (r) => {
      const res = await sendEmail({ to: r.email, subject, body });
      return { guardianId: r.guardianId, ok: res.ok };
    })
  );

  const sentIds: string[] = [];
  const failedIds: string[] = [];
  for (const res of results) {
    if (res.status === "fulfilled" && res.value.ok) {
      sent += 1;
      sentIds.push(res.value.guardianId);
    } else {
      failed += 1;
      if (res.status === "fulfilled") failedIds.push(res.value.guardianId);
    }
  }

  if (sentIds.length > 0)
    await admin
      .from("message_recipients")
      .update({ delivery_status: "sent" })
      .eq("message_id", messageId)
      .in("guardian_id", sentIds);
  if (failedIds.length > 0)
    await admin
      .from("message_recipients")
      .update({ delivery_status: "failed" })
      .eq("message_id", messageId)
      .in("guardian_id", failedIds);

  await logAudit({
    actorUserId: userId,
    action: "send",
    entity: "messages",
    entityId: messageId,
    sensitive: true,
  });

  return { ok: true, sent, failed };
}
