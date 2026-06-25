// Server-side auth/role helpers. Use in Server Components, Route Handlers, and
// Server Actions to load the current user and their club role in one place.
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Role } from "@/lib/types";

export interface SessionContext {
  userId: string;
  email: string | null;
  profile: Profile | null;
}

/** Returns the signed-in user + profile, or redirects to /login if absent. */
export async function requireUser(): Promise<SessionContext> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name, phone, is_active")
    .eq("id", user.id)
    .maybeSingle();

  return {
    userId: user.id,
    email: user.email ?? null,
    profile: (profile as Profile | null) ?? null,
  };
}

export const STAFF_ROLES: Role[] = ["director", "admin"];

export function isStaff(role: Role | undefined | null): boolean {
  return role === "director" || role === "admin";
}

export function isDirector(role: Role | undefined | null): boolean {
  return role === "director";
}

/** Require a staff (director/admin) user, redirecting non-staff to the dashboard. */
export async function requireStaff(): Promise<SessionContext> {
  const ctx = await requireUser();
  if (!isStaff(ctx.profile?.role)) redirect("/dashboard");
  return ctx;
}
