// Append-only audit logging for sensitive-data access (A6 decision).
// The audit_log table has no client INSERT policy by design, so writes go
// through the service-role client. Failures here must never break the user's
// action — we log to the server console and move on.
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";

export type AuditAction = "view" | "create" | "update" | "delete" | "export" | "send";

export async function logAudit(params: {
  actorUserId: string;
  action: AuditAction;
  entity: string;
  entityId?: string | null;
  sensitive?: boolean;
}): Promise<void> {
  if (!hasServiceRole()) {
    // Service role not configured yet — skip silently in dev rather than throw.
    return;
  }
  try {
    const admin = createAdminClient();
    await admin.from("audit_log").insert({
      actor_user_id: params.actorUserId,
      action: params.action,
      entity: params.entity,
      entity_id: params.entityId ?? null,
      sensitive: params.sensitive ?? false,
    });
  } catch (err) {
    console.error("[audit] failed to write audit_log entry:", err);
  }
}
