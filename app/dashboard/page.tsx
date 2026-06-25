// Dashboard overview. The header/sidebar live in layout.tsx; this page shows a
// welcome + quick counts scoped to the active season, with links into the app.
import Link from "next/link";
import { requireUser, isStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getActiveSeason } from "@/lib/season";
import { PageHeader, Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { profile } = await requireUser();
  const staff = isStaff(profile?.role);
  const supabase = createClient();
  const activeSeason = await getActiveSeason();

  // Counts respect RLS automatically: staff see all, coaches see their teams.
  const teamQuery = supabase
    .from("teams")
    .select("id", { count: "exact", head: true });
  if (activeSeason) teamQuery.eq("season_id", activeSeason.id);

  const [{ count: teamCount }, playersRes] = await Promise.all([
    teamQuery,
    staff
      ? supabase.from("players").select("id", { count: "exact", head: true })
      : Promise.resolve({ count: null as number | null }),
  ]);

  return (
    <>
      <PageHeader
        title={`Welcome${profile?.full_name ? `, ${profile.full_name}` : ""}.`}
        subtitle={
          activeSeason
            ? `Active season: ${activeSeason.name}`
            : "No season selected yet."
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/dashboard/teams" className="block">
          <Card className="transition hover:border-nova-violet">
            <p className="text-sm text-gray-500">Teams this season</p>
            <p className="mt-1 text-3xl font-bold text-nova-deep">
              {teamCount ?? "—"}
            </p>
            <p className="mt-2 text-sm font-semibold text-nova-violet">
              Manage teams →
            </p>
          </Card>
        </Link>

        {staff && (
          <Link href="/dashboard/players" className="block">
            <Card className="transition hover:border-nova-violet">
              <p className="text-sm text-gray-500">Players in the club</p>
              <p className="mt-1 text-3xl font-bold text-nova-deep">
                {playersRes.count ?? "—"}
              </p>
              <p className="mt-2 text-sm font-semibold text-nova-violet">
                Manage players →
              </p>
            </Card>
          </Link>
        )}

        {(staff || profile?.role === "coach") && (
          <Link href="/dashboard/messages/new" className="block">
            <Card className="transition hover:border-nova-violet">
              <p className="text-sm text-gray-500">Communication</p>
              <p className="mt-1 text-lg font-bold text-nova-deep">
                Email a team or the club
              </p>
              <p className="mt-2 text-sm font-semibold text-nova-violet">
                Compose a message →
              </p>
            </Card>
          </Link>
        )}
      </div>

      {!staff && profile?.role === "coach" && (
        <p className="mt-6 text-sm text-gray-500">
          You&apos;re signed in as a coach. You can see the teams you&apos;re
          assigned to and message their families.
        </p>
      )}
    </>
  );
}
