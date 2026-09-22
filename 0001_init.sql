-- =====================================================================
-- DEMBELE, mon Prof de Maison : schéma complet + sécurité (RLS)
-- Règle d'or : le client n'a accès qu'à SES lignes. Tout ce qui est
-- sensible (messages IA, mémoire, emploi du temps, quotas) passe par
-- le serveur (Edge Function ou fonction SQL security definer).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Pays (fuseaux horaires pour le blocage) ----------
create table public.countries (
  code text primary key check (code ~ '^[A-Z]{2}$'),
  name_fr text not null,
  timezone text not null
);

insert into public.countries (code, name_fr, timezone) values
  ('BF','Burkina Faso','Africa/Ouagadougou'),
  ('CI','Côte d''Ivoire','Africa/Abidjan'),
  ('ML','Mali','Africa/Bamako'),
  ('SN','Sénégal','Africa/Dakar'),
  ('NE','Niger','Africa/Niamey'),
  ('TG','Togo','Africa/Lome'),
  ('BJ','Bénin','Africa/Porto-Novo'),
  ('GN','Guinée','Africa/Conakry'),
  ('CM','Cameroun','Africa/Douala'),
  ('GA','Gabon','Africa/Libreville'),
  ('CG','Congo','Africa/Brazzaville'),
  ('CD','RD Congo (Kinshasa)','Africa/Kinshasa'),
  ('TD','Tchad','Africa/Ndjamena'),
  ('MG','Madagascar','Indian/Antananarivo'),
  ('MA','Maroc','Africa/Casablanca'),
  ('DZ','Algérie','Africa/Algiers'),
  ('TN','Tunisie','Africa/Tunis'),
  ('FR','France','Europe/Paris');

alter table public.countries enable row level security;
create policy countries_read on public.countries for select to authenticated using (true);

-- ---------- Admins (pour éditer les jours fériés) ----------
create table public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.app_admins enable row level security; -- aucune policy : serveur uniquement

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.app_admins where user_id = auth.uid());
$$;

-- ---------- Profils ----------
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  nom text not null check (char_length(nom) between 1 and 60),
  prenom text not null check (char_length(prenom) between 1 and 60),
  statut text not null check (statut in ('Élève','Étudiant en Licence')),
  classe text check (classe in ('6e','5e','4e','3e','2nde','1ère','Terminale')),
  serie text check (serie in ('A','C','D','E','F','G')),
  niveau text check (niveau in ('L1','L2','L3')),
  filiere text check (char_length(filiere) between 1 and 80),
  pays text not null default 'BF' references public.countries(code),
  identity_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint profil_coherent check (
    (statut = 'Élève' and classe is not null and niveau is null and filiere is null
      and ((classe in ('2nde','1ère','Terminale') and serie is not null)
        or (classe in ('6e','5e','4e','3e') and serie is null)))
    or
    (statut = 'Étudiant en Licence' and niveau is not null and filiere is not null
      and classe is null and serie is null)
  )
);

alter table public.profiles enable row level security;
create policy profiles_select on public.profiles for select to authenticated using (user_id = auth.uid());
create policy profiles_insert on public.profiles for insert to authenticated with check (user_id = auth.uid());
create policy profiles_update on public.profiles for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Modifiable une seule fois par trimestre (règle appliquée côté base, pas côté navigateur)
create or replace function public.enforce_profile_quarter() returns trigger
language plpgsql set search_path = public as $$
begin
  new.id := old.id;
  new.user_id := old.user_id;
  new.created_at := old.created_at;
  if (new.nom, new.prenom, new.statut, new.classe, new.serie, new.niveau, new.filiere, new.pays)
     is distinct from
     (old.nom, old.prenom, old.statut, old.classe, old.serie, old.niveau, old.filiere, old.pays) then
    if old.identity_updated_at > now() - interval '3 months' then
      raise exception 'profil_verrouille' using errcode = 'P0001';
    end if;
    new.identity_updated_at := now();
  else
    new.identity_updated_at := old.identity_updated_at;
  end if;
  return new;
end $$;

create trigger profiles_quarter before update on public.profiles
  for each row execute function public.enforce_profile_quarter();

-- ---------- Chats (chapitres) ----------
create table public.chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null default 'Nouveau chapitre' check (char_length(title) between 1 and 120),
  chapter_number int not null,
  created_at timestamptz not null default now(),
  unique (user_id, chapter_number)
);
create index chats_user_created_idx on public.chats (user_id, created_at desc);

create or replace function public.chats_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform pg_advisory_xact_lock(hashtext(new.user_id::text));
    if (select count(*) from public.chats where user_id = new.user_id) >= 200 then
      raise exception 'trop_de_chapitres' using errcode = 'P0001';
    end if;
    select coalesce(max(chapter_number), 0) + 1 into new.chapter_number
      from public.chats where user_id = new.user_id;
  else
    new.chapter_number := old.chapter_number;
    new.user_id := old.user_id;
  end if;
  return new;
end $$;

create trigger chats_guard_ins before insert on public.chats for each row execute function public.chats_guard();
create trigger chats_guard_upd before update on public.chats for each row execute function public.chats_guard();

alter table public.chats enable row level security;
create policy chats_select on public.chats for select to authenticated using (user_id = auth.uid());
create policy chats_insert on public.chats for insert to authenticated with check (user_id = auth.uid());
create policy chats_update on public.chats for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy chats_delete on public.chats for delete to authenticated using (user_id = auth.uid());

-- ---------- Messages ----------
-- Lecture seule pour le client. Seule l'Edge Function (service_role) écrit :
-- impossible de forger un faux message "assistant" depuis la console du navigateur.
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null check (char_length(content) <= 30000),
  image_path text,
  created_at timestamptz not null default now()
);
create index messages_chat_created_idx on public.messages (chat_id, created_at desc);
create index messages_user_idx on public.messages (user_id);

alter table public.messages enable row level security;
create policy messages_select on public.messages for select to authenticated using (user_id = auth.uid());

-- ---------- Mémoire globale (par utilisateur, PAS par chat) ----------
create table public.memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null check (key in ('notions_vues','points_faibles','style_prefere','exercices_faits')),
  value jsonb not null,
  updated_at timestamptz not null default now(),
  unique (user_id, key)
);
alter table public.memory enable row level security;
create policy memory_select on public.memory for select to authenticated using (user_id = auth.uid());
create policy memory_delete on public.memory for delete to authenticated using (user_id = auth.uid()); -- droit à l'effacement

-- ---------- Emploi du temps (élèves uniquement, verrouillé) ----------
create table public.schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day smallint not null check (day between 1 and 6),          -- 1 = lundi ... 6 = samedi
  start_hour smallint not null check (start_hour between 0 and 23),
  end_hour smallint not null check (end_hour between 1 and 24),
  subject text not null check (subject in ('Maths','Physique','Chimie','SVT','Français','Anglais','Histoire-Géo','EPS','Autre')),
  locked boolean not null default true,
  check (end_hour = start_hour + 1),
  unique (user_id, day, start_hour)
);
create index schedules_user_idx on public.schedules (user_id, day, start_hour);

alter table public.schedules enable row level security;
create policy schedules_select on public.schedules for select to authenticated using (user_id = auth.uid());
-- Volontairement AUCUNE policy insert/update/delete : on ne peut créer l'emploi du temps
-- que via validate_schedule(), une seule fois, et on ne peut plus le toucher ensuite.

create or replace function public.validate_schedule(p_slots jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_statut text;
begin
  if v_uid is null then raise exception 'non_authentifie'; end if;
  select statut into v_statut from public.profiles where user_id = v_uid;
  if v_statut is distinct from 'Élève' then raise exception 'reserve_aux_eleves'; end if;
  if exists (select 1 from public.schedules where user_id = v_uid) then raise exception 'deja_valide'; end if;
  if jsonb_typeof(p_slots) <> 'array' or jsonb_array_length(p_slots) = 0 or jsonb_array_length(p_slots) > 84 then
    raise exception 'creneaux_invalides';
  end if;
  insert into public.schedules (user_id, day, start_hour, end_hour, subject, locked)
  select v_uid, (x->>'day')::smallint, (x->>'start_hour')::smallint,
         (x->>'start_hour')::smallint + 1, x->>'subject', true
  from jsonb_array_elements(p_slots) as x;
end $$;

-- ---------- Jours fériés & vacances ----------
create table public.holidays (
  id uuid primary key default gen_random_uuid(),
  country text not null references public.countries(code),
  date date not null,
  name text not null,
  unique (country, date)
);
create index holidays_country_date_idx on public.holidays (country, date);

create table public.school_vacations (
  id uuid primary key default gen_random_uuid(),
  country text not null references public.countries(code),
  start_date date not null,
  end_date date not null,
  name text not null,
  check (end_date >= start_date)
);
create index vacations_country_idx on public.school_vacations (country, start_date, end_date);

alter table public.holidays enable row level security;
alter table public.school_vacations enable row level security;
create policy holidays_read on public.holidays for select to authenticated using (true);
create policy holidays_admin_write on public.holidays for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy vacations_read on public.school_vacations for select to authenticated using (true);
create policy vacations_admin_write on public.school_vacations for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Burkina Faso : dates fixes 2026-2032 (à vérifier / compléter par l'admin chaque année).
insert into public.holidays (country, date, name)
select 'BF', make_date(y, f.m, f.d), f.n
from generate_series(2026, 2032) as y,
     (values
       (1, 1,  'Jour de l''An'),
       (1, 3,  'Soulèvement populaire du 3 janvier'),
       (3, 8,  'Journée internationale des femmes'),
       (5, 1,  'Fête du Travail'),
       (8, 5,  'Fête de l''Indépendance'),
       (8, 15, 'Assomption'),
       (10,15, '15 octobre'),
       (11,1,  'Toussaint'),
       (12,11, 'Proclamation de la République'),
       (12,25, 'Noël')
     ) as f(m, d, n)
on conflict (country, date) do nothing;

-- Fêtes mobiles (Ramadan/Aïd el-Fitr, Tabaski, Maouloud, Pâques...) : les dates changent
-- chaque année. À ajouter par un admin quand elles sont annoncées, par exemple :
--   insert into public.holidays (country, date, name) values ('BF', '2027-MM-JJ', 'Tabaski');

-- ---------- Blocage horaire (source de vérité UNIQUE, appelée par l'app ET par l'Edge Function) ----------
create or replace function public.get_block_status()
returns table (blocked boolean, until_hour smallint)
language plpgsql stable security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_prof public.profiles%rowtype;
  v_tz text;
  v_now timestamp;
  v_dow int;
  v_hour int;
  v_end int;
begin
  if v_uid is null then raise exception 'non_authentifie'; end if;

  select * into v_prof from public.profiles where user_id = v_uid;
  if not found or v_prof.statut <> 'Élève' then
    return query select false, null::smallint; return;
  end if;

  select timezone into v_tz from public.countries where code = v_prof.pays;
  v_now := now() at time zone coalesce(v_tz, 'UTC');
  v_dow := extract(isodow from v_now)::int;
  v_hour := extract(hour from v_now)::int;

  if v_dow = 7 then return query select false, null::smallint; return; end if;

  if exists (select 1 from public.holidays h where h.country = v_prof.pays and h.date = v_now::date)
     or exists (select 1 from public.school_vacations s
                where s.country = v_prof.pays and v_now::date between s.start_date and s.end_date) then
    return query select false, null::smallint; return;
  end if;

  select s.end_hour into v_end from public.schedules s
   where s.user_id = v_uid and s.locked and s.day = v_dow and s.start_hour = v_hour;

  if v_end is null then
    return query select false, null::smallint; return;
  end if;

  -- Si les cours s'enchaînent, on bloque jusqu'à la fin du dernier.
  while exists (select 1 from public.schedules s
                where s.user_id = v_uid and s.locked and s.day = v_dow and s.start_hour = v_end) loop
    v_end := v_end + 1;
  end loop;

  return query select true, v_end::smallint;
end $$;

-- ---------- Limitation de débit (rate limiting) ----------
create table public.rate_limits (
  user_id uuid not null,
  bucket text not null,
  window_start timestamptz not null,
  hits int not null default 0,
  primary key (user_id, bucket, window_start)
);
alter table public.rate_limits enable row level security; -- aucune policy : service_role uniquement

create or replace function public.check_rate_limit(p_user uuid, p_bucket text, p_limit int, p_window_seconds int)
returns table (allowed boolean, retry_after int)
language plpgsql security definer set search_path = public as $$
declare
  v_start timestamptz;
  v_hits int;
begin
  v_start := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  insert into public.rate_limits as r (user_id, bucket, window_start, hits)
  values (p_user, p_bucket, v_start, 1)
  on conflict (user_id, bucket, window_start) do update set hits = r.hits + 1
  returning r.hits into v_hits;

  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '2 days';
  end if;

  return query select v_hits <= p_limit,
    greatest(1, ceil(extract(epoch from (v_start + make_interval(secs => p_window_seconds) - now())))::int);
end $$;

-- ---------- Droits d'exécution ----------
revoke all on function public.check_rate_limit(uuid, text, int, int) from public, anon, authenticated;
grant execute on function public.check_rate_limit(uuid, text, int, int) to service_role;

revoke all on function public.get_block_status() from public, anon;
grant execute on function public.get_block_status() to authenticated;

revoke all on function public.validate_schedule(jsonb) from public, anon;
grant execute on function public.validate_schedule(jsonb) to authenticated;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ---------- Stockage privé des photos d'exercices ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('exercises', 'exercises', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy exercises_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'exercises' and (storage.foldername(name))[1] = auth.uid()::text);
create policy exercises_select_own on storage.objects for select to authenticated
  using (bucket_id = 'exercises' and (storage.foldername(name))[1] = auth.uid()::text);
create policy exercises_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'exercises' and (storage.foldername(name))[1] = auth.uid()::text);
