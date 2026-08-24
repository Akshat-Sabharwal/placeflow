create policy push_subscriptions_no_direct_access
on public.push_subscriptions for all to authenticated
using (false) with check (false);

drop policy profiles_select_own on public.profiles;
drop policy profiles_select_applied_students_for_coordinator on public.profiles;
create policy profiles_select_authorized
on public.profiles for select to authenticated
using (
  (select auth.uid()) = id
  or (
    exists (
      select 1 from public.user_roles role
      where role.user_id = (select auth.uid()) and role.role = 'coordinator'
    )
    and exists (
      select 1 from public.applications application
      where application.student_id = profiles.id
    )
  )
);

drop policy drives_select_non_draft on public.drives;
drop policy drives_select_all_for_coordinator on public.drives;
create policy drives_select_authorized
on public.drives for select to authenticated
using (
  status <> 'draft'
  or exists (
    select 1 from public.user_roles role
    where role.user_id = (select auth.uid()) and role.role = 'coordinator'
  )
);

drop policy applications_select_own on public.applications;
drop policy applications_select_for_coordinator on public.applications;
create policy applications_select_authorized
on public.applications for select to authenticated
using (
  (select auth.uid()) = student_id
  or exists (
    select 1 from public.user_roles role
    where role.user_id = (select auth.uid()) and role.role = 'coordinator'
  )
);
