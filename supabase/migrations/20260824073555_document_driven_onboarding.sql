create type public.onboarding_status as enum (
  'draft',
  'extraction_pending',
  'review_required',
  'ready',
  'submitted',
  'cancelled'
);

create type public.extraction_status as enum ('pending', 'processing', 'succeeded', 'failed');
create type public.extraction_trust as enum ('client_asserted', 'server_verified');

create table public.onboarding_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references public.profiles(id) on delete cascade,
  source_document_id uuid references public.documents(id) on delete set null,
  accepted_extraction_id uuid,
  status public.onboarding_status not null default 'draft',
  staged_full_name text,
  staged_roll_number text,
  staged_branch text,
  staged_graduation_year integer,
  staged_cgpa numeric(4,2),
  staged_backlogs integer,
  staged_linkedin_url text,
  staged_github_url text,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint onboarding_full_name_length check (
    staged_full_name is null or char_length(staged_full_name) between 1 and 120
  ),
  constraint onboarding_roll_number_length check (
    staged_roll_number is null or char_length(staged_roll_number) between 1 and 64
  ),
  constraint onboarding_branch_length check (
    staged_branch is null or char_length(staged_branch) between 1 and 64
  ),
  constraint onboarding_graduation_year_range check (
    staged_graduation_year is null or staged_graduation_year between 2000 and 2100
  ),
  constraint onboarding_cgpa_range check (staged_cgpa is null or staged_cgpa between 0 and 10),
  constraint onboarding_backlogs_range check (staged_backlogs is null or staged_backlogs between 0 and 99),
  constraint onboarding_linkedin_url_length check (
    staged_linkedin_url is null or char_length(staged_linkedin_url) between 1 and 2048
  ),
  constraint onboarding_github_url_length check (
    staged_github_url is null or char_length(staged_github_url) between 1 and 2048
  ),
  constraint onboarding_submission_state check (
    (status = 'submitted' and submitted_at is not null)
    or (status <> 'submitted' and submitted_at is null)
  )
);

create table public.document_extractions (
  id uuid primary key default gen_random_uuid(),
  onboarding_record_id uuid not null references public.onboarding_records(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete restrict,
  student_id uuid not null references public.profiles(id) on delete cascade,
  status public.extraction_status not null default 'pending',
  trust public.extraction_trust not null default 'client_asserted',
  extractor_name text not null,
  extractor_version text,
  source_original_name text not null,
  source_mime_type text not null,
  source_size_bytes bigint not null,
  source_sha256 text,
  extracted_fields jsonb not null default '{}'::jsonb,
  field_confidence jsonb not null default '{}'::jsonb,
  raw_output jsonb,
  error_code text,
  error_message text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint document_extractions_extractor_name_length check (
    char_length(extractor_name) between 1 and 120
  ),
  constraint document_extractions_extractor_version_length check (
    extractor_version is null or char_length(extractor_version) between 1 and 80
  ),
  constraint document_extractions_original_name_length check (
    char_length(source_original_name) between 1 and 255
  ),
  constraint document_extractions_mime_type_length check (
    char_length(source_mime_type) between 1 and 100
  ),
  constraint document_extractions_source_size check (
    source_size_bytes > 0 and source_size_bytes <= 52428800
  ),
  constraint document_extractions_sha256_format check (
    source_sha256 is null or source_sha256 ~ '^[0-9a-f]{64}$'
  ),
  constraint document_extractions_fields_object check (jsonb_typeof(extracted_fields) = 'object'),
  constraint document_extractions_confidence_object check (jsonb_typeof(field_confidence) = 'object'),
  constraint document_extractions_completion_state check (
    (status in ('succeeded', 'failed') and completed_at is not null)
    or (status in ('pending', 'processing') and completed_at is null)
  ),
  constraint document_extractions_error_state check (
    (status = 'failed' and error_message is not null)
    or (status <> 'failed' and error_code is null and error_message is null)
  )
);

alter table public.onboarding_records
  add constraint onboarding_accepted_extraction_fkey
  foreign key (accepted_extraction_id) references public.document_extractions(id) on delete set null;

create index onboarding_records_status_updated_idx
  on public.onboarding_records (status, updated_at desc);
create index onboarding_records_source_document_idx
  on public.onboarding_records (source_document_id) where source_document_id is not null;
create index onboarding_records_accepted_extraction_idx
  on public.onboarding_records (accepted_extraction_id) where accepted_extraction_id is not null;
create index document_extractions_record_created_idx
  on public.document_extractions (onboarding_record_id, created_at desc);
create index document_extractions_student_created_idx
  on public.document_extractions (student_id, created_at desc);
create index document_extractions_document_idx
  on public.document_extractions (document_id);

create trigger onboarding_records_set_updated_at before update on public.onboarding_records
for each row execute function private.set_updated_at();

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
    raise exception using errcode = '23514', message = 'onboarding source must be an owned PDF or image';
  end if;

  if new.accepted_extraction_id is not null and not exists (
    select 1 from public.document_extractions extraction
    where extraction.id = new.accepted_extraction_id
      and extraction.onboarding_record_id = new.id
      and extraction.student_id = new.student_id
      and extraction.document_id = new.source_document_id
      and extraction.status = 'succeeded'
  ) then
    raise exception using errcode = '23514', message = 'accepted extraction must be a successful extraction for this record';
  end if;

  if tg_op = 'UPDATE' and old.status <> new.status and not (
    (old.status = 'draft' and new.status in ('extraction_pending', 'review_required', 'ready', 'cancelled'))
    or (old.status = 'extraction_pending' and new.status in ('draft', 'review_required', 'cancelled'))
    or (old.status = 'review_required' and new.status in ('draft', 'ready', 'cancelled'))
    or (old.status = 'ready' and new.status in ('review_required', 'submitted', 'cancelled'))
    or (old.status = 'cancelled' and new.status = 'draft')
  ) then
    raise exception using errcode = '23514', message = 'invalid onboarding status transition';
  end if;

  return new;
end;
$$;

create or replace function private.guard_document_extraction()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.onboarding_records record
    join public.documents document on document.id = new.document_id
    where record.id = new.onboarding_record_id
      and record.student_id = new.student_id
      and document.student_id = new.student_id
      and document.mime_type in ('application/pdf', 'image/png', 'image/jpeg', 'image/webp')
  ) then
    raise exception using errcode = '23514', message = 'extraction must use an owned onboarding PDF or image';
  end if;

  if tg_op = 'UPDATE' and old.status <> new.status and not (
    (old.status = 'pending' and new.status in ('processing', 'succeeded', 'failed'))
    or (old.status = 'processing' and new.status in ('succeeded', 'failed'))
  ) then
    raise exception using errcode = '23514', message = 'invalid extraction status transition';
  end if;

  return new;
end;
$$;

revoke all on function private.guard_onboarding_record() from public, anon, authenticated;
revoke all on function private.guard_document_extraction() from public, anon, authenticated;

create trigger onboarding_records_guard
before insert or update on public.onboarding_records
for each row execute function private.guard_onboarding_record();

create trigger document_extractions_guard
before insert or update on public.document_extractions
for each row execute function private.guard_document_extraction();

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
  if exists (
    select 1 from public.profiles current_profile
    where current_profile.id = p_student_id and current_profile.onboarding_completed_at is not null
  ) then
    raise exception using errcode = 'P0001', message = 'PROFILE_ALREADY_LOCKED';
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
      onboarding_completed_at = now()
  where id = p_student_id
    and onboarding_completed_at is null
  returning * into v_profile;

  if not found then
    raise exception using errcode = 'P0001', message = 'PROFILE_ALREADY_LOCKED';
  end if;

  update public.onboarding_records
  set status = 'submitted', submitted_at = v_profile.onboarding_completed_at
  where id = v_record.id;

  return v_profile;
end;
$$;

revoke all on function public.submit_onboarding_record(uuid, uuid, timestamptz)
  from public, anon, authenticated;
grant execute on function public.submit_onboarding_record(uuid, uuid, timestamptz)
  to service_role;

revoke all on public.onboarding_records, public.document_extractions
  from public, anon, authenticated;
grant select, insert, update, delete on public.onboarding_records, public.document_extractions
  to service_role;

-- student profile identity and academic fields are never writable through the data api.
revoke insert, update, delete on public.profiles from anon, authenticated;

alter table public.onboarding_records enable row level security;
alter table public.document_extractions enable row level security;

create policy onboarding_records_no_direct_access
on public.onboarding_records for all to authenticated
using (false) with check (false);

create policy document_extractions_no_direct_access
on public.document_extractions for all to authenticated
using (false) with check (false);
