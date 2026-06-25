// Players list (B3) — staff only. Shows every player with family, division,
// age, and status. Links to each player's detail page.
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, EmptyState, Badge, ButtonLink } from "@/components/ui";
import {
  DIVISION_LABEL,
  ageFromBirthdate,
  type Division,
  type PlayerStatus,
} from "@/lib/types";

export const dynamic = "force-dynamic";

interface PlayerListRow {
  id: string;
  first_name: string;
  last_name: string;
  birthdate: string;
  gender_division: Division;
  status: PlayerStatus;
  families: { family_name: string } | null;
}

const STATUS_TONE: Record<string, string> = {
  active: "green",
  tryout: "amber",
  inactive: "gray",
};

export default async function PlayersPage() {
  await requireStaff();
  const supabase = createClient();

  const { data } = await supabase
    .from("players")
    .select("id, first_name, last_name, birthdate, gender_division, status, families(family_name)")
    .order("last_name");
  const players = (data as unknown as PlayerListRow[] | null) ?? [];

  return (
    <>
      <PageHeader
        title="Players"
        subtitle={`${players.length} in the club`}
        action={<ButtonLink href="/dashboard/players/new">New player</ButtonLink>}
      />

      {players.length === 0 ? (
        <EmptyState
          title="No players yet"
          hint="Add players one at a time here, or load the seed data while building."
          action={<ButtonLink href="/dashboard/players/new">New player</ButtonLink>}
        />
      ) : (
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="py-2 pr-3 font-medium">Name</th>
                <th className="py-2 pr-3 font-medium">Age</th>
                <th className="py-2 pr-3 font-medium">Division</th>
                <th className="py-2 pr-3 font-medium">Family</th>
                <th className="py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="py-2 pr-3">
                    <Link
                      href={`/dashboard/players/${p.id}`}
                      className="font-medium text-nova-deep hover:underline"
                    >
                      {p.first_name} {p.last_name}
                    </Link>
                  </td>
                  <td className="py-2 pr-3 text-gray-600">{ageFromBirthdate(p.birthdate)}</td>
                  <td className="py-2 pr-3 text-gray-600">{DIVISION_LABEL[p.gender_division]}</td>
                  <td className="py-2 pr-3 text-gray-600">{p.families?.family_name ?? "—"}</td>
                  <td className="py-2">
                    <Badge tone={STATUS_TONE[p.status] ?? "gray"}>{p.status}</Badge>
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
