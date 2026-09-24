-- NELSTORE — Supabase database setup
-- Execute este ficheiro no SQL Editor do teu projeto Supabase.
-- Depois de entrares pela primeira vez com a tua conta, promove-a para owner
-- com o UPDATE no fim deste ficheiro.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  display_name text,
  role text not null default 'user' check (role in ('user','staff','owner')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  product_id text,
  product_name text,
  status text not null default 'open' check (status in ('open','waiting','closed')),
  priority text not null default 'normal' check (priority in ('low','normal','high')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  message text not null check (char_length(message) between 1 and 1200),
  is_staff boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists tickets_user_id_idx on public.tickets(user_id);
create index if not exists tickets_updated_at_idx on public.tickets(updated_at desc);
create index if not exists ticket_messages_ticket_id_idx on public.ticket_messages(ticket_id, created_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists tickets_updated_at on public.tickets;
create trigger tickets_updated_at
before update on public.tickets
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(coalesce(new.email, ''), '@', 1))
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('staff', 'owner')
  );
$$;

alter table public.profiles enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_messages enable row level security;

-- Profiles: cada utilizador lê o próprio perfil; staff pode ler perfis para atendimento.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
using (id = auth.uid() or public.is_staff());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
using (id = auth.uid())
with check (id = auth.uid());

-- Apenas o próprio utilizador pode criar tickets em seu nome.
drop policy if exists "tickets_select_owner_or_staff" on public.tickets;
create policy "tickets_select_owner_or_staff"
on public.tickets for select
using (user_id = auth.uid() or public.is_staff());

drop policy if exists "tickets_insert_own" on public.tickets;
create policy "tickets_insert_own"
on public.tickets for insert
with check (user_id = auth.uid());

drop policy if exists "tickets_update_owner_or_staff" on public.tickets;
create policy "tickets_update_owner_or_staff"
on public.tickets for update
using (user_id = auth.uid() or public.is_staff())
with check (user_id = auth.uid() or public.is_staff());

-- Mensagens: só o dono do ticket ou staff autorizado pode consultar.
drop policy if exists "ticket_messages_select_owner_or_staff" on public.ticket_messages;
create policy "ticket_messages_select_owner_or_staff"
on public.ticket_messages for select
using (
  public.is_staff()
  or exists (
    select 1 from public.tickets t
    where t.id = ticket_id and t.user_id = auth.uid()
  )
);

-- Utilizador pode escrever no próprio ticket como utilizador; staff pode responder como staff.
drop policy if exists "ticket_messages_insert_owner_or_staff" on public.ticket_messages;
create policy "ticket_messages_insert_owner_or_staff"
on public.ticket_messages for insert
with check (
  (
    sender_id = auth.uid()
    and is_staff = false
    and exists (
      select 1 from public.tickets t
      where t.id = ticket_id and t.user_id = auth.uid()
    )
  )
  or (
    sender_id = auth.uid()
    and is_staff = true
    and public.is_staff()
  )
);

-- Opcional: ativa Realtime para atualização instantânea dos tickets.
alter publication supabase_realtime add table public.ticket_messages;

-- ================================================================
-- PROMOVER O DONO
-- 1. Entra primeiro com o Google ou email OTP.
-- 2. Executa a linha abaixo UMA VEZ, depois de substituíres o email.
-- ================================================================
-- update public.profiles set role = 'owner' where lower(email) = lower('miguelbento257@gmail.com');

-- Adicionar outro staff:
-- update public.profiles set role = 'staff' where lower(email) = lower('staff@example.com');
