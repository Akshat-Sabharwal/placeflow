create extension if not exists citext;
create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault with schema vault;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.app_role as enum ('student', 'coordinator');
create type public.drive_status as enum (
  'draft', 'published', 'registration_closed', 'ongoing', 'completed', 'cancelled'
);
create type public.application_status as enum ('applied', 'shortlisted', 'selected', 'rejected');
create type public.document_type as enum ('resume', 'marksheet', 'other');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email citext not null,
  full_name text,
  avatar_url text,
  primary_provider text,
  roll_number text unique,
  branch text,
  graduation_year integer,
  cgpa numeric(4,2),
  backlogs integer,
  linkedin_url text,
  github_url text,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_full_name_length check (full_name is null or char_length(full_name) between 1 and 120),
  constraint profiles_roll_number_length check (roll_number is null or char_length(roll_number) between 1 and 64),
  constraint profiles_branch_length check (branch is null or char_length(branch) between 1 and 64),
  constraint profiles_graduation_year_range check (graduation_year is null or graduation_year between 2000 and 2100),
  constraint profiles_cgpa_range check (cgpa is null or cgpa between 0 and 10),
  constraint profiles_backlogs_range check (backlogs is null or backlogs between 0 and 99)
);

create table public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'student',
  granted_at timestamptz not null default now()
);

create table public.drives (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id) on delete restrict,
  company_name text not null,
  job_role text not null,
  description text not null default '',
  location text,
  package_text text,
  eligible_branches text[] not null,
  eligible_years integer[] not null,
  minimum_cgpa numeric(4,2) not null default 0,
  maximum_backlogs integer not null default 99,
  registration_deadline timestamptz not null,
  drive_date timestamptz,
  status public.drive_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint drives_company_name_length check (char_length(company_name) between 1 and 160),
  constraint drives_job_role_length check (char_length(job_role) between 1 and 160),
  constraint drives_description_length check (char_length(description) <= 10000),
  constraint drives_eligible_branches_nonempty check (cardinality(eligible_branches) > 0),
  constraint drives_eligible_years_nonempty check (cardinality(eligible_years) > 0),
  constraint drives_minimum_cgpa_range check (minimum_cgpa between 0 and 10),
  constraint drives_maximum_backlogs_range check (maximum_backlogs between 0 and 99),
  constraint drives_date_order check (drive_date is null or drive_date >= registration_deadline)
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  type public.document_type not null,
  storage_path text not null unique,
  original_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  uploaded_at timestamptz not null default now(),
  constraint documents_storage_path_length check (char_length(storage_path) between 1 and 500),
  constraint documents_original_name_length check (char_length(original_name) between 1 and 255),
  constraint documents_mime_type_length check (char_length(mime_type) between 1 and 100),
  constraint documents_size_valid check (size_bytes > 0 and size_bytes <= 10485760)
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete restrict,
  drive_id uuid not null references public.drives(id) on delete restrict,
  resume_document_id uuid not null references public.documents(id) on delete restrict,
  status public.application_status not null default 'applied',
  applied_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint applications_one_per_student_drive unique (student_id, drive_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_key text not null,
  type text not null,
  title text not null,
  body text not null,
  url text not null,
  drive_id uuid references public.drives(id) on delete cascade,
  application_id uuid references public.applications(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_event_key_length check (char_length(event_key) between 1 and 300),
  constraint notifications_type_length check (char_length(type) between 1 and 100),
  constraint notifications_user_event_unique unique (user_id, event_key)
);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  constraint push_endpoint_length check (char_length(endpoint) between 10 and 3000),
  constraint push_p256dh_length check (char_length(p256dh) between 16 and 512),
  constraint push_auth_length check (char_length(auth) between 8 and 512)
);
