// Coaches admin (staff only): list coach records with background-check status,
// active flag, and how many teams they're assigned to.
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, EmptyState, Badge, ButtonLink } from "@/components/ui";

export const dynamic = "force-dynamic";

interface CoachRow {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  background_check_status: string;
  is_active: boolean;
  team_coaches: { count: number }[];
}

const CHECK_TONE: Record<string, string> = {
  cleared: "green",
  pending: "amber",
  expired: "gray",
};

export default async function CoachesPage() {
  await requireStaff();
  const supabase = createClient();

  const { data } = await supabase
    .from("coaches")
    .select(
      "id, full_name, email, phone, background_check_status, is_active, team_coaches(count)"
    )
    .order("full_name");
  const coaches = (data as unknown as CoachRow[] | null) ?? [];

  return (
    <>
      <PageHeader
        title="Coaches"
        subtitle={`${coaches.length} on staff`}
        action={<ButtonLink href="/dashboard/coaches/new">Add coach</ButtonLink>}
      />

      {coaches.length === 0 ? (
        <EmptyState
          title="No coaches yet"
          hint="Add a coach by linking an existing login account. They sign up first, then you add them here."
          action={<ButtonLink href="/dashboard/coaches/new">Add coach</ButtonLink>}
        />
      ) : (
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="py-2 pr-3 font-medium">Name</th>
                <th className="py-2 pr-3 font-medium">Email</th>
                <th className="py-2 pr-3 font-medium">Background check</th>
                <th className="py-2 pr-3 font-medium">Teams</th>
                <th className="py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {coaches.map((c) => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="py-2 pr-3">
                    <Link
                      href={`/dashboard/coaches/${c.id}/edit`}
                      className="font-medium text-nova-deep hover:underline"
                    >
                      {c.full_name}
                    </Link>
                  </td>
                  <td className="py-2 pr-3 text-gray-600">{c.email}</td>
                  <td className="py-2 pr-3">
                    <Badge tone={CHECK_TONE[c.background_check_status] ?? "gray"}>
                      {c.background_check_status}
                    </Badge>
                  </td>
                  <td className="py-2 pr-3 text-gray-600">
                    {c.team_coaches?.[0]?.count ?? 0}
                  </td>
                  <td className="py-2">
                    <Badge tone={c.is_active ? "green" : "gray"}>
                      {c.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
