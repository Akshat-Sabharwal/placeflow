import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'
// @ts-expect-error deno edge imports use explicit typescript extensions.
import { classifyWebhook, type WebhookPayload } from './events.ts'

declare const Deno: {
  env: { get(name: string): string | undefined }
  serve(handler: (request: Request) => Response | Promise<Response>): void
}

const encoder = new TextEncoder()

function env(name: string): string {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Missing ${name}`)
  return value
}

function secretKey(): string {
  const named = Deno.env.get('SUPABASE_SECRET_KEYS')
  if (named) {
    const keys = JSON.parse(named) as Record<string, string>
    return keys.default ?? Object.values(keys)[0]
  }
  return env('SUPABASE_SERVICE_ROLE_KEY')
}

function safeEqual(left: string, right: string): boolean {
  const a = encoder.encode(left)
  const b = encoder.encode(right)
  if (a.length !== b.length) return false
  let result = 0
  for (let index = 0; index < a.length; index += 1) result |= a[index] ^ b[index]
  return result === 0
}

const normalizeBranch = (value: string) => value.trim().replace(/\s+/g, ' ').toUpperCase()

Deno.serve(async (request: Request) => {
  const suppliedSecret = request.headers.get('x-placement-webhook-secret') ?? ''
  if (!safeEqual(suppliedSecret, env('PLACEMENT_WEBHOOK_SECRET'))) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  let payload: WebhookPayload
  try {
    payload = await request.json()
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 })
  }
  const event = classifyWebhook(payload)
  if (!event) return Response.json({ ignored: true })

  const supabase = createClient(env('SUPABASE_URL'), secretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  try {
    let recipients: string[] = []
    let notification: {
      event_key: string; type: string; title: string; body: string; url: string;
      drive_id?: string; application_id?: string
    }

    if (event.kind === 'application_status_changed') {
      const application = event.record
      const { data: drive } = await supabase.from('drives').select('company_name').eq('id', application.drive_id).single()
      recipients = [String(application.student_id)]
      notification = {
        event_key: `application:${application.id}:status:${application.status}:${application.updated_at}`,
        type: event.kind,
        title: 'Application updated',
        body: `${drive?.company_name ?? 'Placement drive'} — ${String(application.status)}`,
        url: '/student/applications',
        application_id: String(application.id),
        drive_id: String(application.drive_id),
      }
    } else {
      const drive = event.record
      const { data: creator } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', drive.created_by)
        .maybeSingle()
      const demoDrive = creator?.email?.endsWith('@placeflow.demo') ?? false
      const { data: studentRoles, error: roleError } = await supabase.from('user_roles').select('user_id').eq('role', 'student')
      if (roleError) throw roleError
      const ids = (studentRoles ?? []).map((role) => role.user_id)
      const { data: profiles, error: profileError } = ids.length
        ? await supabase.from('profiles').select('id,email,branch,graduation_year,cgpa,backlogs,onboarding_completed_at').in('id', ids)
        : { data: [], error: null }
      if (profileError) throw profileError
      recipients = (profiles ?? []).filter((profile) =>
        (!demoDrive || profile.email.endsWith('@placeflow.demo')) &&
        profile.onboarding_completed_at && profile.branch && profile.graduation_year !== null &&
        profile.cgpa !== null && profile.backlogs !== null &&
        (drive.eligible_branches as string[]).some((branch) => normalizeBranch(branch) === normalizeBranch(profile.branch)) &&
        (drive.eligible_years as number[]).includes(profile.graduation_year) &&
        profile.cgpa >= Number(drive.minimum_cgpa) && profile.backlogs <= Number(drive.maximum_backlogs)
      ).map((profile) => profile.id)

      const cancelled = drive.status === 'cancelled'
      notification = {
        event_key: `drive:${drive.id}:${cancelled ? 'cancelled' : event.kind}:${drive.updated_at}`,
        type: event.kind,
        title: cancelled ? 'Placement drive cancelled' : event.kind === 'drive_published' ? 'New placement drive' : 'Placement drive updated',
        body: `${drive.company_name} — ${drive.job_role}`,
        url: `/student/drives/${drive.id}`,
        drive_id: String(drive.id),
      }
    }

    if (!recipients.length) return Response.json({ processed: true, recipients: 0 })
    const rows = recipients.map((user_id) => ({ user_id, ...notification }))
    const { data: inserted, error: insertError } = await supabase
      .from('notifications')
      .upsert(rows, { onConflict: 'user_id,event_key', ignoreDuplicates: true })
      .select('user_id')
    if (insertError) throw insertError
    const newRecipients = (inserted ?? []).map((row) => row.user_id)
    if (!newRecipients.length) return Response.json({ processed: true, duplicate: true })

    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from('push_subscriptions').select('id,user_id,endpoint,p256dh,auth').in('user_id', newRecipients)
    if (subscriptionsError) throw subscriptionsError

    webpush.setVapidDetails(
      Deno.env.get('VAPID_SUBJECT') ?? 'mailto:noreply@placeflow.app',
      env('VAPID_PUBLIC_KEY'),
      env('VAPID_PRIVATE_KEY'),
    )
    const pushPayload = JSON.stringify({
      type: notification.type,
      title: notification.title,
      body: notification.body,
      url: notification.url,
      entityId: notification.application_id ?? notification.drive_id,
      eventKey: notification.event_key,
    })

    let sent = 0, expired = 0, failed = 0
    for (const subscription of subscriptions ?? []) {
      try {
        await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, pushPayload)
        sent += 1
      } catch (error) {
        const statusCode = typeof error === 'object' && error !== null && 'statusCode' in error
          ? Number(error.statusCode)
          : 0
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', subscription.id)
          expired += 1
        } else failed += 1
      }
    }
    console.log(JSON.stringify({ event: notification.type, recipients: newRecipients.length, sent, expired, failed }))
    return Response.json({ processed: true, recipients: newRecipients.length, sent, expired, failed })
  } catch (error) {
    console.error('send-push failed', { event: event.kind, message: error instanceof Error ? error.message : 'unknown' })
    return Response.json({ error: 'processing_failed' }, { status: 500 })
  }
})
