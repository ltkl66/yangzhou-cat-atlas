-- 扬州猫猫图鉴 · Supabase 初始化脚本
-- 在 Supabase Dashboard → SQL Editor 中整段执行一次。
-- 该脚本可重复执行；不会覆盖已有猫猫和互动记录。

begin;

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 管理员资料
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '志愿者' check (char_length(display_name) between 1 and 40),
  role text not null default 'visitor' check (role in ('visitor', 'admin')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(coalesce(new.email, '志愿者'), '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 猫猫点位
-- ---------------------------------------------------------------------------

create table if not exists public.cats (
  id uuid primary key default gen_random_uuid(),
  name text not null default '新朋友' check (char_length(name) between 1 and 18),
  area text not null check (char_length(area) between 1 and 30),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  photo_url text,
  photo_path text,
  note text check (char_length(note) <= 120),
  personality text not null default 'unknown' check (personality in ('friendly', 'cautious', 'unknown')),
  need text not null default 'none' check (need in ('food', 'medical', 'tnr', 'none')),
  cats_count integer not null default 1 check (cats_count between 1 and 30),
  sterilized boolean not null default false,
  approximate boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  source text not null default 'community' check (source in ('demo', 'community', 'admin')),
  submitted_by uuid references auth.users(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_note text check (char_length(review_note) <= 200),
  last_seen timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cats_status_created_at_idx
  on public.cats (status, created_at desc);

create index if not exists cats_last_seen_idx
  on public.cats (last_seen desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists cats_set_updated_at on public.cats;
create trigger cats_set_updated_at
  before update on public.cats
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 探望与投喂流水
-- ---------------------------------------------------------------------------

create table if not exists public.cat_interactions (
  id uuid primary key default gen_random_uuid(),
  cat_id uuid not null references public.cats(id) on delete cascade,
  type text not null check (type in ('feed', 'visit')),
  actor_name text check (char_length(actor_name) <= 40),
  note text check (char_length(note) <= 200),
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists cat_interactions_cat_id_idx
  on public.cat_interactions (cat_id, created_at desc);

create or replace function public.touch_cat_last_seen()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.cats
  set last_seen = new.created_at
  where id = new.cat_id
    and status = 'approved';
  return new;
end;
$$;

drop trigger if exists interaction_touch_cat_last_seen on public.cat_interactions;
create trigger interaction_touch_cat_last_seen
  after insert on public.cat_interactions
  for each row execute function public.touch_cat_last_seen();

-- 公开目录视图：自动汇总投喂与探望次数。
create or replace view public.cat_directory
with (security_invoker = true)
as
select
  c.*,
  count(i.id) filter (where i.type = 'feed')::integer as feed_count,
  count(i.id) filter (where i.type = 'visit')::integer as visit_count
from public.cats c
left join public.cat_interactions i on i.cat_id = c.id
group by c.id;

-- ---------------------------------------------------------------------------
-- RLS 权限
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.cats enable row level security;
alter table public.cat_interactions enable row level security;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin"
  on public.profiles for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "cats_public_read_approved" on public.cats;
create policy "cats_public_read_approved"
  on public.cats for select
  to anon, authenticated
  using (status = 'approved' or public.is_admin());

drop policy if exists "cats_accept_community_submissions" on public.cats;
create policy "cats_accept_community_submissions"
  on public.cats for insert
  to anon, authenticated
  with check (
    public.is_admin()
    or (
      status = 'pending'
      and source = 'community'
      and reviewed_by is null
      and reviewed_at is null
    )
  );

drop policy if exists "cats_admin_update" on public.cats;
create policy "cats_admin_update"
  on public.cats for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "cats_admin_delete" on public.cats;
create policy "cats_admin_delete"
  on public.cats for delete
  to authenticated
  using (public.is_admin());

drop policy if exists "interactions_public_read" on public.cat_interactions;
create policy "interactions_public_read"
  on public.cat_interactions for select
  to anon, authenticated
  using (true);

drop policy if exists "interactions_accept_visitors" on public.cat_interactions;
create policy "interactions_accept_visitors"
  on public.cat_interactions for insert
  to anon, authenticated
  with check (
    (user_id is null or user_id = auth.uid())
    and exists (
      select 1 from public.cats c
      where c.id = cat_id
        and c.status = 'approved'
    )
  );

drop policy if exists "interactions_admin_update" on public.cat_interactions;
create policy "interactions_admin_update"
  on public.cat_interactions for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "interactions_admin_delete" on public.cat_interactions;
create policy "interactions_admin_delete"
  on public.cat_interactions for delete
  to authenticated
  using (public.is_admin());

grant usage on schema public to anon, authenticated;
grant select on public.cats, public.cat_directory to anon, authenticated;
grant select on public.cat_interactions to authenticated;
grant select (id, cat_id, type, actor_name, note, created_at)
  on public.cat_interactions to anon;
grant insert on public.cats, public.cat_interactions to anon, authenticated;
grant update, delete on public.cats, public.cat_interactions to authenticated;
grant select, update on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Supabase Storage：猫猫照片
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cat-photos',
  'cat-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "cat_photos_public_read" on storage.objects;
create policy "cat_photos_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'cat-photos');

drop policy if exists "cat_photos_guest_upload_pending" on storage.objects;
create policy "cat_photos_guest_upload_pending"
  on storage.objects for insert
  to anon
  with check (
    bucket_id = 'cat-photos'
    and name like 'submissions/%'
    and lower(name) ~ '\.(jpe?g|png|webp)$'
  );

drop policy if exists "cat_photos_admin_upload" on storage.objects;
create policy "cat_photos_admin_upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'cat-photos'
    and public.is_admin()
    and lower(name) ~ '\.(jpe?g|png|webp)$'
  );

drop policy if exists "cat_photos_admin_delete" on storage.objects;
create policy "cat_photos_admin_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'cat-photos' and public.is_admin());

-- ---------------------------------------------------------------------------
-- 示例点位：可以在地图上直接看到，后续可由管理员删除。
-- ---------------------------------------------------------------------------

insert into public.cats (
  id, name, area, latitude, longitude, photo_url, note,
  personality, need, cats_count, sterilized, approximate,
  status, source, last_seen, created_at
) values
  (
    '00000000-0000-4000-8000-000000000001',
    '小橘', '东关街 · 观巷口', 32.398203, 119.437953,
    'assets/img/cat-orange.svg',
    '傍晚常在面馆后门等饭，听见塑料袋响就会探出头。',
    'friendly', 'food', 2, true, false,
    'approved', 'demo', now() - interval '1 hour', now() - interval '7 days'
  ),
  (
    '00000000-0000-4000-8000-000000000002',
    '墨墨', '皮市街 · 南口', 32.393005, 119.436156,
    'assets/img/cat-tuxedo.svg',
    '胆子小，不追人。把粮放在墙边退开两步，它才会慢慢出来。',
    'cautious', 'none', 1, true, false,
    'approved', 'demo', now() - interval '1 day', now() - interval '9 days'
  ),
  (
    '00000000-0000-4000-8000-000000000003',
    '花卷', '宋夹城 · 西门', 32.40512, 119.42028,
    'assets/img/cat-calico.svg',
    '很会撒娇，喜欢蹲在长椅下面。最近饭点总有小黑猫来蹭饭。',
    'friendly', 'food', 3, true, false,
    'approved', 'demo', now() - interval '4 hours', now() - interval '13 days'
  ),
  (
    '00000000-0000-4000-8000-000000000004',
    '雪团', '彩衣街 · 巷口', 32.39511, 119.432064,
    'assets/img/cat-white.svg',
    '它一般趴在旧木门旁边。怕生，建议远一点看，不要突然伸手。',
    'cautious', 'tnr', 1, false, false,
    'approved', 'demo', now() - interval '2 days', now() - interval '15 days'
  )
on conflict (id) do nothing;

commit;

-- ---------------------------------------------------------------------------
-- 创建管理员（示例，执行前替换邮箱）：
--
-- insert into public.profiles (id, display_name, role)
-- select id, coalesce(raw_user_meta_data ->> 'display_name', split_part(email, '@', 1)), 'admin'
-- from auth.users
-- where email = 'YOUR_EMAIL@example.com'
-- on conflict (id) do update set role = 'admin';
-- ---------------------------------------------------------------------------
