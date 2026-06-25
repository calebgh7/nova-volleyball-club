import { requireStaff } from "@/lib/auth";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { PageHeader, Card } from "@/components/ui";
import { CoachForm, type AccountOption } from "../CoachForm";
import { createCoach } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewCoachPage() {
  await requireStaff();

  if (!hasServiceRole()) {
    return (
      <>
        <PageHeader title="Add coach" />
        <Card>
          <p className="text-sm text-gray-700">
            Adding a coach needs the Supabase service role so the account can be
            promoted to the coach role. Set{" "}
            <code>SUPABASE_SERVICE_ROLE_KEY</code> in <code>web/.env.local</code>{" "}
            and restart the dev server.
          </p>
        </Card>
      </>
    );
  }

  // List login accounts that don't already have a coach record.
  const admin = createAdminClient();
  const [{ data: usersData }, { data: existing }, { data: profiles }] =
    await Promise.all([
      admin.auth.admin.listUsers(),
      admin.from("coaches").select("user_id"),
      admin.from("profiles").select("id, full_name, role"),
    ]);

  const taken = new Set(
    ((existing as { user_id: string }[] | null) ?? []).map((c) => c.user_id)
  );
  const profMap = new Map(
    ((profiles as { id: string; full_name: string; role: string }[] | null) ?? []).map(
      (p) => [p.id, p]
    )
  );

  const accounts: AccountOption[] = (usersData?.users ?? [])
    .filter((u) => !taken.has(u.id))
    .map((u) => ({
      id: u.id,
      email: u.email ?? "(no email)",
      name: profMap.get(u.id)?.full_name ?? "",
      role: profMap.get(u.id)?.role ?? "parent",
    }));

  return (
    <>
      <PageHeader
        title="Add coach"
        subtitle="Link an existing login account and set their coach details."
      />
      <CoachForm action={createCoach} accounts={accounts} submitLabel="Add coach" />
    </>
  );
}
