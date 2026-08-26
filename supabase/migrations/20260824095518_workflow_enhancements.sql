create type public.candidate_response_status as enum ('pending', 'accepted', 'declined');

alter table public.applications
  add column candidate_response public.candidate_response_status not null default 'pending',
  add column candidate_responded_at timestamptz;

alter table public.profiles
  add column active_profile_document_id uuid references public.documents(id) on delete set null;

alter table public.drives
  add column rounds jsonb not null default '[]'::jsonb,
  add column active_round_index integer;

alter table public.drives
  add constraint drives_rounds_array check (jsonb_typeof(rounds) = 'array'),
  add constraint drives_active_round_index_nonnegative check (
    active_round_index is null or active_round_index >= 0
  ),
  add constraint drives_active_round_index_in_bounds check (
    active_round_index is null or active_round_index < jsonb_array_length(rounds)
  );

create table public.pinned_drives (
  student_id uuid not null references public.profiles(id) on delete cascade,
  drive_id uuid not null references public.drives(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (student_id, drive_id)
);

create index pinned_drives_drive_idx on public.pinned_drives (drive_id);
create index profiles_active_profile_document_idx
  on public.profiles (active_profile_document_id)
  where active_profile_document_id is not null;
create index applications_candidate_response_idx
  on public.applications (drive_id, candidate_response, updated_at desc);

revoke all on public.pinned_drives from public, anon, authenticated;
grant select, insert, update, delete on public.pinned_drives to service_role;
alter table public.pinned_drives enable row level security;
create policy pinned_drives_no_direct_access
on public.pinned_drives for all to authenticated
using (false) with check (false);

create or replace function private.guard_candidate_response()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.candidate_response = old.candidate_response then
    return new;
  end if;

  if old.status not in ('shortlisted', 'selected') then
    raise exception using errcode = '23514',
      message = 'candidate response requires a shortlisted or selected application';
  end if;

  new.candidate_responded_at = now();
  return new;
end;
$$;

revoke all on function private.guard_candidate_response() from public, anon, authenticated;

create trigger applications_guard_candidate_response
before update of candidate_response on public.applications
for each row execute function private.guard_candidate_response();

create or replace function private.guard_application_status_transition()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = new.status then return new; end if;
  if not (
    (old.status = 'applied' and new.status in ('shortlisted', 'rejected')) or
    (old.status = 'shortlisted' and new.status in ('selected', 'rejected'))
  ) then
    raise exception using errcode = '23514', message = 'invalid application status transition';
  end if;
  if new.status = 'selected' and new.candidate_response = 'declined' then
    raise exception using errcode = '23514',
      message = 'a declined candidate cannot be selected';
  end if;
  return new;
end;
$$;

create or replace function private.guard_onboarding_record()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.source_document_id is not null and not exists (
    select 1 from public.documents document
    where document.id = new.source_document_id
      and document.student_id = new.student_id
      and document.mime_type in ('application/pdf', 'image/png', 'image/jpeg', 'image/webp')
  ) then
    raise exception using errcode = '23514', message = 'profile source must be an owned PDF or image';
  end if;

  if new.accepted_extraction_id is not null and not exists (
    select 1 from public.document_extractions extraction
    where extraction.id = new.accepted_extraction_id
      and extraction.onboarding_record_id = new.id
      and extraction.student_id = new.student_id
      and extraction.document_id = new.source_document_id
      and extraction.status = 'succeeded'
  ) then
    raise exception using errcode = '23514',
      message = 'accepted extraction must be a successful extraction for this record';
  end if;

  if tg_op = 'UPDATE' and old.status <> new.status and not (
    (old.status = 'draft' and new.status in ('extraction_pending', 'review_required', 'ready', 'cancelled'))
    or (old.status = 'extraction_pending' and new.status in ('draft', 'review_required', 'cancelled'))
    or (old.status = 'review_required' and new.status in ('draft', 'ready', 'cancelled'))
    or (old.status = 'ready' and new.status in ('review_required', 'submitted', 'cancelled'))
    or (old.status = 'cancelled' and new.status = 'draft')
    or (old.status = 'submitted' and new.status = 'draft')
  ) then
    raise exception using errcode = '23514', message = 'invalid onboarding status transition';
  end if;

  return new;
end;
$$;

create or replace function public.submit_onboarding_record(
  p_record_id uuid,
  p_student_id uuid,
  p_expected_updated_at timestamptz
)
returns public.profiles
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_record public.onboarding_records%rowtype;
  v_profile public.profiles%rowtype;
begin
  select * into v_record
  from public.onboarding_records onboarding
  where onboarding.id = p_record_id and onboarding.student_id = p_student_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'ONBOARDING_NOT_FOUND';
  end if;
  if v_record.status <> 'ready' then
    raise exception using errcode = 'P0001', message = 'ONBOARDING_NOT_READY';
  end if;
  if v_record.updated_at <> p_expected_updated_at then
    raise exception using errcode = 'P0001', message = 'ONBOARDING_STALE';
  end if;
  if v_record.staged_full_name is null
    or v_record.staged_roll_number is null
    or v_record.staged_branch is null
    or v_record.staged_graduation_year is null
    or v_record.staged_cgpa is null
    or v_record.staged_backlogs is null
    or v_record.source_document_id is null
    or v_record.accepted_extraction_id is null then
    raise exception using errcode = 'P0001', message = 'ONBOARDING_INCOMPLETE';
  end if;
  if not exists (
    select 1 from public.user_roles role
    where role.user_id = p_student_id and role.role = 'student'
  ) then
    raise exception using errcode = 'P0001', message = 'STUDENT_ROLE_REQUIRED';
  end if;

  update public.profiles
  set full_name = v_record.staged_full_name,
      roll_number = v_record.staged_roll_number,
      branch = v_record.staged_branch,
      graduation_year = v_record.staged_graduation_year,
      cgpa = v_record.staged_cgpa,
      backlogs = v_record.staged_backlogs,
      linkedin_url = v_record.staged_linkedin_url,
      github_url = v_record.staged_github_url,
      active_profile_document_id = v_record.source_document_id,
      onboarding_completed_at = coalesce(onboarding_completed_at, now())
  where id = p_student_id
  returning * into v_profile;

  if not found then
    raise exception using errcode = 'P0001', message = 'PROFILE_NOT_FOUND';
  end if;

  update public.onboarding_records
  set status = 'submitted', submitted_at = now()
  where id = v_record.id;

  return v_profile;
end;
$$;

revoke all on function public.submit_onboarding_record(uuid, uuid, timestamptz)
  from public, anon, authenticated;
grant execute on function public.submit_onboarding_record(uuid, uuid, timestamptz)
  to service_role;
