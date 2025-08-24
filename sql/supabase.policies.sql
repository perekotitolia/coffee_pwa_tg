alter table profiles enable row level security;
alter table points_events enable row level security;

-- Пример RLS: только владелец профиля по device_id (если реализована аутентификация).
-- Для демо используйте сервисный ключ на бэкенде.
create policy read_profiles_public on profiles
  for select using (true);

create policy read_points_events_public on points_events
  for select using (true);