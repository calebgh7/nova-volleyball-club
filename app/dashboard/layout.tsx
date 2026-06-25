// Shared layout for the authenticated club app: header + role-aware sidebar +
// season selector. Middleware already guards the /dashboard prefix; here we
// load the profile/role to decide which nav items to show.
import type { ReactNode } from "react";
import { Logo } from "@/components/Logo";
import { requireUser, isStaff } from "@/lib/auth";
import { getSeasons, getActiveSeason } from "@/lib/season";
import { SignOutButton } from "./SignOutButton";
import { SeasonSelector } from "./SeasonSelector";
import { NavLinks, type NavItem } from "./NavLinks";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { profile } = await requireUser();
  const staff = isStaff(profile?.role);

  const [seasons, activeSeason] = await Promise.all([
    getSeasons(),
    getActiveSeason(),
  ]);

  // Coaches get a trimmed nav (their teams + roster, read-only). Staff get all.
  const nav: NavItem[] = [
    { href: "/dashboard", label: "Overview" },
    { href: "/dashboard/teams", label: "Teams" },
  ];
  if (staff) {
    nav.push(
      { href: "/dashboard/players", label: "Players" },
      { href: "/dashboard/families", label: "Families" },
      { href: "/dashboard/coaches", label: "Coaches" }
    );
  }
  if (staff || profile?.role === "coach") {
    nav.push({ href: "/dashboard/messages", label: "Messages" });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center justify-between border-b bg-white px-6 py-3">
        <div className="flex items-center gap-3">
          <Logo size={32} />
          <span className="font-bold text-nova-deep">Nova Volleyball Club</span>
        </div>
        <div className="flex items-center gap-4">
          <SeasonSelector
            seasons={seasons}
            activeSeasonId={activeSeason?.id ?? null}
          />
          <SignOutButton />
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl gap-6 px-6 py-8">
        <aside className="w-48 shrink-0">
          <NavLinks items={nav} />
          <p className="mt-6 px-3 text-xs uppercase tracking-wide text-gray-400">
            {profile?.role ?? "—"}
          </p>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
