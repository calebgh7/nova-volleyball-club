-- ============================================================================
-- Nova Volleyball Club — Database Schema (Workstream B / Phase 0)
-- Target: Supabase (PostgreSQL)
-- Source of truth: docs/data-model-spec.md
--
-- Apply via Supabase SQL Editor, or `supabase db push` with this as a migration.
-- Row-level security policies live in rls-policies.sql (apply AFTER this file).
--
-- Privacy decisions enforced here:
--   * No medical/health fields anywhere (emergency contact only)
--   * Players have no messaging contact fields (parent-only contact)
--   * Media consent tracked on players with grant/revoke timestamps
--   * audit_log table for sensitive-data access
-- ============================================================================

-- Needed for gen_random_uuid()
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
create type user_role           as enum ('director','admin','coach','parent');
create type division            as enum ('girls','boys','coed');
create type player_status       as enum ('active','tryout','inactive');
create type check_status        as enum ('pending','cleared','expired');
create type program_type        as enum ('club_season','camp','clinic','tournament');
create type membership_status   as enum ('active','tryout','dropped');
create type coach_role          as enum ('head','assistant');
create type event_type          as enum ('practice','game','tournament','meeting');
create type registration_status as enum ('started','submitted','complete','withdrawn');
create type payment_plan        as enum ('full','installments');
create type invoice_status      as enum ('open','partial','paid','void');
create type message_channel     as enum ('email','sms');
create type audience_type       as enum ('team','season','club','custom');
create type delivery_status     as enum ('queued','sent','delivered','failed');
create type document_type       as enum ('waiver','packet','policy','other');

-- ----------------------------------------------------------------------------
-- Reusable updated_at trigger
-- ----------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

-- ----------------------------------------------------------------------------
-- profiles  (extends Supabase auth.users)
-- ----------------------------------------------------------------------------
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        user_role not null,
  full_name   text not null,
  phone       text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_profiles_updated before update on profiles
  for each row execute function set_updated_at();

-- Auto-create a profile row whenever a new auth user signs up (default role
-- 'parent'; elevate to coach/admin/director manually). See auth-trigger.sql
-- for the standalone version + backfill.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, role, full_name)
  values (new.id, 'parent', coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- families
-- ----------------------------------------------------------------------------
create table families (
  id                  uuid primary key default gen_random_uuid(),
  family_name         text not null,
  primary_guardian_id uuid,   -- FK added after guardians table exists
  billing_email       text not null,
  address             text,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create trigger trg_families_updated before update on families
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- guardians
-- ----------------------------------------------------------------------------
create table guardians (
  id                   uuid primary key default gen_random_uuid(),
  family_id            uuid not null references families(id) on delete cascade,
  user_id              uuid references profiles(id) on delete set null,
  full_name            text not null,
  email                text not null,
  phone                text,
  relationship         text,
  is_emergency_contact boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create trigger trg_guardians_updated before update on guardians
  for each row execute function set_updated_at();

-- Now wire the families -> primary guardian FK
alter table families
  add constraint families_primary_guardian_fk
  foreign key (primary_guardian_id) references guardians(id) on delete set null;

-- ----------------------------------------------------------------------------
-- players   (NO medical data — emergency contact only)
-- ----------------------------------------------------------------------------
create table players (
  id                        uuid primary key default gen_random_uuid(),
  family_id                 uuid not null references families(id) on delete cascade,
  first_name                text not null,
  last_name                 text not null,
  birthdate                 date not null,
  gender_division           division not null,
  status                    player_status not null default 'tryout',
  emergency_contact_name    text,
  emergency_contact_phone   text,
  media_consent             boolean not null default false,
  media_consent_at          timestamptz,
  media_consent_revoked_at  timestamptz,
  photo_url                 text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);
create trigger trg_players_updated before update on players
  for each row execute function set_updated_at();
create index idx_players_family on players(family_id);

-- ----------------------------------------------------------------------------
-- coaches
-- ----------------------------------------------------------------------------
create table coaches (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references profiles(id) on delete cascade,
  full_name                text not null,
  email                    text not null,
  phone                    text,
  certifications           text,
  background_check_status  check_status not null default 'pending',
  is_active                boolean not null default true,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create trigger trg_coaches_updated before update on coaches
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- seasons / programs
-- ----------------------------------------------------------------------------
create table seasons (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  type               program_type not null default 'club_season',
  starts_on          date not null,
  ends_on            date not null,
  registration_open  boolean not null default false,
  is_active          boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check (ends_on >= starts_on)
);
create trigger trg_seasons_updated before update on seasons
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- teams
-- ----------------------------------------------------------------------------
create table teams (
  id           uuid primary key default gen_random_uuid(),
  season_id    uuid not null references seasons(id) on delete cascade,
  name         text not null,
  age_group    text not null,             -- configurable (e.g. "U16")
  division     division not null,
  skill_level  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger trg_teams_updated before update on teams
  for each row execute function set_updated_at();
create index idx_teams_season on teams(season_id);

-- ----------------------------------------------------------------------------
-- team_memberships  (player <-> team)
-- ----------------------------------------------------------------------------
create table team_memberships (
  id             uuid primary key default gen_random_uuid(),
  team_id        uuid not null references teams(id) on delete cascade,
  player_id      uuid not null references players(id) on delete cascade,
  jersey_number  int,
  position       text,
  status         membership_status not null default 'active',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (team_id, player_id)
);
create trigger trg_team_memberships_updated before update on team_memberships
  for each row execute function set_updated_at();
create index idx_membership_team   on team_memberships(team_id);
create index idx_membership_player on team_memberships(player_id);

-- ----------------------------------------------------------------------------
-- team_coaches  (coach <-> team)
-- ----------------------------------------------------------------------------
create table team_coaches (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references teams(id) on delete cascade,
  coach_id   uuid not null references coaches(id) on delete cascade,
  role       coach_role not null default 'head',
  created_at timestamptz not null default now(),
  unique (team_id, coach_id)
);
create index idx_team_coaches_team  on team_coaches(team_id);
create index idx_team_coaches_coach on team_coaches(coach_id);

-- ----------------------------------------------------------------------------
-- venues
-- ----------------------------------------------------------------------------
create table venues (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  address      text,
  court_count  int not null default 1,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger trg_venues_updated before update on venues
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- events
-- ----------------------------------------------------------------------------
create table events (
  id            uuid primary key default gen_random_uuid(),
  type          event_type not null,
  title         text not null,
  venue_id      uuid references venues(id) on delete set null,
  starts_at     timestamptz not null,
  ends_at       timestamptz not null,
  court_number  int,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (ends_at >= starts_at)
);
create trigger trg_events_updated before update on events
  for each row execute function set_updated_at();
create index idx_events_starts on events(starts_at);
create index idx_events_venue  on events(venue_id);

-- ----------------------------------------------------------------------------
-- event_teams  (event <-> team)
-- ----------------------------------------------------------------------------
create table event_teams (
  event_id uuid not null references events(id) on delete cascade,
  team_id  uuid not null references teams(id) on delete cascade,
  primary key (event_id, team_id)
);

-- ----------------------------------------------------------------------------
-- registrations
-- ----------------------------------------------------------------------------
create table registrations (
  id                  uuid primary key default gen_random_uuid(),
  player_id           uuid not null references players(id) on delete cascade,
  season_id           uuid not null references seasons(id) on delete cascade,
  status              registration_status not null default 'started',
  waiver_signed       boolean not null default false,
  waiver_document_id  uuid,   -- FK added after documents table
  forms_complete      boolean not null default false,
  fee_amount          numeric(10,2) not null default 0,
  registered_at       timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (player_id, season_id)
);
create trigger trg_registrations_updated before update on registrations
  for each row execute function set_updated_at();
create index idx_registrations_player on registrations(player_id);
create index idx_registrations_season on registrations(season_id);

-- ----------------------------------------------------------------------------
-- invoices
-- ----------------------------------------------------------------------------
create table invoices (
  id                 uuid primary key default gen_random_uuid(),
  registration_id    uuid not null references registrations(id) on delete cascade,
  family_id          uuid not null references families(id) on delete cascade,
  amount_due         numeric(10,2) not null,
  due_date           date,
  plan               payment_plan not null default 'full',
  status             invoice_status not null default 'open',
  stripe_invoice_id  text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create trigger trg_invoices_updated before update on invoices
  for each row execute function set_updated_at();
create index idx_invoices_family on invoices(family_id);

-- ----------------------------------------------------------------------------
-- payments
-- ----------------------------------------------------------------------------
create table payments (
  id                 uuid primary key default gen_random_uuid(),
  invoice_id         uuid not null references invoices(id) on delete cascade,
  amount             numeric(10,2) not null,
  method             text,
  stripe_payment_id  text,
  paid_at            timestamptz not null default now(),
  created_at         timestamptz not null default now()
);
create index idx_payments_invoice on payments(invoice_id);

-- ----------------------------------------------------------------------------
-- documents
-- ----------------------------------------------------------------------------
create table documents (
  id                 uuid primary key default gen_random_uuid(),
  type               document_type not null,
  title              text not null,
  url                text not null,
  related_player_id  uuid references players(id) on delete set null,
  created_at         timestamptz not null default now()
);

-- Now wire registrations -> waiver document FK
alter table registrations
  add constraint registrations_waiver_doc_fk
  foreign key (waiver_document_id) references documents(id) on delete set null;

-- ----------------------------------------------------------------------------
-- media  (gated by player media_consent before public use)
-- ----------------------------------------------------------------------------
create table media (
  id         uuid primary key default gen_random_uuid(),
  url        text not null,
  team_id    uuid references teams(id) on delete set null,
  player_id  uuid references players(id) on delete set null,
  caption    text,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- messages  (audience resolves to guardians, never players)
-- ----------------------------------------------------------------------------
create table messages (
  id              uuid primary key default gen_random_uuid(),
  sender_user_id  uuid not null references profiles(id),
  channel         message_channel not null,
  audience_type   audience_type not null,
  audience_ref    uuid,
  subject         text,
  body            text not null,
  sent_at         timestamptz,
  created_at      timestamptz not null default now()
);
create index idx_messages_sent on messages(sent_at);

create table message_recipients (
  id               uuid primary key default gen_random_uuid(),
  message_id       uuid not null references messages(id) on delete cascade,
  guardian_id      uuid not null references guardians(id) on delete cascade,
  delivery_status  delivery_status not null default 'queued'
);
create index idx_msg_recipients_message on message_recipients(message_id);

-- ----------------------------------------------------------------------------
-- audit_log  (sensitive-data access trail)
-- ----------------------------------------------------------------------------
create table audit_log (
  id             uuid primary key default gen_random_uuid(),
  actor_user_id  uuid references profiles(id),
  action         text not null,        -- view | create | update | delete | export
  entity         text not null,        -- table name
  entity_id      uuid,
  sensitive      boolean not null default false,
  occurred_at    timestamptz not null default now()
);
create index idx_audit_actor on audit_log(actor_user_id);
create index idx_audit_entity on audit_log(entity, entity_id);

-- ============================================================================
-- End of schema. Apply rls-policies.sql next to enable access control.
-- ============================================================================
