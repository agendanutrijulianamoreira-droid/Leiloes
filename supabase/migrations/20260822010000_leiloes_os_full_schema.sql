-- ============================================================================
-- Leilões OS — full relational schema
-- ============================================================================
-- Investment operating system for auction opportunities. This migration
-- replaces the local-storage MVP with a Supabase/PostgreSQL schema that is
-- workspace/tenant aware, keeps a full audit trail of financial and
-- decision-relevant changes, and never automates a bid, payment or legal
-- act — every write here records data or a human decision, it does not
-- execute one.
--
-- Sections (kept re-runnable / idempotent where PostgreSQL allows it):
--   1. Extensions
--   2. Enum types
--   3. Base tables (workspaces, profiles, workspace_members)
--   4. Operational tables (radar → opportunity → diligence → valuation →
--      committee → calendar → post-auction → portfolio → audit/files/ai)
--   5. Functions (updated_at, workspace membership, audit log, diligence
--      completion, document immutability guard)
--   6. Triggers
--   7. Views
--   8. Row Level Security (RLS) policies
--   9. Indexes
--
-- NOTE: Views and functions are created before triggers/RLS for dependency
-- reasons, even though the section order above follows the order requested
-- in the product brief.
-- ============================================================================


-- ============================================================================
-- 1. EXTENSIONS
-- ============================================================================

create extension if not exists pgcrypto;


-- ============================================================================
-- 2. ENUM TYPES
-- ============================================================================

do $$ begin
  create type public.auction_status as enum (
    'new', 'screening', 'due_diligence', 'valuation', 'committee', 'pre_bid',
    'auction', 'won', 'lost', 'regularization', 'renovation', 'sale',
    'rental', 'closed', 'rejected'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.risk_level as enum ('low', 'medium', 'high', 'critical');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.investment_decision as enum (
    'A_APPROVE', 'B_LIMITED', 'C_MONITOR', 'D_REJECT', 'BLOCKED'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.diligence_status as enum ('pending', 'confirmed', 'warning', 'blocked');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.radar_status as enum ('watching', 'triage', 'promoted', 'discarded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.radar_source_type as enum (
    'leiloeiro', 'site', 'email', 'edital', 'indicacao', 'outro'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.calendar_event_status as enum ('pending', 'done', 'late', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.calendar_event_kind as enum (
    'review', 'document', 'decision', 'auction', 'post_auction', 'payment',
    'regularization', 'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.post_auction_outcome as enum ('pending', 'won', 'lost', 'not_participated');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.post_auction_stage as enum (
    'resultado', 'pagamento', 'regularizacao', 'posse', 'reforma',
    'venda_locacao', 'encerrado'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.exit_strategy as enum ('revenda', 'locacao', 'hold', 'indefinida');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.document_type as enum (
    'edital', 'matricula', 'certidao', 'processo', 'laudo', 'contrato',
    'comprovante', 'planilha', 'foto', 'outro'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.ai_report_type as enum (
    'extraction', 'risk_analysis', 'market_research', 'document_comparison',
    'valuation_review', 'committee_support', 'other'
  );
exception when duplicate_object then null; end $$;

-- Not part of the requested enum list, but required to support
-- workspaces/tenants with role-aware RLS.
do $$ begin
  create type public.workspace_role as enum ('owner', 'admin', 'analyst', 'viewer');
exception when duplicate_object then null; end $$;


-- ============================================================================
-- 3. BASE TABLES — workspaces / profiles / membership
-- ============================================================================

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  owner_id uuid not null references auth.users(id) on delete restrict,
  plan text not null default 'solo',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  avatar_url text,
  locale text not null default 'pt-BR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.workspace_role not null default 'analyst',
  invited_email text,
  status text not null default 'active' check (status in ('active', 'invited', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);


-- ============================================================================
-- 4. OPERATIONAL TABLES
-- ============================================================================

-- RADAR — raw leads before they become a tracked opportunity.
create table if not exists public.radar_leads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  source_name text not null,
  source_type public.radar_source_type not null default 'site',
  url text,
  city text,
  state text,
  asset_type text not null default 'Ativo em leilão',
  estimated_market_value numeric(14, 2) not null default 0 check (estimated_market_value >= 0),
  opening_bid numeric(14, 2) not null default 0 check (opening_bid >= 0),
  auction_date timestamptz,
  status public.radar_status not null default 'watching',
  priority text not null default 'media' check (priority in ('baixa', 'media', 'alta')),
  notes text,
  promoted_opportunity_id uuid,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- OPPORTUNITY — the deal "mother record". Deliberately holds asset
-- attributes inline (no separate assets table) to match the required
-- table list; it is the single row every other operational table hangs off.
create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  radar_lead_id uuid references public.radar_leads(id) on delete set null,
  deal_code text not null,
  title text not null,
  asset_type text not null default 'Ativo em leilão',
  address text,
  city text,
  state text,
  registration_number text,
  process_number text,
  area_m2 numeric(12, 2),
  occupancy_status text not null default 'Não confirmado',
  auctioneer text,
  source_url text,
  status public.auction_status not null default 'new',
  first_date timestamptz,
  second_date timestamptz,
  opening_bid numeric(14, 2),
  current_bid numeric(14, 2) not null default 0 check (current_bid >= 0),
  increment numeric(14, 2),
  commission_pct numeric(5, 2) not null default 5 check (commission_pct >= 0),
  payment_terms text,
  -- Denormalized "current" valuation snapshot for fast dashboard reads.
  -- The authoritative, audited history lives in `valuations`.
  market_conservative numeric(14, 2) not null default 0 check (market_conservative >= 0),
  market_base numeric(14, 2) not null default 0 check (market_base >= 0),
  market_optimistic numeric(14, 2) not null default 0 check (market_optimistic >= 0),
  market_value_source text,
  market_value_consulted_at timestamptz,
  total_cost_estimate numeric(14, 2),
  max_bid_absolute numeric(14, 2) not null default 0 check (max_bid_absolute >= 0),
  max_bid_recommended numeric(14, 2) not null default 0,
  comfort_bid numeric(14, 2) not null default 0,
  base_roi_pct numeric(6, 2),
  opportunity_score integer check (opportunity_score between 0 and 100),
  risk public.risk_level not null default 'medium',
  confidence_score integer not null default 0 check (confidence_score between 0 and 100),
  decision public.investment_decision not null default 'C_MONITOR',
  decision_reason text,
  next_milestone text,
  next_milestone_date timestamptz,
  main_risk text,
  main_upside text,
  blockers text[] not null default '{}',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, deal_code)
);

alter table public.radar_leads
  drop constraint if exists radar_leads_promoted_opportunity_id_fkey,
  add constraint radar_leads_promoted_opportunity_id_fkey
    foreign key (promoted_opportunity_id) references public.opportunities(id) on delete set null;

-- DOCUMENTS — original source documents (edital, matrícula, processo...).
-- Rows are never overwritten: a new file becomes a new row, optionally
-- chained via version_of_document_id. See fn_prevent_document_mutation().
create table if not exists public.opportunity_documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  document_type public.document_type not null,
  file_name text not null,
  drive_file_id text,
  storage_path text,
  source_url text,
  mime_type text,
  size_bytes bigint,
  is_original boolean not null default true,
  content_hash text,
  version_of_document_id uuid references public.opportunity_documents(id),
  extracted_text text,
  extracted_at timestamptz,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- DUE DILIGENCE — checklist items that gate committee approval.
create table if not exists public.diligence_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  category text not null,
  item text not null,
  status public.diligence_status not null default 'pending',
  evidence text,
  source_document_id uuid references public.opportunity_documents(id) on delete set null,
  risk public.risk_level not null default 'medium',
  is_critical boolean not null default false,
  notes text,
  checked_by uuid references auth.users(id),
  checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (opportunity_id, category, item)
);

-- VALUATIONS — every save is a new immutable row (audit trail of
-- assumptions). `is_current` flags the row currently mirrored onto
-- opportunities.* for fast reads. Source + consultation date are mandatory:
-- market value can never be inferred from the edital automatically.
create table if not exists public.valuations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  market_conservative numeric(14, 2),
  market_base numeric(14, 2) not null check (market_base >= 0),
  market_optimistic numeric(14, 2),
  market_value_source text not null,
  market_value_consulted_at timestamptz not null default now(),
  commission_pct numeric(5, 2) not null default 5,
  itbi numeric(14, 2) not null default 0,
  registry numeric(14, 2) not null default 0,
  legal numeric(14, 2) not null default 0,
  debts numeric(14, 2) not null default 0,
  renovation numeric(14, 2) not null default 0,
  possession numeric(14, 2) not null default 0,
  financing_cost numeric(14, 2) not null default 0,
  contingency_pct numeric(5, 2) not null default 10,
  target_roi_pct numeric(6, 2) not null default 25,
  fixed_costs numeric(14, 2),
  contingency_amount numeric(14, 2),
  total_costs_excluding_bid numeric(14, 2),
  max_bid_absolute numeric(14, 2),
  max_bid_recommended numeric(14, 2),
  comfort_bid numeric(14, 2),
  assumptions jsonb not null default '{}'::jsonb,
  is_current boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.valuation_scenarios (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  valuation_id uuid not null references public.valuations(id) on delete cascade,
  scenario text not null check (scenario in ('pessimistic', 'base', 'optimistic')),
  bid numeric(14, 2),
  exit_value numeric(14, 2),
  additional_costs numeric(14, 2),
  total_cost numeric(14, 2),
  profit numeric(14, 2),
  roi_pct numeric(6, 2),
  months_to_exit numeric(5, 1),
  annualized_roi_pct numeric(6, 2),
  assumptions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (valuation_id, scenario)
);

-- COMMITTEE — formal decision memos. Immutable history, `is_current` flags
-- the latest. The final bid decision is always this human record, never AI.
create table if not exists public.committee_memos (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  decision public.investment_decision not null,
  thesis text,
  rationale text,
  risk_notes text,
  hard_blockers text[] not null default '{}',
  approved_by_user_id uuid references auth.users(id),
  approved_by_name text,
  is_current boolean not null default true,
  decided_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- CALENDAR — operational milestones (D-7 review, decision day, payment...).
create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  title text not null,
  kind public.calendar_event_kind not null,
  due_at timestamptz not null,
  status public.calendar_event_status not null default 'pending',
  description text,
  completed_at timestamptz,
  google_calendar_event_id text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- POST-AUCTION — actual result and real costs, one row per opportunity.
create table if not exists public.post_auction_records (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  opportunity_id uuid not null unique references public.opportunities(id) on delete cascade,
  outcome public.post_auction_outcome not null default 'pending',
  stage public.post_auction_stage not null default 'resultado',
  final_bid numeric(14, 2) not null default 0,
  auctioneer_fee numeric(14, 2) not null default 0,
  itbi numeric(14, 2) not null default 0,
  registry numeric(14, 2) not null default 0,
  legal numeric(14, 2) not null default 0,
  debts numeric(14, 2) not null default 0,
  renovation numeric(14, 2) not null default 0,
  possession numeric(14, 2) not null default 0,
  financial_cost numeric(14, 2) not null default 0,
  other_costs numeric(14, 2) not null default 0,
  actual_exit_value numeric(14, 2) not null default 0,
  exit_strategy public.exit_strategy not null default 'indefinida',
  paid_at timestamptz,
  regularized_at timestamptz,
  possession_at timestamptz,
  sold_or_rented_at timestamptz,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- PORTFOLIO — one settings row per workspace + a dated snapshot history.
create table if not exists public.portfolio_settings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces(id) on delete cascade,
  starting_net_worth numeric(14, 2) not null default 0,
  liquid_capital numeric(14, 2) not null default 0,
  reserve_capital numeric(14, 2) not null default 0,
  max_allocation_per_deal_pct numeric(5, 2) not null default 20,
  notes text,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.portfolio_snapshots (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  snapshot_date date not null default current_date,
  gross_assets numeric(14, 2),
  net_worth numeric(14, 2),
  liquid_capital numeric(14, 2),
  committed_capital numeric(14, 2),
  capital_at_risk numeric(14, 2),
  debt numeric(14, 2),
  realized_profit numeric(14, 2),
  unrealized_profit numeric(14, 2),
  monitored_value numeric(14, 2),
  available_to_deploy numeric(14, 2),
  active_deals integer,
  won_deals integer,
  closed_deals integer,
  average_roi_pct numeric(6, 2),
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (workspace_id, snapshot_date)
);

-- FILES — generic polymorphic attachment registry for entities that are not
-- auction documents (radar leads, committee memo attachments, post-auction
-- receipts...). Auction source documents belong in opportunity_documents.
create table if not exists public.files_metadata (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  file_name text not null,
  drive_file_id text,
  storage_path text,
  source_url text,
  mime_type text,
  size_bytes bigint,
  content_hash text,
  is_original boolean not null default true,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- AI REPORTS — advisory only. Never applied automatically: is_applied stays
-- false until a human reviews the output (reviewed_by / reviewed_at).
create table if not exists public.ai_reports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  opportunity_id uuid references public.opportunities(id) on delete cascade,
  report_type public.ai_report_type not null,
  model text,
  prompt_version text,
  input_summary jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  output_text text,
  confidence_score integer check (confidence_score between 0 and 100),
  sources jsonb not null default '[]'::jsonb,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  is_applied boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- AUDIT LOG — append-only. Populated by triggers only (see section 6),
-- never written directly by the application.
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  table_name text not null,
  record_id uuid not null,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  actor_id uuid references auth.users(id),
  changed_fields text[],
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);


-- ============================================================================
-- 5. FUNCTIONS
-- ============================================================================

-- Generic updated_at maintenance.
create or replace function public.fn_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Auto-provision a profile row whenever a new auth user is created.
create or replace function public.fn_handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Auto-provision the creator as an 'owner' member of a new workspace.
create or replace function public.fn_handle_new_workspace()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.workspace_members (workspace_id, user_id, role, status)
  values (new.id, new.owner_id, 'owner', 'active')
  on conflict (workspace_id, user_id) do nothing;
  return new;
end;
$$;

-- Workspace membership check used throughout RLS policies.
create or replace function public.is_workspace_member(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
  );
$$;

-- Caller's role in a workspace, or null if not a member.
create or replace function public.workspace_role_of(p_workspace_id uuid)
returns public.workspace_role
language sql
stable
security definer
set search_path = public
as $$
  select wm.role from public.workspace_members wm
  where wm.workspace_id = p_workspace_id
    and wm.user_id = auth.uid()
    and wm.status = 'active'
  limit 1;
$$;

-- Generic audit-trail writer. Attached only to the tables the product brief
-- calls out (opportunities, valuations, committee_memos,
-- post_auction_records). SECURITY DEFINER so it can insert into audit_logs
-- even though clients have no direct write policy on that table.
create or replace function public.fn_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace_id uuid;
  v_record_id uuid;
  v_changed text[];
begin
  if tg_op = 'DELETE' then
    v_workspace_id := old.workspace_id;
    v_record_id := old.id;
  else
    v_workspace_id := new.workspace_id;
    v_record_id := new.id;
  end if;

  if tg_op = 'UPDATE' then
    select array_agg(key) into v_changed
    from jsonb_each(to_jsonb(new)) n
    join jsonb_each(to_jsonb(old)) o using (key)
    where n.value is distinct from o.value;
  end if;

  insert into public.audit_logs (workspace_id, table_name, record_id, action, actor_id, changed_fields, old_data, new_data)
  values (
    v_workspace_id,
    tg_table_name,
    v_record_id,
    tg_op,
    auth.uid(),
    v_changed,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('UPDATE', 'INSERT') then to_jsonb(new) else null end
  );

  return coalesce(new, old);
end;
$$;

-- Guards opportunity_documents against overwriting an original source file.
-- Metadata enrichment (extracted_text/extracted_at) stays editable; identity
-- fields become immutable once set, matching "never overwrite documents".
create or replace function public.fn_prevent_document_mutation()
returns trigger
language plpgsql
as $$
begin
  if new.file_name is distinct from old.file_name
    or new.drive_file_id is distinct from old.drive_file_id
    or new.storage_path is distinct from old.storage_path
    or new.content_hash is distinct from old.content_hash
    or new.is_original is distinct from old.is_original
    or new.document_type is distinct from old.document_type
    or new.opportunity_id is distinct from old.opportunity_id
  then
    raise exception 'opportunity_documents rows are immutable for identity fields; insert a new version instead (see version_of_document_id)';
  end if;
  return new;
end;
$$;

-- Read-only diligence completion helper (informational — never writes,
-- never changes a decision). Mirrors the app's local summarizeDiligence().
create or replace function public.fn_opportunity_diligence_completion(p_opportunity_id uuid)
returns table (
  total_items integer,
  confirmed integer,
  warning integer,
  pending integer,
  blocked integer,
  critical_items integer,
  completion_pct numeric,
  highest_risk public.risk_level
)
language sql
stable
as $$
  select
    count(*)::int as total_items,
    count(*) filter (where status = 'confirmed')::int as confirmed,
    count(*) filter (where status = 'warning')::int as warning,
    count(*) filter (where status = 'pending')::int as pending,
    count(*) filter (where status = 'blocked')::int as blocked,
    count(*) filter (where risk = 'critical' or status = 'blocked')::int as critical_items,
    round(100.0 * count(*) filter (where status = 'confirmed') / nullif(count(*), 0), 1) as completion_pct,
    case
      when count(*) filter (where risk = 'critical' or status = 'blocked') > 0 then 'critical'::public.risk_level
      when count(*) filter (where status = 'warning') > 0 then 'high'::public.risk_level
      when count(*) filter (where status = 'pending') > 0 then 'medium'::public.risk_level
      else 'low'::public.risk_level
    end as highest_risk
  from public.diligence_items
  where opportunity_id = p_opportunity_id;
$$;


-- ============================================================================
-- 6. TRIGGERS
-- ============================================================================

drop trigger if exists trg_new_auth_user on auth.users;
create trigger trg_new_auth_user
  after insert on auth.users
  for each row execute function public.fn_handle_new_auth_user();

drop trigger if exists trg_new_workspace on public.workspaces;
create trigger trg_new_workspace
  after insert on public.workspaces
  for each row execute function public.fn_handle_new_workspace();

drop trigger if exists trg_documents_immutable on public.opportunity_documents;
create trigger trg_documents_immutable
  before update on public.opportunity_documents
  for each row execute function public.fn_prevent_document_mutation();

-- updated_at maintenance on every table that carries the column.
do $$
declare
  t text;
begin
  foreach t in array array[
    'workspaces', 'profiles', 'workspace_members', 'radar_leads',
    'opportunities', 'diligence_items', 'calendar_events',
    'post_auction_records', 'portfolio_settings'
  ]
  loop
    execute format('drop trigger if exists trg_set_updated_at on public.%I;', t);
    execute format(
      'create trigger trg_set_updated_at before update on public.%I for each row execute function public.fn_set_updated_at();',
      t
    );
  end loop;
end $$;

-- Audit trail on the tables called out by the product brief.
do $$
declare
  t text;
begin
  foreach t in array array[
    'opportunities', 'valuations', 'committee_memos', 'post_auction_records'
  ]
  loop
    execute format('drop trigger if exists trg_audit_log on public.%I;', t);
    execute format(
      'create trigger trg_audit_log after insert or update or delete on public.%I for each row execute function public.fn_audit_log();',
      t
    );
  end loop;
end $$;


-- ============================================================================
-- 7. VIEWS
-- ============================================================================
-- security_invoker = true so each view is evaluated under the querying
-- user's own RLS grants, not the view owner's — required for a Supabase
-- multi-tenant setup, otherwise a view would silently bypass RLS.

create or replace view public.view_pipeline_summary
with (security_invoker = true) as
select
  workspace_id,
  status,
  count(*) as total,
  avg(opportunity_score) as avg_opportunity_score,
  count(*) filter (where risk = 'critical') as critical_risk_count,
  count(*) filter (where decision = 'BLOCKED') as blocked_count
from public.opportunities
group by workspace_id, status;

create or replace view public.view_due_diligence_summary
with (security_invoker = true) as
select
  o.workspace_id,
  o.id as opportunity_id,
  o.deal_code,
  o.title,
  count(d.id) as total_items,
  count(*) filter (where d.status = 'confirmed') as confirmed,
  count(*) filter (where d.status = 'warning') as warning,
  count(*) filter (where d.status = 'pending') as pending,
  count(*) filter (where d.status = 'blocked') as blocked,
  count(*) filter (where d.risk = 'critical' or d.status = 'blocked') as critical_items,
  round(100.0 * count(*) filter (where d.status = 'confirmed') / nullif(count(d.id), 0), 1) as completion_pct
from public.opportunities o
left join public.diligence_items d on d.opportunity_id = o.id
group by o.workspace_id, o.id, o.deal_code, o.title;

create or replace view public.view_calendar_upcoming
with (security_invoker = true) as
select
  c.id,
  c.workspace_id,
  c.opportunity_id,
  o.deal_code,
  o.title as opportunity_title,
  c.title,
  c.kind,
  c.due_at,
  c.status,
  c.description
from public.calendar_events c
join public.opportunities o on o.id = c.opportunity_id
where c.status in ('pending', 'late')
order by c.due_at asc;

create or replace view public.view_portfolio_summary
with (security_invoker = true) as
select distinct on (s.workspace_id)
  s.workspace_id,
  s.snapshot_date,
  s.gross_assets,
  s.net_worth,
  s.liquid_capital,
  s.committed_capital,
  s.capital_at_risk,
  s.debt,
  s.realized_profit,
  s.unrealized_profit,
  s.monitored_value,
  s.available_to_deploy,
  s.active_deals,
  s.won_deals,
  s.closed_deals,
  s.average_roi_pct,
  ps.starting_net_worth,
  ps.reserve_capital,
  ps.max_allocation_per_deal_pct
from public.portfolio_snapshots s
join public.portfolio_settings ps on ps.workspace_id = s.workspace_id
order by s.workspace_id, s.snapshot_date desc;

create or replace view public.view_opportunity_full_detail
with (security_invoker = true) as
select
  o.*,
  v.id as current_valuation_id,
  v.max_bid_absolute as valuation_max_bid_absolute,
  v.max_bid_recommended as valuation_max_bid_recommended,
  v.comfort_bid as valuation_comfort_bid,
  v.assumptions as valuation_assumptions,
  v.market_value_source as valuation_market_value_source,
  v.market_value_consulted_at as valuation_market_value_consulted_at,
  cm.id as current_memo_id,
  cm.decision as memo_decision,
  cm.thesis as memo_thesis,
  cm.rationale as memo_rationale,
  cm.hard_blockers as memo_hard_blockers,
  cm.decided_at as memo_decided_at,
  dd.total_items as diligence_total_items,
  dd.confirmed as diligence_confirmed,
  dd.warning as diligence_warning,
  dd.pending as diligence_pending,
  dd.blocked as diligence_blocked,
  dd.critical_items as diligence_critical_items,
  dd.completion_pct as diligence_completion_pct,
  pa.outcome as post_auction_outcome,
  pa.stage as post_auction_stage
from public.opportunities o
left join public.valuations v on v.opportunity_id = o.id and v.is_current = true
left join public.committee_memos cm on cm.opportunity_id = o.id and cm.is_current = true
left join public.view_due_diligence_summary dd on dd.opportunity_id = o.id
left join public.post_auction_records pa on pa.opportunity_id = o.id;

create or replace view public.view_dashboard_overview
with (security_invoker = true) as
select
  o.workspace_id,
  count(distinct o.id) as total_opportunities,
  count(distinct o.id) filter (where o.status not in ('closed', 'lost', 'rejected')) as active_opportunities,
  count(distinct o.id) filter (where o.status = 'won') as won_opportunities,
  count(distinct o.id) filter (where o.risk = 'critical') as critical_risk_opportunities,
  count(distinct o.id) filter (where o.decision = 'BLOCKED') as blocked_opportunities,
  avg(o.opportunity_score) as avg_opportunity_score,
  avg(o.confidence_score) as avg_confidence_score,
  sum(o.max_bid_absolute) filter (where o.status in ('pre_bid', 'auction')) as capital_queued_for_bid,
  count(distinct c.id) filter (where c.status = 'late') as overdue_milestones
from public.opportunities o
left join public.calendar_events c on c.opportunity_id = o.id
group by o.workspace_id;


-- ============================================================================
-- 8. ROW LEVEL SECURITY
-- ============================================================================

alter table public.workspaces enable row level security;
alter table public.profiles enable row level security;
alter table public.workspace_members enable row level security;
alter table public.radar_leads enable row level security;
alter table public.opportunities enable row level security;
alter table public.opportunity_documents enable row level security;
alter table public.diligence_items enable row level security;
alter table public.valuations enable row level security;
alter table public.valuation_scenarios enable row level security;
alter table public.committee_memos enable row level security;
alter table public.calendar_events enable row level security;
alter table public.post_auction_records enable row level security;
alter table public.portfolio_settings enable row level security;
alter table public.portfolio_snapshots enable row level security;
alter table public.files_metadata enable row level security;
alter table public.ai_reports enable row level security;
alter table public.audit_logs enable row level security;

-- workspaces --------------------------------------------------------------
drop policy if exists workspaces_select on public.workspaces;
create policy workspaces_select on public.workspaces
  for select using (public.is_workspace_member(id));

drop policy if exists workspaces_insert on public.workspaces;
create policy workspaces_insert on public.workspaces
  for insert with check (owner_id = auth.uid());

drop policy if exists workspaces_update on public.workspaces;
create policy workspaces_update on public.workspaces
  for update using (public.workspace_role_of(id) in ('owner', 'admin'))
  with check (public.workspace_role_of(id) in ('owner', 'admin'));

drop policy if exists workspaces_delete on public.workspaces;
create policy workspaces_delete on public.workspaces
  for delete using (public.workspace_role_of(id) = 'owner');

-- profiles ------------------------------------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (
    id = auth.uid()
    or exists (
      select 1 from public.workspace_members me
      join public.workspace_members them on them.workspace_id = me.workspace_id
      where me.user_id = auth.uid() and them.user_id = profiles.id
    )
  );

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert with check (id = auth.uid());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- workspace_members -----------------------------------------------------
drop policy if exists workspace_members_select on public.workspace_members;
create policy workspace_members_select on public.workspace_members
  for select using (public.is_workspace_member(workspace_id));

drop policy if exists workspace_members_insert on public.workspace_members;
create policy workspace_members_insert on public.workspace_members
  for insert with check (public.workspace_role_of(workspace_id) in ('owner', 'admin'));

drop policy if exists workspace_members_update on public.workspace_members;
create policy workspace_members_update on public.workspace_members
  for update using (public.workspace_role_of(workspace_id) in ('owner', 'admin'))
  with check (public.workspace_role_of(workspace_id) in ('owner', 'admin'));

drop policy if exists workspace_members_delete on public.workspace_members;
create policy workspace_members_delete on public.workspace_members
  for delete using (
    public.workspace_role_of(workspace_id) in ('owner', 'admin')
    or user_id = auth.uid()
  );

-- Reusable CRUD policy set for workspace-scoped operational tables. viewers
-- get read-only access; delete is reserved for owner/admin as an
-- irreversible-operation safeguard.
do $$
declare
  t text;
begin
  foreach t in array array[
    'radar_leads', 'opportunities', 'opportunity_documents', 'diligence_items',
    'valuations', 'valuation_scenarios', 'committee_memos', 'calendar_events',
    'post_auction_records', 'portfolio_settings', 'portfolio_snapshots',
    'files_metadata', 'ai_reports'
  ]
  loop
    execute format('drop policy if exists %I_select on public.%I;', t, t);
    execute format(
      'create policy %I_select on public.%I for select using (public.is_workspace_member(workspace_id));',
      t, t
    );

    execute format('drop policy if exists %I_insert on public.%I;', t, t);
    execute format(
      'create policy %I_insert on public.%I for insert with check (public.is_workspace_member(workspace_id) and public.workspace_role_of(workspace_id) <> ''viewer'');',
      t, t
    );

    execute format('drop policy if exists %I_update on public.%I;', t, t);
    execute format(
      'create policy %I_update on public.%I for update using (public.is_workspace_member(workspace_id) and public.workspace_role_of(workspace_id) <> ''viewer'') with check (public.is_workspace_member(workspace_id) and public.workspace_role_of(workspace_id) <> ''viewer'');',
      t, t
    );

    execute format('drop policy if exists %I_delete on public.%I;', t, t);
    execute format(
      'create policy %I_delete on public.%I for delete using (public.workspace_role_of(workspace_id) in (''owner'', ''admin''));',
      t, t
    );
  end loop;
end $$;

-- audit_logs — append-only via SECURITY DEFINER trigger; clients get
-- read-only access, and only owner/admin can read it.
drop policy if exists audit_logs_select on public.audit_logs;
create policy audit_logs_select on public.audit_logs
  for select using (public.workspace_role_of(workspace_id) in ('owner', 'admin'));


-- ============================================================================
-- 9. INDEXES
-- ============================================================================

create index if not exists idx_workspace_members_workspace on public.workspace_members(workspace_id);
create index if not exists idx_workspace_members_user on public.workspace_members(user_id);

create index if not exists idx_radar_leads_workspace on public.radar_leads(workspace_id);
create index if not exists idx_radar_leads_status on public.radar_leads(status);

create index if not exists idx_opportunities_workspace on public.opportunities(workspace_id);
create index if not exists idx_opportunities_status on public.opportunities(status);
create index if not exists idx_opportunities_risk on public.opportunities(risk);
create index if not exists idx_opportunities_decision on public.opportunities(decision);
create index if not exists idx_opportunities_first_date on public.opportunities(first_date);

create index if not exists idx_opportunity_documents_opportunity on public.opportunity_documents(opportunity_id);
create index if not exists idx_opportunity_documents_workspace on public.opportunity_documents(workspace_id);

create index if not exists idx_diligence_items_opportunity on public.diligence_items(opportunity_id);
create index if not exists idx_diligence_items_workspace on public.diligence_items(workspace_id);

create index if not exists idx_valuations_opportunity on public.valuations(opportunity_id);
create index if not exists idx_valuations_current on public.valuations(opportunity_id) where is_current;

create index if not exists idx_valuation_scenarios_valuation on public.valuation_scenarios(valuation_id);

create index if not exists idx_committee_memos_opportunity on public.committee_memos(opportunity_id);
create index if not exists idx_committee_memos_current on public.committee_memos(opportunity_id) where is_current;

create index if not exists idx_calendar_events_opportunity on public.calendar_events(opportunity_id);
create index if not exists idx_calendar_events_due_at on public.calendar_events(due_at);
create index if not exists idx_calendar_events_workspace_status on public.calendar_events(workspace_id, status);

create index if not exists idx_portfolio_snapshots_workspace_date on public.portfolio_snapshots(workspace_id, snapshot_date desc);

create index if not exists idx_files_metadata_entity on public.files_metadata(entity_type, entity_id);
create index if not exists idx_files_metadata_workspace on public.files_metadata(workspace_id);

create index if not exists idx_ai_reports_opportunity on public.ai_reports(opportunity_id);
create index if not exists idx_ai_reports_workspace on public.ai_reports(workspace_id);

create index if not exists idx_audit_logs_workspace_created on public.audit_logs(workspace_id, created_at desc);
create index if not exists idx_audit_logs_record on public.audit_logs(table_name, record_id);
