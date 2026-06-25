"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { SEASON_COOKIE } from "@/lib/season";

/** Persist the selected season for this browser, then refresh the dashboard. */
export async function setSeasonAction(seasonId: string) {
  cookies().set(SEASON_COOKIE, seasonId, {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/dashboard", "layout");
}
