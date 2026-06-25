import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSeasons } from "@/lib/season";
import { PageHeader } from "@/components/ui";
import { TeamForm } from "../../TeamForm";
import { updateTeam } from "../../actions";
import type { Team } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditTeamPage({
  params,
}: {
  params: { id: string };
}) {
  await requireStaff();
  const supabase = createClient();

  const [{ data: team }, seasons] = await Promise.all([
    supabase
      .from("teams")
      .select("id, season_id, name, age_group, division, skill_level")
      .eq("id", params.id)
      .maybeSingle(),
    getSeasons(),
  ]);

  if (!team) notFound();

  const updateThisTeam = updateTeam.bind(null, params.id);

  return (
    <>
      <PageHeader title="Edit team" subtitle={(team as Team).name} />
      <TeamForm
        action={updateThisTeam}
        seasons={seasons}
        team={team as Team}
        submitLabel="Save changes"
      />
    </>
  );
}
