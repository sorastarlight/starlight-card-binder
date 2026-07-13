-- Run this once after replacing the email below with the email used for your Starlight account.
insert into public.site_roles (user_id, role)
select id, 'admin'
from auth.users
where lower(email) = lower('REPLACE_WITH_YOUR_LOGIN_EMAIL')
on conflict (user_id)
do update set role = excluded.role;
