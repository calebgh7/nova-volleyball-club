// Protected page. Middleware already redirects logged-out users to /login;
// this also reads the user's profile/role to confirm the DB wiring works.
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/Logo";
import { SignOutButton } from "./SignOutButton";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Read the role from the profiles table (created by schema.sql).
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="flex items-center justify-between border-b bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <Logo size={36} />
          <span className="font-bold text-nova-deep">Nova Volleyball Club</span>
        </div>
        <SignOutButton />
      </header>

      <section className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-2xl font-bold text-nova-deep">
          Welcome{profile?.full_name ? `, ${profile.full_name}` : ""}.
        </h1>
        <p className="mt-2 text-gray-600">
          You are signed in as{" "}
          <span className="font-semibold text-nova-violet">
            {profile?.role ?? "no role yet"}
          </span>
          .
        </p>

        <div className="mt-8 rounded-xl border bg-white p-6">
          <h2 className="font-semibold text-nova-deep">Phase 0 app shell</h2>
          <p className="mt-1 text-sm text-gray-600">
            Login works and the database is connected. Roster, scheduling,
            payments, and communication features arrive in later phases — see
            the project roadmap.
          </p>
        </div>
      </section>
    </main>
  );
}
