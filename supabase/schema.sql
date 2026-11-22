create table if not exists public.concierge_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  ref text not null,
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 200),
  phone text check (phone is null or char_length(phone) <= 40),
  notes text check (notes is null or char_length(notes) <= 500),
  services text[] not null,
  shop text not null,
  preferred_date date not null,
  preferred_time text not null,
  barber text not null,
  est_price int not null,
  est_minutes int not null
);
alter table public.concierge_requests enable row level security;
-- anonymous visitors may only INSERT. Nobody can read, update or delete through the public API.
create policy "anon can submit" on public.concierge_requests for insert to anon with check (true);
revoke all on public.concierge_requests from anon, authenticated;
grant insert on public.concierge_requests to anon;
