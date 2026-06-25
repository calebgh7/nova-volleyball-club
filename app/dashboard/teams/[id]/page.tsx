// Team detail (B2): roster (players + jersey/position/status) and assigned
// coaches. Staff can add/remove players and assign/unassign coaches; coaches
// see the same page read-only (enforced by role check + RLS).
import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser, isStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, Badge, ButtonLink } from "@/components/ui";
import { DIVISION_LABEL, type Division, type MembershipStatus } from "@/lib/types";
import { AddPlayerForm, type PlayerOption } from "./AddPlayerForm";
import { AddCoachForm, type CoachOption } from "./AddCoachForm";
import {
  addPlayerToTeam,
  removePlayerFromTeam,
  addCoachToTeam,
  removeCoachFromTeam,
} from "./actions";

export const dynamic = "force-dynamic";

interface MembershipRow {
  id: string;
  jersey_number: number | null;
  position: string | null;
  status: MembershipStatus;
  players: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
}

interface TeamCoachRow {
  id: string;
  role: string;
  coaches: { id: string; full_name: string; email: string } | null;
}

const STATUS_TONE: Record<string, string> = {
  active: "green",
  tryout: "amber",
  dropped: "gray",
};

export default async function TeamDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { profile } = await requireUser();
  const staff = isStaff(profile?.role);
  const supabase = createClient();
  const teamId = params.id;

  const { data: team } = await supabase
    .from("teams")
    .select("id, name, age_group, division, skill_level, seasons(name)")
    .eq("id", teamId)
    .maybeSingle();

  if (!team) notFound();

  const t = team as unknown as {
    id: string;
    name: string;
    age_group: string;
    division: Division;
    skill_level: string | null;
    seasons: { name: string } | null;
  };

  const { data: memberships } = await supabase
    .from("team_memberships")
    .select("id, jersey_number, position, status, players(id, first_name, last_name)")
    .eq("team_id", teamId)
    .order("jersey_number", { ascending: true, nullsFirst: false });
  const roster = (memberships as unknown as MembershipRow[] | null) ?? [];

  const { data: teamCoaches } = await supabase
    .from("team_coaches")
    .select("id, role, coaches(id, full_name, email)")
    .eq("team_id", teamId);
  const coaches = (teamCoaches as unknown as TeamCoachRow[] | null) ?? [];

  // Build the "available to add" lists (staff only).
  let availablePlayers: PlayerOption[] = [];
  let availableCoaches: CoachOption[] = [];
  if (staff) {
    const onTeam = new Set(roster.map((m) => m.players?.id).filter(Boolean));
    const { data: allPlayers } = await supabase
      .from("players")
      .select("id, first_name, last_name, gender_division")
      .order("last_name");
    availablePlayers = ((allPlayers as
      | { id: string; first_name: string; last_name: string }[]
      | null) ?? [])
      .filter((p) => !onTeam.has(p.id))
      .map((p) => ({ id: p.id, label: `${p.first_name} ${p.last_name}` }));

    const assigned = new Set(coaches.map((c) => c.coaches?.id).filter(Boolean));
    const { data: allCoaches } = await supabase
      .from("coaches")
      .select("id, full_name, email")
      .eq("is_active", true)
      .order("full_name");
    availableCoaches = ((allCoaches as
      | { id: string; full_name: string; email: string }[]
      | null) ?? [])
      .filter((c) => !assigned.has(c.id))
      .map((c) => ({ id: c.id, label: `${c.full_name} (${c.email})` }));
  }

  return (
    <>
      <PageHeader
        title={t.name}
        subtitle={`${t.seasons?.name ?? ""} · ${DIVISION_LABEL[t.division]} · ${
          t.age_group
        }${t.skill_level ? ` · ${t.skill_level}` : ""}`}
        action={
          <div className="flex gap-2">
            {(staff || profile?.role === "coach") && (
              <ButtonLink
                href={`/dashboard/messages/new?audience=team&ref=${teamId}`}
                variant="secondary"
              >
                Message team
              </ButtonLink>
            )}
            {staff && (
              <ButtonLink href={`/dashboard/teams/${teamId}/edit`} variant="secondary">
                Edit
              </ButtonLink>
            )}
          </div>
        }
      />

      <Card className="mb-6">
        <h2 className="mb-3 font-semibold text-nova-deep">
          Roster ({roster.length})
        </h2>
        {roster.length === 0 ? (
          <p className="text-sm text-gray-500">No players on this team yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="py-2 pr-3 font-medium">#</th>
                <th className="py-2 pr-3 font-medium">Player</th>
                <th className="py-2 pr-3 font-medium">Position</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                {staff && <th className="py-2 font-medium"></th>}
              </tr>
            </thead>
            <tbody>
              {roster.map((m) => (
                <tr key={m.id} className="border-b last:border-0">
                  <td className="py-2 pr-3 font-semibold text-nova-violet">
                    {m.jersey_number ?? "—"}
                  </td>
                  <td className="py-2 pr-3">
                    {m.players ? (
                      <Link
                        href={`/dashboard/players/${m.players.id}`}
                        className="font-medium text-nova-deep hover:underline"
                      >
                        {m.players.first_name} {m.players.last_name}
                      </Link>
                    ) : (
                      <span className="text-gray-400">Unknown</span>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-gray-600">{m.position ?? "—"}</td>
                  <td className="py-2 pr-3">
                    <Badge tone={STATUS_TONE[m.status] ?? "gray"}>{m.status}</Badge>
                  </td>
                  {staff && (
                    <td className="py-2 text-right">
                      <form action={removePlayerFromTeam.bind(null, teamId, m.id)}>
                        <button
                          type="submit"
                          className="text-xs font-semibold text-red-600 hover:underline"
                        >
                          Remove
                        </button>
                      </form>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {staff && (
          <div className="mt-5 border-t pt-4">
            <p className="mb-2 text-sm font-semibold text-nova-deep">Add a player</p>
            <AddPlayerForm
              action={addPlayerToTeam.bind(null, teamId)}
              players={availablePlayers}
            />
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold text-nova-deep">
          Coaches ({coaches.length})
        </h2>
        {coaches.length === 0 ? (
          <p className="text-sm text-gray-500">No coaches assigned yet.</p>
        ) : (
          <ul className="divide-y">
            {coaches.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-2">
                <span className="text-sm">
                  <span className="font-medium text-nova-deep">
                    {c.coaches?.full_name ?? "Unknown"}
                  </span>{" "}
                  <Badge tone="violet">{c.role}</Badge>
                  <span className="ml-2 text-gray-500">{c.coaches?.email}</span>
                </span>
                {staff && (
                  <form action={removeCoachFromTeam.bind(null, teamId, c.id)}>
                    <button
                      type="submit"
                      className="text-xs font-semibold text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}

        {staff && (
          <div className="mt-5 border-t pt-4">
            <p className="mb-2 text-sm font-semibold text-nova-deep">Assign a coach</p>
            <AddCoachForm
              action={addCoachToTeam.bind(null, teamId)}
              coaches={availableCoaches}
            />
          </div>
        )}
      </Card>
    </>
  );
}
