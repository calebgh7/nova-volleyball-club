import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { PlayerForm, type FamilyOption } from "../../PlayerForm";
import { updatePlayer } from "../../actions";
import type { Player } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditPlayerPage({
  params,
}: {
  params: { id: string };
}) {
  await requireStaff();
  const supabase = createClient();

  const [{ data: player }, { data: familyData }] = await Promise.all([
    supabase
      .from("players")
      .select(
        "id, family_id, first_name, last_name, birthdate, gender_division, status, emergency_contact_name, emergency_contact_phone, media_consent"
      )
      .eq("id", params.id)
      .maybeSingle(),
    supabase.from("families").select("id, family_name").order("family_name"),
  ]);

  if (!player) notFound();

  const families: FamilyOption[] = (
    (familyData as { id: string; family_name: string }[] | null) ?? []
  ).map((f) => ({ id: f.id, label: f.family_name }));

  const updateThisPlayer = updatePlayer.bind(null, params.id);

  return (
    <>
      <PageHeader
        title="Edit player"
        subtitle={`${(player as Player).first_name} ${(player as Player).last_name}`}
      />
      <PlayerForm
        action={updateThisPlayer}
        families={families}
        player={player as Player}
        submitLabel="Save changes"
      />
    </>
  );
}
