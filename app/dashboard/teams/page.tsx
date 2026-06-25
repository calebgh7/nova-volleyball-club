// Teams list (B1), scoped to the active season. Staff can create teams; coaches
// see only their assigned teams (RLS). Each row links to the team detail page.
import { requireUser, isStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getActiveSeason } from "@/lib/season";
import {
  PageHeader,
  Card,
  EmptyState,
  Badge,
  ButtonLink,
} from "@/components/ui";
import { DIVISION_LABEL, type Division } from "@/lib/types";

export const dynamic = "force-dynamic";

interface TeamRow {
  id: string;
  name: string;
  age_group: string;
  division: Division;
  skill_level: string | null;
  team_memberships: { count: number }[];
  team_coaches: { count: number }[];
}

export default async function TeamsPage() {
  const { profile } = await requireUser();
  const staff = isStaff(profile?.role);
  const supabase = createClient();
  const activeSeason = await getActiveSeason();

  let teams: TeamRow[] = [];
  if (activeSeason) {
    const { data } = await supabase
      .from("teams")
      .select(
        "id, name, age_group, division, skill_level, team_memberships(count), team_coaches(count)"
      )
      .eq("season_id", activeSeason.id)
      .order("name");
    teams = (data as TeamRow[] | null) ?? [];
  }

  return (
    <>
      <PageHeader
        title="Teams"
        subtitle={activeSeason ? activeSeason.name : "No active season"}
        action={
          staff ? (
            <ButtonLink href="/dashboard/teams/new">New team</ButtonLink>
          ) : undefined
        }
      />

      {!activeSeason ? (
        <EmptyState
          title="No season yet"
          hint="Create a season in the database (or load the seed data) to start adding teams."
        />
      ) : teams.length === 0 ? (
        <EmptyState
          title="No teams in this season"
          hint={
            staff
              ? "Create your first team to start building rosters."
              : "You aren't assigned to any teams in this season yet."
          }
          action={
            staff ? (
              <ButtonLink href="/dashboard/teams/new">New team</ButtonLink>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {teams.map((t) => (
            <a key={t.id} href={`/dashboard/teams/${t.id}`} className="block">
              <Card className="transition hover:border-nova-violet">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold text-nova-deep">{t.name}</h2>
                  <Badge tone="violet">{t.age_group}</Badge>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  {DIVISION_LABEL[t.division]}
                  {t.skill_level ? ` · ${t.skill_level}` : ""}
                </p>
                <p className="mt-3 text-sm text-gray-600">
                  {t.team_memberships?.[0]?.count ?? 0} players ·{" "}
                  {t.team_coaches?.[0]?.count ?? 0} coaches
                </p>
              </Card>
            </a>
          ))}
        </div>
      )}
    </>
  );
}
