-- Leilões OS initial schema
create extension if not exists pgcrypto;

create type auction_status as enum ('new','screening','due_diligence','valuation','committee','pre_bid','auction','won','lost','regularization','renovation','sale','rental','closed','rejected');
create type risk_level as enum ('low','medium','high','critical');
create type decision_type as enum ('A_APPROVE','B_LIMITED','C_MONITOR','D_REJECT','BLOCKED');

create table if not exists assets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  asset_type text not null,
  address text,
  city text,
  state text,
  registration_number text,
  process_number text,
  area_m2 numeric,
  occupancy_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists auctions (
  id uuid primary key default gen_random_uuid(),
  deal_id text unique not null,
  asset_id uuid references assets(id),
  auctioneer text,
  source_url text,
  status auction_status not null default 'new',
  first_date timestamptz,
  second_date timestamptz,
  opening_bid numeric,
  current_bid numeric,
  increment numeric,
  commission_pct numeric default 5,
  payment_terms text,
  market_conservative numeric,
  market_base numeric,
  market_optimistic numeric,
  total_cost_estimate numeric,
  max_bid_absolute numeric,
  max_bid_recommended numeric,
  comfort_bid numeric,
  base_roi_pct numeric,
  score integer,
  risk risk_level,
  confidence integer,
  decision decision_type,
  decision_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists auction_documents (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references auctions(id) on delete cascade,
  document_type text not null,
  file_name text not null,
  drive_file_id text,
  source_url text,
  is_original boolean not null default true,
  content_hash text,
  extracted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists due_diligence (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references auctions(id) on delete cascade,
  category text not null,
  item text not null,
  status text not null default 'pending',
  evidence text,
  source_document_id uuid references auction_documents(id),
  risk risk_level,
  notes text,
  checked_at timestamptz
);

create table if not exists financial_scenarios (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references auctions(id) on delete cascade,
  scenario text not null check (scenario in ('pessimistic','base','optimistic')),
  acquisition_cost numeric,
  total_cost numeric,
  exit_value numeric,
  profit numeric,
  roi_pct numeric,
  months_to_exit numeric,
  annualized_roi_pct numeric,
  assumptions jsonb not null default '{}'::jsonb
);

create table if not exists operations (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid unique not null references auctions(id),
  awarded_at timestamptz,
  actual_acquisition_cost numeric,
  actual_total_cost numeric,
  actual_exit_value numeric,
  actual_profit numeric,
  actual_roi_pct numeric,
  actual_months_to_exit numeric,
  exit_strategy text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists operation_costs (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null references operations(id) on delete cascade,
  category text not null,
  estimated numeric,
  actual numeric,
  notes text
);

create table if not exists sources (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid references auctions(id) on delete cascade,
  source_type text not null,
  title text,
  url text,
  consulted_at timestamptz not null default now(),
  confidence integer,
  notes text
);

create table if not exists portfolio_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_date date not null default current_date,
  gross_assets numeric,
  net_worth numeric,
  liquid_capital numeric,
  committed_capital numeric,
  capital_at_risk numeric,
  debt numeric,
  realized_profit numeric,
  unrealized_profit numeric,
  notes text
);

create table if not exists learning_records (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid references operations(id),
  metric text not null,
  predicted numeric,
  actual numeric,
  variance_pct numeric,
  insight text,
  created_at timestamptz not null default now()
);

create index if not exists idx_auctions_status on auctions(status);
create index if not exists idx_auctions_first_date on auctions(first_date);
create index if not exists idx_dd_auction on due_diligence(auction_id);
create index if not exists idx_documents_auction on auction_documents(auction_id);
