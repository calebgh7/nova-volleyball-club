// Families list (B4) — staff only.
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

interface FamilyRow {
  id: string;
  family_name: string;
  billing_email: string;
  players: { count: number }[];
  guardians: { count: number }[];
}

export default async function FamiliesPage() {
  await requireStaff();
  const supabase = createClient();

  const { data } = await supabase
    .from("families")
    .select("id, family_name, billing_email, players(count), guardians(count)")
    .order("family_name");
  const families = (data as unknown as FamilyRow[] | null) ?? [];

  return (
    <>
      <PageHeader title="Families" subtitle={`${families.length} households`} />

      {families.length === 0 ? (
        <EmptyState
          title="No families yet"
          hint="Families are created when you add a player with a new family, or via the seed data."
        />
      ) : (
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="py-2 pr-3 font-medium">Family</th>
                <th className="py-2 pr-3 font-medium">Billing email</th>
                <th className="py-2 pr-3 font-medium">Players</th>
                <th className="py-2 font-medium">Guardians</th>
              </tr>
            </thead>
            <tbody>
              {families.map((f) => (
                <tr key={f.id} className="border-b last:border-0">
                  <td className="py-2 pr-3">
                    <Link
                      href={`/dashboard/families/${f.id}`}
                      className="font-medium text-nova-deep hover:underline"
                    >
                      {f.family_name}
                    </Link>
                  </td>
                  <td className="py-2 pr-3 text-gray-600">{f.billing_email}</td>
                  <td className="py-2 pr-3 text-gray-600">{f.players?.[0]?.count ?? 0}</td>
                  <td className="py-2 text-gray-600">{f.guardians?.[0]?.count ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
