alter table profiles add column if not exists full_name text;
alter table profiles add column if not exists dob date;
alter table profiles add column if not exists marketing_opt_in boolean not null default true;