// Player detail (B3): profile, family link, and team history. Staff only.
// Viewing a player's record (contact + consent data) is logged to audit_log.
import { notFound } from "next/navigation";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { PageHeader, Card, Badge, ButtonLink } from "@/components/ui";
import {
  DIVISION_LABEL,
  ageFromBirthdate,
  type Division,
  type PlayerStatus,
} from "@/lib/types";

export const dynamic = "force-dynamic";

interface PlayerDetail {
  id: string;
  first_name: string;
  last_name: string;
  birthdate: string;
  gender_division: Division;
  status: PlayerStatus;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  media_consent: boolean;
  family_id: string;
  families: { id: string; family_name: string } | null;
}

interface MembershipHistory {
  jersey_number: number | null;
  position: string | null;
  status: string;
  teams: { id: string; name: string; seasons: { name: string } | null } | null;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="text-sm text-nova-deep">{value}</dd>
    </div>
  );
}

export default async function PlayerDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { userId } = await requireStaff();
  const supabase = createClient();

  const { data } = await supabase
    .from("players")
    .select(
      "id, first_name, last_name, birthdate, gender_division, status, emergency_contact_name, emergency_contact_phone, media_consent, family_id, families(id, family_name)"
    )
    .eq("id", params.id)
    .maybeSingle();

  if (!data) notFound();
  const p = data as unknown as PlayerDetail;

  // Viewing contact/consent data is sensitive (A6) — record the access.
  await logAudit({
    actorUserId: userId,
    action: "view",
    entity: "players",
    entityId: p.id,
    sensitive: true,
  });

  const { data: history } = await supabase
    .from("team_memberships")
    .select("jersey_number, position, status, teams(id, name, seasons(name))")
    .eq("player_id", p.id);
  const memberships = (history as unknown as MembershipHistory[] | null) ?? [];

  return (
    <>
      <PageHeader
        title={`${p.first_name} ${p.last_name}`}
        subtitle={`${DIVISION_LABEL[p.gender_division]} · age ${ageFromBirthdate(
          p.birthdate
        )}`}
        action={
          <ButtonLink href={`/dashboard/players/${p.id}/edit`} variant="secondary">
            Edit
          </ButtonLink>
        }
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold text-nova-deep">Profile</h2>
          <dl className="grid grid-cols-2 gap-4">
            <Field label="Birthdate" value={p.birthdate} />
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-400">Status</dt>
              <dd>
                <Badge
                  tone={
                    p.status === "active"
                      ? "green"
                      : p.status === "tryout"
                      ? "amber"
                      : "gray"
                  }
                >
                  {p.status}
                </Badge>
              </dd>
            </div>
            <Field
              label="Emergency contact"
              value={p.emergency_contact_name ?? "—"}
            />
            <Field
              label="Emergency phone"
              value={p.emergency_contact_phone ?? "—"}
            />
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-400">Media consent</dt>
              <dd>
                <Badge tone={p.media_consent ? "green" : "gray"}>
                  {p.media_consent ? "Granted" : "Not granted"}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-400">Family</dt>
              <dd className="text-sm">
                {p.families ? (
                  <Link
                    href={`/dashboard/families/${p.families.id}`}
                    className="font-medium text-nova-violet hover:underline"
                  >
                    {p.families.family_name}
                  </Link>
                ) : (
                  "—"
                )}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-gray-400">
            No medical/health data is stored — emergency contact only (club policy).
          </p>
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold text-nova-deep">Team history</h2>
          {memberships.length === 0 ? (
            <p className="text-sm text-gray-500">Not on any team yet.</p>
          ) : (
            <ul className="divide-y">
              {memberships.map((m, i) => (
                <li key={i} className="py-2 text-sm">
                  {m.teams ? (
                    <Link
                      href={`/dashboard/teams/${m.teams.id}`}
                      className="font-medium text-nova-deep hover:underline"
                    >
                      {m.teams.name}
                    </Link>
                  ) : (
                    "Unknown team"
                  )}
                  <span className="text-gray-500">
                    {m.teams?.seasons?.name ? ` · ${m.teams.seasons.name}` : ""}
                    {m.jersey_number != null ? ` · #${m.jersey_number}` : ""}
                    {m.position ? ` · ${m.position}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
