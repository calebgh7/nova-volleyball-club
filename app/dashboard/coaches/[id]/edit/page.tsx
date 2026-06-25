import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { CoachForm, type CoachValues } from "../../CoachForm";
import { updateCoach } from "../../actions";

export const dynamic = "force-dynamic";

export default async function EditCoachPage({
  params,
}: {
  params: { id: string };
}) {
  await requireStaff();
  const supabase = createClient();

  const { data } = await supabase
    .from("coaches")
    .select("id, full_name, email, phone, certifications, background_check_status, is_active")
    .eq("id", params.id)
    .maybeSingle();

  if (!data) notFound();
  const coach = data as unknown as CoachValues & { id: string };

  const updateThisCoach = updateCoach.bind(null, params.id);

  return (
    <>
      <PageHeader title="Edit coach" subtitle={coach.full_name} />
      <CoachForm action={updateThisCoach} coach={coach} submitLabel="Save changes" />
    </>
  );
}
