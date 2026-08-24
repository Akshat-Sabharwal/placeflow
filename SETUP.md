# PlaceFlow setup

The application is complete in source. No code changes are required for a new deployment: supply credentials, run the provisioning command, and connect the repository to Vercel.

## 1. Create the Supabase project

Create one hosted Supabase project and collect these values:

- project URL
- publishable key
- secret key
- project reference
- database password
- a Supabase personal access token for the CLI provisioning command

Copy `.env.example` to `.env.local` and fill the matching fields. Secret values must never use a `NEXT_PUBLIC_` name.

## 2. Configure OAuth in Supabase

PlaceFlow supports exactly two providers:

1. Google
2. GitHub

There is no LinkedIn OAuth integration.

For both provider applications, use this provider callback URL:

```text
https://<project-ref>.supabase.co/auth/v1/callback
```

In Supabase Auth, disable the Email provider, enable Google and GitHub, and paste each provider's Client ID and Client Secret. Provider secrets remain in Supabase; they do not belong in `.env.local` or Vercel.

In Supabase Auth URL Configuration, set the production Site URL and add these redirect URLs:

```text
http://localhost:3000/auth/callback
https://<your-vercel-domain>/auth/callback
```

Google setup also needs the application origin in Authorized JavaScript origins. GitHub needs the application URL as its Homepage URL.

## 3. Create push credentials

Generate one VAPID pair:

```bash
npx web-push generate-vapid-keys --json
```

Put the public key in `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, the private key in `VAPID_PRIVATE_KEY`, and use a contact address for `VAPID_SUBJECT`, for example `mailto:placements@example.edu`.

Generate a long random `PLACEMENT_WEBHOOK_SECRET`. The provisioning command stores the same value in Supabase Vault and Edge Function secrets. It is never exposed to the browser.

## 4. Provision Supabase

With the completed `.env.local` in the repository root, run:

```bash
npm run supabase:deploy
```

This command:

- links the hosted Supabase project
- pushes every database migration
- provisions the private Storage bucket, grants, and RLS policies
- stores webhook routing values in Supabase Vault
- deploys `send-push` with its secrets and webhook authentication
- refreshes generated TypeScript database types

Database webhook triggers are source-controlled. There is no separate webhook configuration to recreate in the dashboard.

## 5. Deploy Next.js

Import the repository into Vercel and add only these application variables:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_VAPID_PUBLIC_KEY
```

Set `NEXT_PUBLIC_APP_URL` to the final HTTPS origin, redeploy, and confirm that the same origin is present in the Supabase Auth redirect allow-list.

Before the first smoke test:

```bash
npm run setup:check
```

## 6. Promote a coordinator

Every first-time OAuth user is safely created as a student. Ask the coordinator to sign in once, then run:

```bash
npm run supabase:promote -- coordinator@example.edu
```

There is deliberately no coordinator-promotion button or public role-management endpoint.

## Final smoke test

Use one student and one coordinator account:

1. Coordinator signs in and publishes a drive.
2. Student completes onboarding, uploads a PDF resume, and applies.
3. Coordinator sees the applicant, opens the temporary resume URL, and shortlists the application.
4. Student sees the new status through polling and, if enabled, browser push.

The full workflow must also work with browser notifications disabled.
