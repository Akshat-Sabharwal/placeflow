import { expect, test, type BrowserContext } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { admin, authenticateContext, cleanupActors, createActor, type TestActor } from './support/supabase'

test.describe.configure({ mode: 'serial' })

const baseURL = 'http://localhost:3000'
const runId = `${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`
const company = `Orbit ${runId}`
const rollNumber = `PF-${runId}`.slice(0, 60)
const pdf = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n')

const waitForHydration = (page: import('@playwright/test').Page) =>
  page.waitForFunction(() => document.documentElement.dataset.hydrated === 'true')

let coordinator: TestActor
let student: TestActor
let outsider: TestActor
let coordinatorContext: BrowserContext
let studentContext: BrowserContext
let outsiderContext: BrowserContext
let driveId = ''
let documentId = ''
let storagePath = ''
let applicationId = ''

test.beforeAll(async ({ browser }) => {
  coordinator = await createActor('coordinator', runId, 'coordinator')
  student = await createActor('student', runId, 'student')
  outsider = await createActor('student', runId, 'outsider')
  coordinatorContext = await browser.newContext({ baseURL })
  studentContext = await browser.newContext({ baseURL })
  outsiderContext = await browser.newContext({ baseURL })
  await authenticateContext(coordinatorContext, coordinator, baseURL)
  await authenticateContext(studentContext, student, baseURL)
  await authenticateContext(outsiderContext, outsider, baseURL)
})

test.afterAll(async () => {
  await Promise.allSettled([coordinatorContext?.close(), studentContext?.close(), outsiderContext?.close()])
  await cleanupActors([coordinator, student, outsider].filter(Boolean))
})

test('enforces authentication, role boundaries, origin checks, and validation envelopes', async ({ request }) => {
  await test.step('anonymous API and workspace access are rejected', async () => {
    const response = await request.get('/api/profile')
    expect(response.status()).toBe(401)
    expect(await response.json()).toMatchObject({ error: { code: 'UNAUTHENTICATED' } })
  })

  await test.step('each role reaches only its own workspace', async () => {
    const studentPage = await studentContext.newPage()
    await studentPage.goto('/coordinator')
    await expect(studentPage).toHaveURL(/\/post-auth$/)
    await studentPage.goto('/student')
    await expect(studentPage.getByText('Student workspace')).toBeVisible()

    const coordinatorPage = await coordinatorContext.newPage()
    await coordinatorPage.goto('/student')
    await expect(coordinatorPage).toHaveURL(/\/post-auth$/)
    await coordinatorPage.goto('/coordinator')
    await expect(coordinatorPage.getByText('Coordinator workspace')).toBeVisible()
    await Promise.all([studentPage.close(), coordinatorPage.close()])
  })

  await test.step('students cannot create drives and coordinators cannot edit student profiles', async () => {
    const studentDrive = await studentContext.request.post('/api/drives', { data: {} })
    expect(studentDrive.status()).toBe(403)
    expect(await studentDrive.json()).toMatchObject({ error: { code: 'FORBIDDEN' } })

    const coordinatorProfile = await coordinatorContext.request.patch('/api/profile', { data: {} })
    expect(coordinatorProfile.status()).toBe(403)
    expect(await coordinatorProfile.json()).toMatchObject({ error: { code: 'FORBIDDEN' } })
  })

  await test.step('cross-origin and malformed coordinator mutations fail before persistence', async () => {
    const crossOrigin = await coordinatorContext.request.post('/api/drives', {
      headers: { Origin: 'https://malicious.example' },
      data: {},
    })
    expect(crossOrigin.status()).toBe(403)
    expect(await crossOrigin.json()).toMatchObject({ error: { code: 'FORBIDDEN' } })

    const malformed = await coordinatorContext.request.post('/api/drives', {
      headers: { 'Content-Type': 'application/json' },
      data: '{',
    })
    expect(malformed.status()).toBe(400)
    expect(await malformed.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } })
  })
})

test('completes the student and coordinator lifecycle with private blob and notification checks', async () => {
  test.setTimeout(180_000)
  const studentPage = await studentContext.newPage()
  const coordinatorPage = await coordinatorContext.newPage()

  await test.step('student profile validates as typed and completes onboarding', async () => {
    await studentPage.goto('/student/onboarding')
    await waitForHydration(studentPage)
    const submit = studentPage.getByRole('button', { name: 'Complete profile' })
    await expect(submit).toBeDisabled()
    await studentPage.getByLabel('Roll number').fill(rollNumber)
    await studentPage.getByLabel('Branch').fill(' cse ')
    await studentPage.getByLabel('Graduation year').fill('2027')
    await studentPage.getByLabel('CGPA').fill('11')
    await studentPage.getByLabel('Current backlogs').fill('0')
    await expect(submit).toBeDisabled()
    await studentPage.getByLabel('CGPA').fill('8.75')
    await studentPage.getByLabel('Full name').fill(student.name)
    await expect(studentPage.getByLabel('Full name')).toHaveValue(student.name)
    await studentPage.getByLabel('Full name').press('Tab')
    await studentPage.getByLabel('Roll number').fill(rollNumber)
    await studentPage.getByLabel('Roll number').press('Tab')
    await expect(studentPage.getByLabel('Roll number')).toHaveValue(rollNumber)
    await expect.poll(() => studentPage.getByLabel('Valid').count()).toBeGreaterThanOrEqual(5)
    await expect(submit).toBeEnabled()
    await submit.click()
    await expect(studentPage).toHaveURL(/\/student$/)
    await expect(studentPage.getByText(`Hi, ${student.name.split(' ')[0]}.`)).toBeVisible()
  })

  await test.step('document selection rejects invalid files and uploads a private PDF', async () => {
    await studentPage.goto('/student/documents')
    const input = studentPage.locator('input[type="file"]')
    await input.setInputFiles({ name: 'resume.txt', mimeType: 'text/plain', buffer: Buffer.from('not a pdf') })
    await expect(studentPage.getByText('Choose a PDF file.')).toBeVisible()
    await input.setInputFiles({ name: 'placeflow-resume.pdf', mimeType: 'application/pdf', buffer: pdf })
    await expect(studentPage.getByText('placeflow-resume.pdf')).toBeVisible()
    await studentPage.getByRole('button', { name: 'Upload resume' }).click()
    await expect(studentPage.getByText('Resume uploaded securely.')).toBeVisible()

    const response = await studentContext.request.get('/api/documents')
    expect(response.ok()).toBe(true)
    const body = await response.json()
    expect(body.data).toHaveLength(1)
    documentId = body.data[0].id
    const { data } = await admin.from('documents').select('storage_path').eq('id', documentId).single()
    storagePath = data!.storage_path
  })

  await test.step('storage and metadata RLS isolate the uploaded resume', async () => {
    const ownDownload = await student.client.storage.from('student-documents').download(storagePath)
    expect(ownDownload.error).toBeNull()
    expect(Buffer.from(await ownDownload.data!.arrayBuffer())).toEqual(pdf)

    const outsideDownload = await outsider.client.storage.from('student-documents').download(storagePath)
    expect(outsideDownload.error).not.toBeNull()
    const coordinatorDownload = await coordinator.client.storage.from('student-documents').download(storagePath)
    expect(coordinatorDownload.error).not.toBeNull()

    const { data: outsideDocuments, error: outsideError } = await outsider.client.from('documents').select('*').eq('id', documentId)
    expect(outsideError).toBeNull()
    expect(outsideDocuments).toEqual([])

    const forbiddenPath = `${outsider.id}/resume/${randomUUID()}.pdf`
    const forbiddenUpload = await student.client.storage.from('student-documents').upload(forbiddenPath, pdf, { contentType: 'application/pdf' })
    expect(forbiddenUpload.error).not.toBeNull()
  })

  await test.step('coordinator publishes a drive through the interface', async () => {
    await coordinatorPage.goto('/coordinator/drives/new')
    await waitForHydration(coordinatorPage)
    await coordinatorPage.getByLabel('Company').fill(company)
    await coordinatorPage.getByLabel('Job role').fill('Platform Engineer')
    await coordinatorPage.getByLabel('Location').fill('Remote')
    await coordinatorPage.getByLabel('Package').fill('18 LPA')
    await coordinatorPage.getByLabel('Description').fill('Build reliable placement infrastructure.')
    await coordinatorPage.getByLabel('Eligible branches').fill('cse, CSE, it')
    await coordinatorPage.getByLabel('Eligible graduation years').fill('2027, 2027')
    await coordinatorPage.getByLabel('Minimum CGPA').fill('8')
    await coordinatorPage.getByLabel('Maximum backlogs').fill('0')
    const deadline = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 16)
    const driveDate = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 16)
    await coordinatorPage.getByLabel('Registration deadline').fill(deadline)
    await coordinatorPage.getByLabel('Drive date').fill(driveDate)
    await coordinatorPage.getByLabel('Company').fill(company)
    await coordinatorPage.getByLabel('Company').press('Tab')
    await expect(coordinatorPage.getByLabel('Company')).toHaveValue(company)
    const publish = coordinatorPage.getByRole('button', { name: 'Publish' })
    await expect(publish).toBeEnabled({ timeout: 10_000 })
    await publish.click()
    await expect(coordinatorPage.getByRole('alertdialog')).toBeVisible()
    await coordinatorPage.getByRole('button', { name: 'Publish drive' }).click()
    await expect(coordinatorPage.getByText('Drive published.')).toBeVisible()
    await expect(coordinatorPage).toHaveURL(/\/coordinator\/drives\/[0-9a-f-]+$/, { timeout: 30_000 })
    driveId = coordinatorPage.url().split('/').at(-1)!
  })

  await test.step('student discovers eligibility, submits once, and cannot duplicate', async () => {
    await studentPage.goto('/student/drives')
    await studentPage.getByLabel('Search drives').fill(company)
    await expect(studentPage.getByRole('heading', { name: 'Platform Engineer' })).toBeVisible()
    await studentPage.getByRole('link', { name: 'View drive' }).click()
    await expect(studentPage).toHaveURL(new RegExp(`/student/drives/${driveId}$`), { timeout: 30_000 })
    await expect(studentPage.getByRole('heading', { name: 'You meet the eligibility rules' })).toBeVisible({ timeout: 30_000 })
    await studentPage.getByLabel('Resume').selectOption(documentId)
    await studentPage.getByRole('button', { name: 'Apply now' }).click()
    await studentPage.getByRole('button', { name: 'Submit application' }).click()
    await expect(studentPage.getByText('Application submitted.')).toBeVisible()

    const applications = await studentContext.request.get('/api/applications/me')
    const body = await applications.json()
    applicationId = body.data.find((item: { driveId: string }) => item.driveId === driveId).id
    const duplicate = await studentContext.request.post(`/api/drives/${driveId}/apply`, { data: { resumeDocumentId: documentId } })
    expect(duplicate.status()).toBe(409)
    expect(await duplicate.json()).toMatchObject({ error: { code: 'DUPLICATE_APPLICATION' } })
  })

  await test.step('coordinator sees only an authorized applicant and retrieves the signed resume', async () => {
    await coordinatorPage.goto(`/coordinator/drives/${driveId}`)
    await coordinatorPage.getByRole('button', { name: 'applicants' }).click()
    await coordinatorPage.getByLabel('Search applicants').fill(rollNumber)
    await expect(coordinatorPage.getByText(student.name).first()).toBeVisible()
    await expect(coordinatorPage.getByText(outsider.name)).toHaveCount(0)

    const signed = await coordinatorContext.request.get(`/api/documents/${documentId}/url`)
    expect(signed.ok()).toBe(true)
    expect(signed.headers()['cache-control']).toContain('private, no-store')
    const signedBody = await signed.json()
    const blob = await coordinatorContext.request.get(signedBody.data.signedUrl)
    expect(blob.ok()).toBe(true)
    expect(await blob.body()).toEqual(pdf)
  })

  await test.step('status changes notify the student and can be marked read', async () => {
    const selector = coordinatorPage.getByLabel(`Change status for ${student.name}`).first()
    await selector.selectOption('shortlisted')
    await coordinatorPage.getByRole('button', { name: 'Mark shortlisted' }).click()
    await expect(coordinatorPage.getByText('Application status updated.')).toBeVisible()

    await expect.poll(async () => {
      const response = await studentContext.request.get('/api/notifications?unreadOnly=true')
      const body = await response.json()
      return body.data.some((item: { applicationId: string; title: string }) => item.applicationId === applicationId && item.title === 'Application updated')
    }, { timeout: 20_000 }).toBe(true)

    await studentPage.goto('/student/applications')
    await expect(studentPage.getByText('Shortlisted').first()).toBeVisible()
    await studentPage.getByRole('button', { name: /unread notifications/i }).click()
    await expect(studentPage.getByRole('dialog', { name: 'Notifications' })).toBeVisible()
    await studentPage.getByRole('link', { name: /Application updated/i }).first().click()

    await expect.poll(async () => {
      const response = await studentContext.request.get('/api/notifications')
      const body = await response.json()
      return body.data.find((item: { applicationId: string }) => item.applicationId === applicationId)?.readAt ?? null
    }).not.toBeNull()

    await coordinatorPage.getByLabel(`Change status for ${student.name}`).first().selectOption('selected')
    await coordinatorPage.getByRole('button', { name: 'Mark selected' }).click()
    await expect(coordinatorPage.getByText('Application status updated.')).toBeVisible()
    await studentPage.goto('/student/applications')
    await expect(studentPage.getByText('Selected').first()).toBeVisible()
  })

  await test.step('final states, document references, and status-only drive updates remain guarded', async () => {
    const invalidTransition = await coordinatorContext.request.patch(`/api/applications/${applicationId}/status`, { data: { status: 'rejected' } })
    expect(invalidTransition.status()).toBe(409)
    expect(await invalidTransition.json()).toMatchObject({ error: { code: 'INVALID_STATUS_TRANSITION' } })

    const deleteInUse = await studentContext.request.delete(`/api/documents/${documentId}`)
    expect(deleteInUse.status()).toBe(409)
    expect(await deleteInUse.json()).toMatchObject({ error: { code: 'DOCUMENT_IN_USE' } })

    const closeDrive = await coordinatorContext.request.patch(`/api/drives/${driveId}`, { data: { status: 'registration_closed' } })
    expect(closeDrive.ok()).toBe(true)
    expect((await closeDrive.json()).data).toMatchObject({
      status: 'registration_closed',
      description: 'Build reliable placement infrastructure.',
    })
  })

  await Promise.all([studentPage.close(), coordinatorPage.close()])
})
