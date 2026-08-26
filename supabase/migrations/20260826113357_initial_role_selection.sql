alter table public.user_roles
  add column role_selected_at timestamptz;

-- Coordinators were already assigned through a privileged promotion flow. Existing
-- students get one explicit workspace choice the next time they authenticate.
update public.user_roles
set role_selected_at = granted_at
where role = 'coordinator';

comment on column public.user_roles.role_selected_at is
  'Seals the first interactive student or coordinator workspace choice.';
