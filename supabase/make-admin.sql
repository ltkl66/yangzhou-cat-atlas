-- 把 YOUR_EMAIL@example.com 替换为已在 Supabase Authentication 中创建的账号邮箱，
-- 然后在 SQL Editor 中执行。

insert into public.profiles (id, display_name, role)
select
  id,
  coalesce(raw_user_meta_data ->> 'display_name', split_part(email, '@', 1)),
  'admin'
from auth.users
where email = 'YOUR_EMAIL@example.com'
on conflict (id) do update set role = 'admin';
