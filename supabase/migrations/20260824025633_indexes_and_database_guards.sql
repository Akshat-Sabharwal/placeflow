create index drives_status_deadline_idx on public.drives (status, registration_deadline);
create index drives_updated_idx on public.drives (updated_at desc);
create index applications_student_updated_idx on public.applications (student_id, updated_at desc);
create index applications_drive_applied_idx on public.applications (drive_id, applied_at desc);
create index applications_drive_status_applied_idx on public.applications (drive_id, status, applied_at desc);
create index documents_student_uploaded_idx on public.documents (student_id, uploaded_at desc);
create index notifications_user_created_idx on public.notifications (user_id, created_at desc);
create index notifications_user_read_created_idx on public.notifications (user_id, read_at, created_at desc);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

create or replace function private.guard_application_document()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.documents d
    where d.id = new.resume_document_id
      and d.student_id = new.student_id
      and d.type = 'resume'
      and d.mime_type = 'application/pdf'
  ) then
    raise exception using errcode = '23514', message = 'application resume must be an owned PDF resume';
  end if;

  if tg_op = 'INSERT' and not exists (
    select 1
    from public.profiles p
    join public.drives dr on dr.id = new.drive_id
    where p.id = new.student_id
      and p.onboarding_completed_at is not null
      and p.branch is not null
      and p.graduation_year is not null
      and p.cgpa is not null
      and p.backlogs is not null
      and dr.status = 'published'
      and now() < dr.registration_deadline
      and p.graduation_year = any(dr.eligible_years)
      and p.cgpa >= dr.minimum_cgpa
      and p.backlogs <= dr.maximum_backlogs
      and exists (
        select 1 from unnest(dr.eligible_branches) candidate
        where upper(regexp_replace(trim(candidate), '\s+', ' ', 'g')) =
              upper(regexp_replace(trim(p.branch), '\s+', ' ', 'g'))
      )
  ) then
    raise exception using errcode = '23514', message = 'application eligibility check failed';
  end if;
  return new;
end;
$$;

revoke all on function private.guard_application_document() from public, anon, authenticated;

create trigger applications_guard_document
before insert or update of student_id, resume_document_id on public.applications
for each row execute function private.guard_application_document();

create or replace function private.guard_drive_status_transition()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.status = new.status then return new; end if;
  if not (
    (old.status = 'draft' and new.status in ('published', 'cancelled')) or
    (old.status = 'published' and new.status in ('registration_closed', 'cancelled')) or
    (old.status = 'registration_closed' and new.status in ('ongoing', 'cancelled')) or
    (old.status = 'ongoing' and new.status in ('completed', 'cancelled'))
  ) then raise exception using errcode = '23514', message = 'invalid drive status transition'; end if;
  return new;
end;
$$;

create or replace function private.guard_application_status_transition()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.status = new.status then return new; end if;
  if not (
    (old.status = 'applied' and new.status in ('shortlisted', 'rejected')) or
    (old.status = 'shortlisted' and new.status in ('selected', 'rejected'))
  ) then raise exception using errcode = '23514', message = 'invalid application status transition'; end if;
  return new;
end;
$$;

revoke all on function private.guard_drive_status_transition() from public, anon, authenticated;
revoke all on function private.guard_application_status_transition() from public, anon, authenticated;

create trigger drives_guard_status before update of status on public.drives
for each row execute function private.guard_drive_status_transition();
create trigger applications_guard_status before update of status on public.applications
for each row execute function private.guard_application_status_transition();

-- Source-controlled database webhook. Deployment automation stores the project URL
-- as `placeflow_project_url` and the shared secret as `placement_webhook_secret`
-- in Supabase Vault. Until both exist, workflow writes still succeed and polling
-- remains authoritative; only advisory push is skipped.
create or replace function private.dispatch_placeflow_webhook()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  function_base_url text;
  webhook_secret text;
  request_body jsonb;
begin
  select decrypted_secret into function_base_url
  from vault.decrypted_secrets where name = 'placeflow_project_url' limit 1;

  select decrypted_secret into webhook_secret
  from vault.decrypted_secrets where name = 'placement_webhook_secret' limit 1;

  if function_base_url is null or webhook_secret is null then
    return new;
  end if;

  request_body := jsonb_build_object(
    'type', tg_op,
    'table', tg_table_name,
    'schema', tg_table_schema,
    'record', case when tg_op = 'DELETE' then null else to_jsonb(new) end,
    'old_record', case when tg_op = 'INSERT' then null else to_jsonb(old) end
  );

  perform net.http_post(
    url := rtrim(function_base_url, '/') || '/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-placement-webhook-secret', webhook_secret
    ),
    body := request_body,
    timeout_milliseconds := 5000
  );

  return new;
end;
$$;

revoke all on function private.dispatch_placeflow_webhook() from public, anon, authenticated;

create trigger drives_send_placeflow_webhook
after insert or update on public.drives
for each row execute function private.dispatch_placeflow_webhook();

create trigger applications_send_placeflow_webhook
after update on public.applications
for each row execute function private.dispatch_placeflow_webhook();
