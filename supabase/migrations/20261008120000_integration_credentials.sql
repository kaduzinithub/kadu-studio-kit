-- KaduDev Studios: secure server-side OAuth credential storage.
-- Apply this migration to the production Supabase project before enabling Meta OAuth.

create table if not exists public.integration_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  access_token_encrypted text,
  token_expires_at timestamptz,
  state_hash text,
  state_expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider),
  unique (state_hash)
);

alter table public.integration_credentials enable row level security;
revoke all on public.integration_credentials from anon, authenticated;
grant all on public.integration_credentials to service_role;

create index if not exists integration_credentials_user_provider_idx
  on public.integration_credentials(user_id, provider);

create index if not exists integration_credentials_state_hash_idx
  on public.integration_credentials(state_hash);

create or replace function public.set_integration_credentials_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists integration_credentials_updated_at on public.integration_credentials;
create trigger integration_credentials_updated_at
before update on public.integration_credentials
for each row execute function public.set_integration_credentials_updated_at();
