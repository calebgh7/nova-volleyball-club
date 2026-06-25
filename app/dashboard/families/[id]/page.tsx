// Family detail (B4): family info (editable), its players, and guardian
// contacts (editable, with primary + emergency flags). Staff only. Viewing
// contact data is logged to audit_log.
import { notFound } from "next/navigation";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { PageHeader, Card, Badge } from "@/components/ui";
import type { Family, Guardian } from "@/lib/types";
import { FamilyEditForm } from "./FamilyEditForm";
import { GuardianEditor } from "./GuardianEditor";
import { AddGuardianForm } from "./AddGuardianForm";
import { updateFamily, updateGuardian, addGuardian, setPrimaryGuardian } from "./actions";

export const dynamic = "force-dynamic";

interface PlayerLite {
  id: string;
  first_name: string;
  last_name: string;
  status: string;
}

export default async function FamilyDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { userId } = await requireStaff();
  const supabase = createClient();
  const familyId = params.id;

  const { data: family } = await supabase
    .from("families")
    .select("id, family_name, primary_guardian_id, billing_email, address, notes")
    .eq("id", familyId)
    .maybeSingle();
  if (!family) notFound();
  const fam = family as Family;

  await logAudit({
    actorUserId: userId,
    action: "view",
    entity: "families",
    entityId: familyId,
    sensitive: true,
  });

  const [{ data: guardianData }, { data: playerData }] = await Promise.all([
    supabase
      .from("guardians")
      .select("id, family_id, user_id, full_name, email, phone, relationship, is_emergency_contact")
      .eq("family_id", familyId)
      .order("full_name"),
    supabase
      .from("players")
      .select("id, first_name, last_name, status")
      .eq("family_id", familyId)
      .order("first_name"),
  ]);
  const guardians = (guardianData as Guardian[] | null) ?? [];
  const players = (playerData as PlayerLite[] | null) ?? [];

  return (
    <>
      <PageHeader title={fam.family_name} subtitle={fam.billing_email} />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold text-nova-deep">Family details</h2>
          <FamilyEditForm action={updateFamily.bind(null, familyId)} family={fam} />
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold text-nova-deep">
            Players ({players.length})
          </h2>
          {players.length === 0 ? (
            <p className="text-sm text-gray-500">No players in this family yet.</p>
          ) : (
            <ul className="divide-y">
              {players.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                  <Link
                    href={`/dashboard/players/${p.id}`}
                    className="font-medium text-nova-deep hover:underline"
                  >
                    {p.first_name} {p.last_name}
                  </Link>
                  <Badge
                    tone={
                      p.status === "active" ? "green" : p.status === "tryout" ? "amber" : "gray"
                    }
                  >
                    {p.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-6">
        <h2 className="mb-1 font-semibold text-nova-deep">
          Guardians ({guardians.length})
        </h2>
        <p className="mb-3 text-xs text-gray-500">
          All club messaging routes to guardians, never to players (club policy).
        </p>
        {guardians.length === 0 ? (
          <p className="text-sm text-gray-500">No guardians on file.</p>
        ) : (
          <ul className="divide-y">
            {guardians.map((g) => (
              <GuardianEditor
                key={g.id}
                guardian={g}
                isPrimary={fam.primary_guardian_id === g.id}
                updateAction={updateGuardian.bind(null, familyId, g.id)}
                makePrimaryAction={setPrimaryGuardian.bind(null, familyId, g.id)}
              />
            ))}
          </ul>
        )}

        <div className="mt-5 border-t pt-4">
          <p className="mb-2 text-sm font-semibold text-nova-deep">Add a guardian</p>
          <AddGuardianForm action={addGuardian.bind(null, familyId)} />
        </div>
      </Card>
    </>
  );
}
