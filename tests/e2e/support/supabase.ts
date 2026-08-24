import type { BrowserContext } from '@playwright/test'
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database.types'

export type TestActor = {
  id: string
  email: string
  name: string
  role: 'student' | 'coordinator'
  session: Session
  client: SupabaseClient<Database>
}

function required(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`missing ${name} for authenticated tests`)
  return value
}

export const testEnv = {
  url: required('NEXT_PUBLIC_SUPABASE_URL'),
  publishableKey: required('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
  secretKey: required('SUPABASE_SECRET_KEY'),
}

export const admin = createClient<Database>(testEnv.url, testEnv.secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

function sessionClient(session: Session) {
  return createClient<Database>(testEnv.url, testEnv.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${session.access_token}` } },
  })
}

export async function createActor(role: TestActor['role'], runId: string, label: string): Promise<TestActor> {
  const email = `placeflow-e2e+${runId}-${label}@example.com`
  const name = role === 'coordinator' ? 'Test Coordinator' : label === 'outsider' ? 'Outside Student' : 'Test Student'
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: name, name },
  })
  if (createError || !created.user) throw new Error(createError?.message ?? 'test user creation failed')

  if (role === 'coordinator') {
    const { error } = await admin.from('user_roles').update({ role }).eq('user_id', created.user.id)
    if (error) throw new Error(error.message)
  }

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
  if (linkError || !link.properties?.hashed_token) throw new Error(linkError?.message ?? 'test session link failed')
  const auth = createClient<Database>(testEnv.url, testEnv.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: verified, error: verifyError } = await auth.auth.verifyOtp({
    type: 'email',
    token_hash: link.properties.hashed_token,
  })
  if (verifyError || !verified.session) throw new Error(verifyError?.message ?? 'test session verification failed')

  return {
    id: created.user.id,
    email,
    name,
    role,
    session: verified.session,
    client: sessionClient(verified.session),
  }
}

export function authCookies(actor: TestActor, baseURL: string): Parameters<BrowserContext['addCookies']>[0] {
  const projectRef = new URL(testEnv.url).hostname.split('.')[0]
  const cookieName = `sb-${projectRef}-auth-token`
  const encoded = `base64-${Buffer.from(JSON.stringify(actor.session), 'utf8').toString('base64url')}`
  const chunks = Array.from({ length: Math.ceil(encoded.length / 3180) }, (_, index) => encoded.slice(index * 3180, (index + 1) * 3180))
  return chunks.map((value, index) => ({
    name: chunks.length === 1 ? cookieName : `${cookieName}.${index}`,
    value,
    url: baseURL,
    httpOnly: false,
    secure: baseURL.startsWith('https:'),
    sameSite: 'Lax',
  }))
}

export async function authenticateContext(context: BrowserContext, actor: TestActor, baseURL: string) {
  await context.addCookies(authCookies(actor, baseURL))
}

export async function cleanupActors(actors: TestActor[]) {
  const ids = actors.map((actor) => actor.id)
  if (!ids.length) return

  const { data: documents } = await admin.from('documents').select('storage_path').in('student_id', ids)
  const paths = (documents ?? []).map((document) => document.storage_path)
  if (paths.length) await admin.storage.from('student-documents').remove(paths)

  const { data: drives } = await admin.from('drives').select('id').in('created_by', ids)
  const driveIds = (drives ?? []).map((drive) => drive.id)
  if (driveIds.length) {
    await admin.from('notifications').delete().in('drive_id', driveIds)
    await admin.from('applications').delete().in('drive_id', driveIds)
    await admin.from('drives').delete().in('id', driveIds)
  }
  await admin.from('notifications').delete().in('user_id', ids)
  await admin.from('documents').delete().in('student_id', ids)

  for (const actor of actors) await admin.auth.admin.deleteUser(actor.id)
}
