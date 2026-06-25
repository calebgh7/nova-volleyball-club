// Sent history (C6). Lists messages with audience, recipient count, sender, and
// timestamp. RLS scopes this: staff see all sends, coaches see their own.
import { requireUser, isStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, EmptyState, Badge, ButtonLink } from "@/components/ui";

export const dynamic = "force-dynamic";

interface MessageListRow {
  id: string;
  subject: string | null;
  audience_type: "team" | "season" | "club" | "custom";
  audience_ref: string | null;
  sent_at: string | null;
  created_at: string;
  message_recipients: { count: number }[];
  profiles: { full_name: string } | null;
}

const AUDIENCE_LABEL: Record<string, string> = {
  team: "Team",
  season: "Season",
  club: "Whole club",
  custom: "Selected",
};

function formatDate(iso: string | null): string {
  if (!iso) return "Draft";
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function MessagesPage() {
  const { profile } = await requireUser();
  const canCompose = isStaff(profile?.role) || profile?.role === "coach";
  const supabase = createClient();

  const { data } = await supabase
    .from("messages")
    .select(
      "id, subject, audience_type, audience_ref, sent_at, created_at, message_recipients(count), profiles(full_name)"
    )
    .order("created_at", { ascending: false });
  const messages = (data as unknown as MessageListRow[] | null) ?? [];

  // Resolve team names for team-targeted sends in one batch query.
  const teamRefs = messages
    .filter((m) => m.audience_type === "team" && m.audience_ref)
    .map((m) => m.audience_ref as string);
  const teamNames = new Map<string, string>();
  if (teamRefs.length > 0) {
    const { data: teams } = await supabase
      .from("teams")
      .select("id, name")
      .in("id", Array.from(new Set(teamRefs)));
    for (const t of (teams as { id: string; name: string }[] | null) ?? [])
      teamNames.set(t.id, t.name);
  }

  return (
    <>
      <PageHeader
        title="Messages"
        subtitle="Every send is recorded here."
        action={
          canCompose ? (
            <ButtonLink href="/dashboard/messages/new">Compose</ButtonLink>
          ) : undefined
        }
      />

      {messages.length === 0 ? (
        <EmptyState
          title="No messages sent yet"
          hint="Compose your first message to a team or the whole club."
          action={
            canCompose ? (
              <ButtonLink href="/dashboard/messages/new">Compose</ButtonLink>
            ) : undefined
          }
        />
      ) : (
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="py-2 pr-3 font-medium">Subject</th>
                <th className="py-2 pr-3 font-medium">Audience</th>
                <th className="py-2 pr-3 font-medium">Recipients</th>
                <th className="py-2 pr-3 font-medium">Sender</th>
                <th className="py-2 font-medium">Sent</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((m) => {
                const audience =
                  m.audience_type === "team" && m.audience_ref
                    ? teamNames.get(m.audience_ref) ?? "Team"
                    : AUDIENCE_LABEL[m.audience_type] ?? m.audience_type;
                return (
                  <tr key={m.id} className="border-b last:border-0 align-top">
                    <td className="py-2 pr-3 font-medium text-nova-deep">
                      {m.subject || "(no subject)"}
                    </td>
                    <td className="py-2 pr-3">
                      <Badge tone="violet">{audience}</Badge>
                    </td>
                    <td className="py-2 pr-3 text-gray-600">
                      {m.message_recipients?.[0]?.count ?? 0}
                    </td>
                    <td className="py-2 pr-3 text-gray-600">
                      {m.profiles?.full_name ?? "—"}
                    </td>
                    <td className="py-2 text-gray-600">{formatDate(m.sent_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
