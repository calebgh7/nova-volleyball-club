"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={signOut}
      className="rounded-lg border border-nova-deep px-4 py-2 text-sm font-semibold text-nova-deep transition hover:bg-nova-deep hover:text-white"
    >
      Sign out
    </button>
  );
}
