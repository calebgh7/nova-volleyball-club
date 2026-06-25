import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { PlayerForm, type FamilyOption } from "../PlayerForm";
import { createPlayer } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewPlayerPage() {
  await requireStaff();
  const supabase = createClient();

  const { data } = await supabase
    .from("families")
    .select("id, family_name")
    .order("family_name");
  const families: FamilyOption[] = (
    (data as { id: string; family_name: string }[] | null) ?? []
  ).map((f) => ({ id: f.id, label: f.family_name }));

  return (
    <>
      <PageHeader
        title="New player"
        subtitle="Add a player and link them to a family (existing or new)."
      />
      <PlayerForm
        action={createPlayer}
        families={families}
        submitLabel="Create player"
        allowNewFamily
      />
    </>
  );
}
