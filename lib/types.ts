// Shared domain types for the Nova Volleyball Club app.
// These mirror the database schema (see docs/data-model-spec.md). Supabase-js
// returns loosely-typed rows, so these give us hand-written safety at the edges.

export type Role = "director" | "admin" | "coach" | "parent";
export type Division = "girls" | "boys" | "coed";
export type PlayerStatus = "active" | "tryout" | "inactive";
export type MembershipStatus = "active" | "tryout" | "dropped";
export type CoachRole = "head" | "assistant";
export type AudienceType = "team" | "season" | "club" | "custom";

export interface Profile {
  id: string;
  role: Role;
  full_name: string;
  phone: string | null;
  is_active: boolean;
}

export interface Season {
  id: string;
  name: string;
  type: string;
  starts_on: string;
  ends_on: string;
  registration_open: boolean;
  is_active: boolean;
}

export interface Team {
  id: string;
  season_id: string;
  name: string;
  age_group: string;
  division: Division;
  skill_level: string | null;
}

export interface Family {
  id: string;
  family_name: string;
  primary_guardian_id: string | null;
  billing_email: string;
  address: string | null;
  notes: string | null;
}

export interface Guardian {
  id: string;
  family_id: string;
  user_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  relationship: string | null;
  is_emergency_contact: boolean;
}

export interface Player {
  id: string;
  family_id: string;
  first_name: string;
  last_name: string;
  birthdate: string;
  gender_division: Division;
  status: PlayerStatus;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  media_consent: boolean;
}

export interface Coach {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  background_check_status: string;
  is_active: boolean;
}

export interface TeamMembership {
  id: string;
  team_id: string;
  player_id: string;
  jersey_number: number | null;
  position: string | null;
  status: MembershipStatus;
}

export interface MessageRow {
  id: string;
  sender_user_id: string;
  channel: string;
  audience_type: AudienceType;
  audience_ref: string | null;
  subject: string | null;
  body: string;
  sent_at: string | null;
  created_at: string;
}

// Helpers shared across screens.
export const DIVISION_LABEL: Record<Division, string> = {
  girls: "Girls",
  boys: "Boys",
  coed: "Coed",
};

export function ageFromBirthdate(birthdate: string): number {
  const dob = new Date(birthdate);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age -= 1;
  return age;
}
