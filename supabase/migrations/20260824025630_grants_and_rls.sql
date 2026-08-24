-- keep data api exposure explicit.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from public, anon, authenticated;

grant select on public.profiles, public.user_roles, public.drives,
  public.applications, public.documents, public.notifications to authenticated;

grant select, insert, update, delete on public.profiles, public.user_roles, public.drives,
  public.applications, public.documents, public.notifications, public.push_subscriptions to service_role;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.drives enable row level security;
alter table public.applications enable row level security;
alter table public.documents enable row level security;
alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;

create policy profiles_select_own on public.profiles for select to authenticated
using ((select auth.uid()) = id);

create policy profiles_select_applied_students_for_coordinator on public.profiles for select to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = (select auth.uid()) and ur.role = 'coordinator'
  )
  and exists (
    select 1 from public.applications a where a.student_id = profiles.id
  )
);

create policy roles_select_own on public.user_roles for select to authenticated
using ((select auth.uid()) = user_id);

create policy drives_select_non_draft on public.drives for select to authenticated
using (status <> 'draft');

create policy drives_select_all_for_coordinator on public.drives for select to authenticated
using (exists (
  select 1 from public.user_roles ur
  where ur.user_id = (select auth.uid()) and ur.role = 'coordinator'
));

create policy applications_select_own on public.applications for select to authenticated
using ((select auth.uid()) = student_id);

create policy applications_select_for_coordinator on public.applications for select to authenticated
using (exists (
  select 1 from public.user_roles ur
  where ur.user_id = (select auth.uid()) and ur.role = 'coordinator'
));

create policy documents_select_own on public.documents for select to authenticated
using ((select auth.uid()) = student_id);

create policy notifications_select_own on public.notifications for select to authenticated
using ((select auth.uid()) = user_id);
