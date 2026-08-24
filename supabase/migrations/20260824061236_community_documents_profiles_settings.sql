create type public.profile_visibility as enum ('public', 'private');
create type public.theme_preference as enum ('light', 'dark');
create type public.community_visibility as enum ('public', 'private');
create type public.community_member_role as enum ('owner', 'moderator', 'member');
create type public.community_member_status as enum ('pending', 'active', 'rejected');

alter table public.profiles
  add column profile_visibility public.profile_visibility not null default 'public',
  add column show_group_memberships boolean not null default true,
  add column theme_preference public.theme_preference not null default 'light',
  add column default_group_visibility public.community_visibility not null default 'public';

alter table public.documents drop constraint documents_size_valid;
alter table public.documents
  add constraint documents_size_valid check (size_bytes > 0 and size_bytes <= 52428800);

create table public.community_groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  slug text not null unique,
  description text not null default '',
  visibility public.community_visibility not null default 'public',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_groups_name_length check (char_length(name) between 2 and 80),
  constraint community_groups_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length(slug) between 2 and 80),
  constraint community_groups_description_length check (char_length(description) <= 1000)
);

create table public.community_members (
  group_id uuid not null references public.community_groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.community_member_role not null default 'member',
  status public.community_member_status not null default 'pending',
  requested_at timestamptz not null default now(),
  joined_at timestamptz,
  primary key (group_id, user_id),
  constraint community_members_joined_state check (
    (status = 'active' and joined_at is not null) or
    (status <> 'active' and joined_at is null)
  ),
  constraint community_members_owner_active check (role <> 'owner' or status = 'active')
);

create table public.community_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.community_groups(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  reply_to_id uuid references public.community_messages(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_messages_body_length check (char_length(btrim(body)) between 1 and 4000)
);

create index community_groups_visibility_created_idx
  on public.community_groups (visibility, created_at desc);
create index community_members_user_status_idx
  on public.community_members (user_id, status, requested_at desc);
create index community_members_group_status_idx
  on public.community_members (group_id, status, requested_at asc);
create index community_messages_group_created_idx
  on public.community_messages (group_id, created_at desc);
create index community_messages_reply_idx
  on public.community_messages (reply_to_id) where reply_to_id is not null;

create trigger community_groups_set_updated_at before update on public.community_groups
for each row execute function private.set_updated_at();
create trigger community_messages_set_updated_at before update on public.community_messages
for each row execute function private.set_updated_at();

create or replace function private.bootstrap_community_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.community_members (group_id, user_id, role, status, joined_at)
  values (new.id, new.owner_id, 'owner', 'active', now());
  return new;
end;
$$;

create or replace function private.guard_community_message()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.community_members member
    where member.group_id = new.group_id
      and member.user_id = new.author_id
      and member.status = 'active'
  ) then
    raise exception using errcode = '23514', message = 'message author must be an active group member';
  end if;

  if new.reply_to_id is not null and not exists (
    select 1 from public.community_messages parent
    where parent.id = new.reply_to_id and parent.group_id = new.group_id
  ) then
    raise exception using errcode = '23514', message = 'reply must target a message in the same group';
  end if;
  return new;
end;
$$;

revoke all on function private.bootstrap_community_owner() from public, anon, authenticated;
revoke all on function private.guard_community_message() from public, anon, authenticated;

create trigger community_groups_bootstrap_owner
after insert on public.community_groups
for each row execute function private.bootstrap_community_owner();
create trigger community_messages_guard
before insert or update of group_id, author_id, reply_to_id on public.community_messages
for each row execute function private.guard_community_message();

revoke all on public.community_groups, public.community_members, public.community_messages
  from public, anon, authenticated;
grant select, insert, update, delete on
  public.community_groups, public.community_members, public.community_messages
  to service_role;

alter table public.community_groups enable row level security;
alter table public.community_members enable row level security;
alter table public.community_messages enable row level security;

update storage.buckets
set public = false,
    file_size_limit = 52428800,
    allowed_mime_types = array[
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/webp',
      'text/plain',
      'text/csv',
      'application/rtf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ]
where id = 'student-documents';

drop policy if exists student_documents_insert_own on storage.objects;
create policy student_documents_insert_own
on storage.objects for insert to authenticated
with check (
  bucket_id = 'student-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (storage.foldername(name))[2] in ('resume', 'marksheet', 'other')
  and lower(storage.extension(name)) in (
    'pdf', 'png', 'jpg', 'jpeg', 'webp', 'txt', 'csv', 'rtf',
    'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'
  )
);
