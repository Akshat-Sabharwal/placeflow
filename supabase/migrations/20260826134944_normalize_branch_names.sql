update public.profiles
set branch = regexp_replace(branch, '^DEMO-', '', 'i')
where branch ~* '^DEMO-';

update public.onboarding_records
set staged_branch = regexp_replace(staged_branch, '^DEMO-', '', 'i')
where staged_branch ~* '^DEMO-';

update public.document_extractions
set extracted_fields = jsonb_set(
  extracted_fields,
  '{branch}',
  to_jsonb(regexp_replace(extracted_fields ->> 'branch', '^DEMO-', '', 'i'))
)
where extracted_fields ->> 'branch' ~* '^DEMO-';

update public.drives
set eligible_branches = array(
  select regexp_replace(branch_name, '^DEMO-', '', 'i')
  from unnest(eligible_branches) with ordinality as branch(branch_name, position)
  order by position
)
where exists (
  select 1
  from unnest(eligible_branches) as branch(branch_name)
  where branch_name ~* '^DEMO-'
);
