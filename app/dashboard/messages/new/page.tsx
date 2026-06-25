import { redirect } from "next/navigation";
import { requireUser, isStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getActiveSeason } from "@/lib/season";
import { PageHeader } from "@/components/ui";
import { ComposeForm, type TeamOption, type GuardianOption } from "../ComposeForm";
import type { AudienceKind } from "@/lib/audience";

export const dynamic = "force-dynamic";

export default async function ComposePage({
  searchParams,
}: {
  searchParams: { audience?: string; ref?: string };
}) {
  const { profile } = await requireUser();
  const staff = isStaff(profile?.role);
  if (!staff && profile?.role !== "coach") redirect("/dashboard");

  const supabase = createClient();
  const activeSeason = await getActiveSeason();

  // RLS scopes teams: staff see all in season, coaches see only their own.
  let teams: TeamOption[] = [];
  if (activeSeason) {
    const { data } = await supabase
      .from("teams")
      .select("id, name, age_group")
      .eq("season_id", activeSeason.id)
      .order("name");
    teams = (data as TeamOption[] | null) ?? [];
  }

  const ageGroups = Array.from(new Set(teams.map((t) => t.age_group))).sort();

  // Guardians list is only needed for the staff "specific people" option.
  let guardians: GuardianOption[] = [];
  if (staff) {
    const { data } = await supabase
      .from("guardians")
      .select("id, full_name, families(family_name)")
      .order("full_name");
    guardians = (
      (data as unknown as
        | { id: string; full_name: string; families: { family_name: string } | null }[]
        | null) ?? []
    ).map((g) => ({
      id: g.id,
      name: g.full_name,
      family: g.families?.family_name ?? "",
    }));
  }

  const defaultKind = (searchParams.audience as AudienceKind) || "team";
  const defaultTeamId = searchParams.ref ?? "";

  return (
    <>
      <PageHeader
        title="Compose message"
        subtitle="Email goes to guardians only. You'll confirm the recipient count before sending."
      />
      <ComposeForm
        teams={teams}
        ageGroups={ageGroups}
        guardians={guardians}
        seasonName={activeSeason?.name ?? null}
        canBroadcast={staff}
        defaultKind={defaultKind}
        defaultTeamId={defaultTeamId}
      />
    </>
  );
}
