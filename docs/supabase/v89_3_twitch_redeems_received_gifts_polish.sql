-- V89.3 Twitch Redeems and Received Gifts polish
-- Safe routing repair for existing notifications.
update public.user_notifications
set route='rewards'
where lower(coalesce(notification_type,''))='reward'
   or lower(coalesce(title,'')) like '%reward%'
   or lower(coalesce(title,'')) like '%gift%'
   or lower(coalesce(body,'')) like '%received reward%'
   or lower(coalesce(body,'')) like '%received gift%'
   or lower(coalesce(source_key,'')) like 'received:%';

update public.user_notifications
set route='daily'
where lower(coalesce(title,'')) like '%daily%booster%'
   or lower(coalesce(body,'')) like '%daily%booster%';
