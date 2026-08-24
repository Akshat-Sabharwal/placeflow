create policy community_groups_no_direct_access
on public.community_groups for all to authenticated
using (false) with check (false);

create policy community_members_no_direct_access
on public.community_members for all to authenticated
using (false) with check (false);

create policy community_messages_no_direct_access
on public.community_messages for all to authenticated
using (false) with check (false);

create index if not exists community_groups_owner_idx on public.community_groups (owner_id);
create index if not exists community_messages_author_idx on public.community_messages (author_id);
create index if not exists applications_resume_document_idx on public.applications (resume_document_id);
create index if not exists drives_created_by_idx on public.drives (created_by);
create index if not exists notifications_application_idx on public.notifications (application_id) where application_id is not null;
create index if not exists notifications_drive_idx on public.notifications (drive_id) where drive_id is not null;
