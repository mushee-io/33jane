create table if not exists assets (
  asset_id text primary key,
  chain_id integer not null,
  contract_address text not null,
  payload jsonb not null,
  created_at timestamptz not null,
  updated_at timestamptz not null
);
create index if not exists assets_chain_address_idx on assets(chain_id, lower(contract_address));

create table if not exists asset_rules (
  id text primary key,
  asset_id text not null references assets(asset_id) on delete cascade,
  rule_type text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists eligibility_checks (
  id text primary key,
  order_id text,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists liquidity_providers (
  id text primary key,
  provider_type text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists quotes (
  id text primary key,
  order_id text,
  adapter_id text not null,
  expires_at timestamptz,
  payload jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists quotes_order_idx on quotes(order_id);

create table if not exists routes (
  id text primary key,
  order_id text,
  expires_at timestamptz,
  payload jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists routes_order_idx on routes(order_id);

create table if not exists orders (
  id text primary key,
  state text not null,
  payload jsonb not null,
  created_at timestamptz not null,
  updated_at timestamptz not null
);
create index if not exists orders_state_idx on orders(state);

create table if not exists executions (
  id text primary key,
  order_id text,
  route_id text not null,
  status text not null,
  payload jsonb not null,
  created_at timestamptz not null
);

create table if not exists audit_events (
  id text primary key,
  order_id text,
  event_type text not null,
  actor text not null,
  payload jsonb not null,
  created_at timestamptz not null
);
create index if not exists audit_order_idx on audit_events(order_id, created_at desc);
