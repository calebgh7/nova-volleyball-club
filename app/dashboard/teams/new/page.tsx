import { requireStaff } from "@/lib/auth";
import { getSeasons, getActiveSeason } from "@/lib/season";
import { PageHeader } from "@/components/ui";
import { TeamForm } from "../TeamForm";
import { createTeam } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewTeamPage() {
  await requireStaff();
  const [seasons, activeSeason] = await Promise.all([
    getSeasons(),
    getActiveSeason(),
  ]);

  return (
    <>
      <PageHeader title="New team" subtitle="Create a roster within a season." />
      <TeamForm
        action={createTeam}
        seasons={seasons}
        defaultSeasonId={activeSeason?.id}
        submitLabel="Create team"
      />
    </>
  );
}
