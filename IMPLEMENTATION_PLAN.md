# PlaceFlow implementation plan

This plan refines the original specification pack into an implementation contract. The original data model, route names, role model, private-document rules, polling model, and server-side authorization rules remain authoritative. LinkedIn OAuth is intentionally removed; the application supports Google and GitHub only.

## Product principles

- One obvious action per screen, with secondary actions visually quieter.
- PostgreSQL owns workflow truth. Cached data, toasts, and push messages only explain persisted state.
- Every async action has an idle, pending, success, and failure presentation.
- Forms validate locally while the user works and are validated again at the server boundary.
- Disabled controls always explain why they are disabled.
- Background refresh never blanks already-rendered content.
- Color reinforces meaning but never carries meaning alone.
- Mobile layouts preserve the full workflow instead of hiding important fields.

## Visual system

PlaceFlow uses a minimal editorial visual language rather than a conventional dashboard theme.

- Display and body type: Bricolage Grotesque, loaded through `next/font`.
- Canvas: warm paper `#F4F0E8`.
- Ink: near-black `#171817`.
- Primary signal: vivid vermilion `#F4512C`.
- Surfaces: white and paper tints with crisp ink borders.
- Semantic colors are reserved for status feedback: green for success/eligible, amber for warnings, red for destructive/error states, and blue for informational state.
- Corners are modest, shadows are sparse, and abstract geometric marks provide identity without decorative illustration.

## Module 1 — public landing and authentication

The root page is a semantic landing page with a skip link, header/navigation, hero, product workflow, role explanation, trust principles, final call to action, and footer.

- Hero copy describes a single placement workflow, not generic productivity claims.
- A compact abstract workflow composition visually connects `publish → apply → decide`.
- Primary CTA opens sign-in; a secondary anchor explains how the product works.
- Login offers exactly Google and GitHub. Provider buttons show a pending state and prevent repeated OAuth starts.
- Authentication failures land on a readable recovery page with retry and return-home actions.
- `/post-auth` verifies the viewer, obtains the sealed database role, and routes students to onboarding/home or coordinators to their workspace.

Acceptance details:

- No LinkedIn provider identifier, OAuth label/logo, OAuth environment variable, or provider setup step appears in the implemented product. The optional, user-entered LinkedIn profile URL remains ordinary profile data and never affects authentication or authorization.
- All interactive elements have visible focus treatment and useful accessible names.
- Reduced-motion preferences disable nonessential entrance motion.

## Module 2 — student onboarding and profile

The onboarding form collects full name, roll number, branch, graduation year, CGPA, backlogs, and optional GitHub URL.

- Fields validate after first blur and then on each change.
- Valid fields receive a quiet confirmation mark; invalid fields show an icon, specific inline message, and `aria-describedby` association.
- Numeric inputs reject impossible values but do not fight intermediate typing states.
- A compact completion meter groups identity, academics, and links.
- Submit remains available only when the client schema is valid, and the server repeats the same authoritative checks.
- On save, only the form is disabled, the button announces progress, a success toast appears, profile queries are invalidated, and onboarding redirects to the student home.
- Server conflicts such as duplicate roll numbers are mapped back to the relevant field when possible.
- The profile page reuses the same schema and field components and warns before discarding dirty edits.

## Module 3 — student documents

The document workspace exposes a direct-to-Supabase private PDF upload and an immutable document list.

- Drop zone and file picker accept one PDF up to 10 MiB.
- Type and size are checked immediately before network work.
- Upload presentation has selecting, validating, uploading, recording metadata, complete, and failed stages.
- Storage bytes use a UUID path under the current user prefix; original filenames never become object keys.
- Metadata is posted only after Storage succeeds. A metadata failure triggers best-effort orphan cleanup and explains the result.
- Success adds the document without waiting for a refetch and shows a toast.
- Delete requires confirmation; `DOCUMENT_IN_USE` becomes a durable inline explanation rather than a generic toast.
- Empty state connects the task to applying: “Upload a resume before applying to a drive.”

## Module 4 — student drive discovery and application

Drive discovery is a focused feed with search and status filters.

- Initial load uses stable skeleton cards; 15-second polling keeps existing content visible.
- Each card shows company, role, location, package, deadline, status, and a labelled eligibility outcome.
- Drive detail includes description, facts, eligibility checklist, deadline state, and application action.
- The eligibility panel explains each rule independently and distinguishes incomplete profile, missing resume, ineligible academics, deadline closure, and an existing application.
- Resume selection is explicit when more than one resume exists.
- Apply uses a confirmation dialog summarizing the drive and selected resume.
- While pending, Apply is disabled and duplicate clicks are ignored.
- Success invalidates the drive and application query keys, updates the visible state, and announces it by toast.
- Server rejections preserve the page and render actionable guidance next to the application panel.

## Module 5 — student applications and notifications

- Application history groups current and finished outcomes and shows a text-labelled status timeline.
- Ten-second polling preserves stale data and uses a small “updating” indicator.
- The notification panel supports unread state, navigation, and marking items read.
- Push permission is requested only after an explicit user action.
- Denial produces a one-time explanation that in-app notifications and polling still work.
- Service-worker notifications contain no private academic or resume data.

## Module 6 — coordinator drive management

The coordinator workspace prioritizes active drives and tasks, not analytics charts.

- Dashboard shows active-drive count, total current applications, latest drives, and Create drive.
- Drive list filters Active, Completed, Cancelled, and All without losing URL state.
- Create and Edit share one form schema and field system.
- Drive fields validate as the coordinator types; arrays require at least one branch and year.
- Deadline must be future-facing for publish, and drive date cannot precede the registration deadline.
- Save draft permits incomplete publication-only details while Publish requires the full schema.
- A sticky action bar shows dirty state, Save draft, and Publish.
- Status transitions are exposed only when legal, with clear confirmation for cancel/terminal actions.
- Successful changes invalidate relevant lists/details and create concise toasts.

## Module 7 — applicant review

- The applicant view polls every five seconds only while visible.
- Desktop uses a table; compact screens use labelled cards rather than forcing a wide layout.
- Columns expose only useful review data: name, roll number, branch, CGPA, backlogs, resume, and status.
- Filters support status and a lightweight name/roll search.
- Resume URLs are requested only after “View resume” and are never persisted.
- Status actions show only legal transitions. Terminal-state changes require confirmation.
- Mutations are server-confirmed rather than optimistically committing irreversible state.
- Refresh errors retain existing applicants and present a retry affordance.

## Module 8 — API, domain, and feedback contracts

- Zod schemas define request validation and reusable client constraints.
- API success and error envelopes follow the canonical specification.
- Validation errors include field details that forms can map to controls.
- Authentication, authorization, ownership, role, eligibility, and transition checks precede every privileged write.
- GET responses that contain viewer-specific data use `private, no-store`.
- Toasts are used for transient acknowledgement; inline alerts are used when the user must act; page-level alerts are used for initial load failures.
- Destructive actions require explicit confirmation and never rely on toast-only recovery.

## Module 9 — database, storage, and async notification pipeline

- Migrations create enums, tables, auth bootstrap, timestamp triggers, explicit grants, RLS, private Storage bucket/policies, indexes, and database guards.
- New auth users receive a profile and `student` role through a private trigger function.
- Coordinator promotion remains a trusted SQL operation, never a UI capability.
- Authenticated Data API access is read-only for relational tables; protected writes use verified Route Handlers.
- Browser document upload is the sole direct client mutation and is constrained to the owner’s private Storage prefix.
- Database webhooks call one authenticated Edge Function for meaningful drive/application transitions.
- Notification event keys and database uniqueness make webhook retries idempotent.
- Push failure never rolls back workflow state or persistent notifications.

## Module 10 — verification and handoff

- Unit tests cover eligibility, status transitions, validation, API helpers, and event-key behavior.
- Component tests cover live validation, pending buttons, query invalidation, upload validation, and push opt-in.
- Integration tests cover unauthenticated, wrong-role, foreign-document, duplicate-application, and illegal-transition paths.
- Production checks include lint, TypeScript, tests, `next build`, secret scanning, forbidden LinkedIn/Realtime imports, and responsive browser screenshots.
- `.env.example`, Supabase migrations, Edge Function source, and a keys-only setup guide are committed.
- The final handoff lists only values and dashboard actions that cannot be generated: Supabase URL/keys, Google and GitHub client credentials, VAPID values, webhook secret, redirect URLs, role promotion, and deployment connection.
