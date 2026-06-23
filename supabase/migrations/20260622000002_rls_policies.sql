-- ============================================================================
-- Nova Volleyball Club — Row-Level Security Policies (Workstream B4)
-- Target: Supabase (PostgreSQL). Apply AFTER schema.sql.
--
-- Enforces the access model from docs/domains/admin-and-roles.md:
--   * Director  : full access; only role allowed to export
--   * Admin     : operational access (all club data)
--   * Coach     : their own assigned teams only
--   * Parent    : their own family only
--   * Parent-only contact, no-medical, and consent rules are enforced by
--     schema design + app logic; these policies enforce who can SEE/EDIT rows.
--
-- NOTE: These are a solid starting set covering the main tables. Review and
-- extend per table as features land. Test with real accounts before go-live.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER to avoid RLS recursion on profiles)
-- ----------------------------------------------------------------------------
create or replace function auth_role()
returns user_role language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function is_director()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(auth_role() = 'director', false);
$$;

create or replace function is_staff()   -- director or admin
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(auth_role() in ('director','admin'), false);
$$;

-- Is the current user a guardian belonging to this family?
create or replace function is_my_family(fam uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from guardians g
    where g.family_id = fam and g.user_id = auth.uid()
  );
$$;

-- Does the current user coach this team?
create or replace function coaches_team(t uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from team_coaches tc
    join coaches c on c.id = tc.coach_id
    where tc.team_id = t and c.user_id = auth.uid()
  );
$$;

-- Is this player on a team the current user coaches?
create or replace function coaches_player(p uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from team_memberships tm
    join team_coaches tc on tc.team_id = tm.team_id
    join coaches c on c.id = tc.coach_id
    where tm.player_id = p and c.user_id = auth.uid()
  );
$$;

-- ----------------------------------------------------------------------------
-- Enable RLS on all tables
-- ----------------------------------------------------------------------------
alter table profiles            enable row level security;
alter table families            enable row level security;
alter table guardians           enable row level security;
alter table players             enable row level security;
alter table coaches             enable row level security;
alter table seasons             enable row level security;
alter table teams               enable row level security;
alter table team_memberships    enable row level security;
alter table team_coaches        enable row level security;
alter table venues              enable row level security;
alter table events              enable row level security;
alter table event_teams         enable row level security;
alter table registrations       enable row level security;
alter table invoices            enable row level security;
alter table payments            enable row level security;
alter table documents           enable row level security;
alter table media               enable row level security;
alter table messages            enable row level security;
alter table message_recipients  enable row level security;
alter table audit_log           enable row level security;

-- ----------------------------------------------------------------------------
-- profiles: a user sees/edits own row; staff see all; director manages all
-- ----------------------------------------------------------------------------
create policy profiles_self_read on profiles
  for select using (id = auth.uid() or is_staff());
create policy profiles_self_update on profiles
  for update using (id = auth.uid() or is_director());
create policy profiles_staff_write on profiles
  for all using (is_director()) with check (is_director());

-- ----------------------------------------------------------------------------
-- families: staff all; parents only their own
-- ----------------------------------------------------------------------------
create policy families_staff on families
  for all using (is_staff()) with check (is_staff());
create policy families_parent_read on families
  for select using (is_my_family(id));
create policy families_parent_update on families
  for update using (is_my_family(id)) with check (is_my_family(id));

-- ----------------------------------------------------------------------------
-- guardians: staff all; parents their own family's guardians
-- ----------------------------------------------------------------------------
create policy guardians_staff on guardians
  for all using (is_staff()) with check (is_staff());
create policy guardians_parent_read on guardians
  for select using (is_my_family(family_id));
create policy guardians_parent_update on guardians
  for update using (is_my_family(family_id)) with check (is_my_family(family_id));

-- ----------------------------------------------------------------------------
-- players: staff all; parents own family; coaches read their team's players
-- ----------------------------------------------------------------------------
create policy players_staff on players
  for all using (is_staff()) with check (is_staff());
create policy players_parent_read on players
  for select using (is_my_family(family_id));
create policy players_parent_update on players
  for update using (is_my_family(family_id)) with check (is_my_family(family_id));
create policy players_coach_read on players
  for select using (coaches_player(id));

-- ----------------------------------------------------------------------------
-- coaches: staff manage; a coach reads own record
-- ----------------------------------------------------------------------------
create policy coaches_staff on coaches
  for all using (is_staff()) with check (is_staff());
create policy coaches_self_read on coaches
  for select using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- seasons & venues: readable by all authenticated; writable by staff
-- ----------------------------------------------------------------------------
create policy seasons_read on seasons
  for select using (auth.uid() is not null);
create policy seasons_staff_write on seasons
  for all using (is_staff()) with check (is_staff());

create policy venues_read on venues
  for select using (auth.uid() is not null);
create policy venues_staff_write on venues
  for all using (is_staff()) with check (is_staff());

-- ----------------------------------------------------------------------------
-- teams: staff manage; coaches read own teams; parents read teams their
--        players are on; (broad read of team names is acceptable here)
-- ----------------------------------------------------------------------------
create policy teams_staff on teams
  for all using (is_staff()) with check (is_staff());
create policy teams_coach_read on teams
  for select using (coaches_team(id));
create policy teams_parent_read on teams
  for select using (exists (
    select 1 from team_memberships tm
    join players p on p.id = tm.player_id
    where tm.team_id = teams.id and is_my_family(p.family_id)
  ));

-- ----------------------------------------------------------------------------
-- team_memberships: staff manage; coach reads own team; parent reads own player
-- ----------------------------------------------------------------------------
create policy memberships_staff on team_memberships
  for all using (is_staff()) with check (is_staff());
create policy memberships_coach_read on team_memberships
  for select using (coaches_team(team_id));
create policy memberships_parent_read on team_memberships
  for select using (exists (
    select 1 from players p
    where p.id = team_memberships.player_id and is_my_family(p.family_id)
  ));

-- ----------------------------------------------------------------------------
-- team_coaches: staff manage; coach reads own assignments
-- ----------------------------------------------------------------------------
create policy team_coaches_staff on team_coaches
  for all using (is_staff()) with check (is_staff());
create policy team_coaches_self_read on team_coaches
  for select using (coaches_team(team_id));

-- ----------------------------------------------------------------------------
-- events & event_teams: staff manage; coaches and parents read events for
-- teams they're connected to
-- ----------------------------------------------------------------------------
create policy events_staff on events
  for all using (is_staff()) with check (is_staff());
create policy events_team_read on events
  for select using (exists (
    select 1 from event_teams et
    where et.event_id = events.id
      and (
        coaches_team(et.team_id)
        or exists (
          select 1 from team_memberships tm
          join players p on p.id = tm.player_id
          where tm.team_id = et.team_id and is_my_family(p.family_id)
        )
      )
  ));

create policy event_teams_staff on event_teams
  for all using (is_staff()) with check (is_staff());
create policy event_teams_read on event_teams
  for select using (
    coaches_team(team_id)
    or exists (
      select 1 from team_memberships tm
      join players p on p.id = tm.player_id
      where tm.team_id = event_teams.team_id and is_my_family(p.family_id)
    )
  );

-- ----------------------------------------------------------------------------
-- registrations: staff all; parents their own players' registrations
-- ----------------------------------------------------------------------------
create policy registrations_staff on registrations
  for all using (is_staff()) with check (is_staff());
create policy registrations_parent on registrations
  for all using (exists (
    select 1 from players p
    where p.id = registrations.player_id and is_my_family(p.family_id)
  )) with check (exists (
    select 1 from players p
    where p.id = registrations.player_id and is_my_family(p.family_id)
  ));

-- ----------------------------------------------------------------------------
-- invoices & payments (FINANCIAL): staff all; parents read their family only.
-- Parents never write financial rows directly (Stripe/webhooks via service role).
-- ----------------------------------------------------------------------------
create policy invoices_staff on invoices
  for all using (is_staff()) with check (is_staff());
create policy invoices_parent_read on invoices
  for select using (is_my_family(family_id));

create policy payments_staff on payments
  for all using (is_staff()) with check (is_staff());
create policy payments_parent_read on payments
  for select using (exists (
    select 1 from invoices i
    where i.id = payments.invoice_id and is_my_family(i.family_id)
  ));

-- ----------------------------------------------------------------------------
-- documents: staff all; parents read docs tied to their own players
-- ----------------------------------------------------------------------------
create policy documents_staff on documents
  for all using (is_staff()) with check (is_staff());
create policy documents_parent_read on documents
  for select using (
    related_player_id is not null and exists (
      select 1 from players p
      where p.id = documents.related_player_id and is_my_family(p.family_id)
    )
  );

-- ----------------------------------------------------------------------------
-- media: staff all; coaches/parents read media for connected teams/players
-- ----------------------------------------------------------------------------
create policy media_staff on media
  for all using (is_staff()) with check (is_staff());
create policy media_read on media
  for select using (
    (team_id is not null and coaches_team(team_id))
    or (player_id is not null and (coaches_player(player_id) or exists (
         select 1 from players p
         where p.id = media.player_id and is_my_family(p.family_id))))
  );

-- ----------------------------------------------------------------------------
-- messages: staff manage and send; coaches send to their own teams.
-- (Recipients are always guardians — enforced in app logic when resolving
--  audiences; players are never recipients.)
-- ----------------------------------------------------------------------------
create policy messages_staff on messages
  for all using (is_staff()) with check (is_staff());
create policy messages_coach on messages
  for all using (
    sender_user_id = auth.uid()
    and (audience_type <> 'team' or coaches_team(audience_ref))
  ) with check (
    sender_user_id = auth.uid()
    and (audience_type <> 'team' or coaches_team(audience_ref))
  );

create policy message_recipients_staff on message_recipients
  for all using (is_staff()) with check (is_staff());
create policy message_recipients_read on message_recipients
  for select using (exists (
    select 1 from messages m where m.id = message_recipients.message_id
      and m.sender_user_id = auth.uid()
  ) or is_staff());

-- ----------------------------------------------------------------------------
-- audit_log: only the director may read; inserts happen via service role / app.
-- (No client-side updates or deletes — the trail is append-only.)
-- ----------------------------------------------------------------------------
create policy audit_director_read on audit_log
  for select using (is_director());

-- ============================================================================
-- Export restriction & 2FA reminders (enforced in the application layer):
--   * Only the Director can trigger a full data export (gate the export
--     endpoint on is_director() and log it to audit_log with action='export').
--   * Require 2FA for director/admin logins in Supabase Auth (MFA) settings.
--   * Stripe webhooks and bulk sends run with the service role, which bypasses
--     RLS by design — keep that key server-side only.
-- ============================================================================
