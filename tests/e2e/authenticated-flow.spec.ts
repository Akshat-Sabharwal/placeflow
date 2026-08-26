import { expect, test, type BrowserContext } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { admin, authenticateContext, cleanupActors, createActor, type TestActor } from './support/supabase'

test.describe.configure({ mode: 'serial' })

const baseURL = 'http://localhost:3000'
const runId = `${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`
const company = `Orbit ${runId}`
const rollNumber = `PF-${runId}`.slice(0, 60)

function makePdf(lines: string[]) {
  const escaped = lines.map((line) => line.replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)'))
  const stream = `BT /F1 12 Tf 16 TL 72 720 Td ${escaped.map((line) => `(${line}) Tj T*`).join(' ')} ET`
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ]
  let body = '%PDF-1.4\n'
  const offsets = [0]
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(body))
    body += `${index + 1} 0 obj\n${object}\nendobj\n`
  })
  const xref = Buffer.byteLength(body)
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  body += offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return Buffer.from(body)
}

const pdf = makePdf([
  'Full Name: Test Student',
  `Roll Number: ${rollNumber}`,
  'Branch: CSE',
  'Graduation Year: 2027',
  'CGPA: 8.75',
  'Backlogs: 0',
])

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
let onboardingDocumentId = ''
let storagePath = ''
let applicationId = ''
let publicGroupId = ''
let privateGroupId = ''

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
    await studentPage.waitForURL(/\/student\/onboarding$/)
    await studentPage.goto('/student')
    await expect(studentPage.getByText('Student workspace')).toBeVisible()

    const coordinatorPage = await coordinatorContext.newPage()
    await coordinatorPage.goto('/student')
    await coordinatorPage.waitForURL(/\/coordinator$/)
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

    const studentProfile = await studentContext.request.patch('/api/profile', {
      data: { fullName: 'Direct edit attempt' },
    })
    expect(studentProfile.status()).toBe(403)
    expect(await studentProfile.json()).toMatchObject({ error: { code: 'PROFILE_LOCKED' } })
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
  test.setTimeout(300_000)
  const darkTheme = await admin.from('profiles').update({ theme_preference: 'dark' }).in('id', [student.id, coordinator.id])
  expect(darkTheme.error).toBeNull()
  const studentPage = await studentContext.newPage()
  const coordinatorPage = await coordinatorContext.newPage()
  await studentPage.addInitScript(() => localStorage.setItem('placeflow-theme', 'dark'))
  await coordinatorPage.addInitScript(() => localStorage.setItem('placeflow-theme', 'dark'))

  await test.step('student imports a private source, reviews extracted fields, and locks onboarding', async () => {
    await studentPage.goto('/student/onboarding')
    await waitForHydration(studentPage)
    await expect(studentPage.getByRole('heading', { name: 'Start with a source document.' })).toBeVisible()
    await expect(studentPage.getByRole('heading', { name: 'Prepare a consistent profile source' })).toBeVisible()
    await expect(studentPage.getByText(/full name, roll number, branch, graduation year, CGPA/i)).toBeVisible()
    await expect(studentPage.getByText(/PDF, PNG, JPEG, or WebP file up to 50 MiB/i)).toBeVisible()

    const notifications = studentPage.getByRole('button', { name: /unread notifications/i })
    const signOut = studentPage.getByRole('button', { name: 'Sign out' })
    await expect(notifications).toHaveCSS('background-color', 'rgb(52, 58, 51)')
    await expect(signOut).toHaveCSS('background-color', 'rgb(52, 58, 51)')
    await notifications.hover()
    await expect(notifications).toHaveCSS('background-color', 'rgb(68, 75, 66)')

    await studentPage.locator('input[type="file"]').setInputFiles({
      name: 'institution-record.pdf',
      mimeType: 'application/pdf',
      buffer: pdf,
    })
    await expect(studentPage.getByRole('heading', { name: 'Review and activate your profile' })).toBeVisible({ timeout: 60_000 })
    const submit = studentPage.getByRole('button', { name: 'Activate profile' })
    await expect(studentPage.getByLabel('Roll number')).toHaveValue(rollNumber)
    await expect(studentPage.getByLabel('Branch')).toHaveValue('CSE')
    await studentPage.getByLabel('CGPA').fill('11')
    await expect(submit).toBeDisabled()
    await studentPage.getByLabel('CGPA').fill('8.75')
    await studentPage.getByLabel('Full name').fill(student.name)
    await expect(studentPage.getByLabel('Full name')).toHaveValue(student.name)
    await studentPage.getByLabel('Full name').press('Tab')
    await studentPage.getByLabel('Roll number').fill(rollNumber)
    await studentPage.getByLabel('Roll number').press('Tab')
    await expect(studentPage.getByLabel('Roll number')).toHaveValue(rollNumber)
    await expect.poll(() => studentPage.getByLabel('Valid').count()).toBeGreaterThanOrEqual(3)
    await expect(submit).toBeEnabled()
    await submit.click()
    await expect(studentPage).toHaveURL(/\/student$/, { timeout: 30_000 })
    await expect(studentPage.getByText(`Hi, ${student.name.split(' ')[0]}.`)).toBeVisible()

    const directProfileWrite = await student.client.from('profiles').update({ cgpa: 9.9 }).eq('id', student.id)
    expect(directProfileWrite.error).not.toBeNull()
    const directOnboardingRead = await student.client.from('onboarding_records').select('*')
    expect(directOnboardingRead.error).not.toBeNull()
    const onboarding = await studentContext.request.get('/api/onboarding')
    expect(onboarding.ok()).toBe(true)
    expect(await onboarding.json()).toMatchObject({ data: { record: { status: 'submitted' }, latestExtraction: { status: 'succeeded', trust: 'client_asserted' } } })
    const sourceDocuments = await studentContext.request.get('/api/documents')
    const sourceBody = await sourceDocuments.json()
    onboardingDocumentId = sourceBody.data.find((item: { originalName: string }) => item.originalName === 'institution-record.pdf').id
  })

  await test.step('document selection rejects invalid files and uploads a private PDF', async () => {
    await studentPage.goto('/student/documents')
    const input = studentPage.locator('input[type="file"]')
    await input.setInputFiles({ name: 'resume.exe', mimeType: 'application/octet-stream', buffer: Buffer.from('not a document') })
    await expect(studentPage.getByText('Choose a supported document file.')).toBeVisible()
    await input.setInputFiles({ name: 'placeflow-resume.pdf', mimeType: 'application/pdf', buffer: pdf })
    await expect(studentPage.getByText('placeflow-resume.pdf')).toBeVisible()
    await studentPage.getByLabel('Document category').selectOption('resume')
    await studentPage.getByRole('button', { name: 'Upload document' }).click()
    await expect(studentPage.getByText('Document uploaded securely.')).toBeVisible()

    const response = await studentContext.request.get('/api/documents')
    expect(response.ok()).toBe(true)
    const body = await response.json()
    expect(body.data.length).toBeGreaterThanOrEqual(2)
    documentId = body.data.find((item: { originalName: string }) => item.originalName === 'placeflow-resume.pdf').id
    const { data } = await admin.from('documents').select('storage_path').eq('id', documentId).single()
    storagePath = data!.storage_path

    await studentPage.getByRole('button', { name: 'View placeflow-resume.pdf' }).click()
    await expect(studentPage.getByRole('dialog')).toContainText('placeflow-resume.pdf')
    await expect(studentPage.locator('iframe[title="placeflow-resume.pdf"]')).toBeVisible()
    await studentPage.getByRole('button', { name: 'Close document viewer' }).click()
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

    const directCommunityRead = await student.client.from('community_messages').select('*')
    expect(directCommunityRead.error).not.toBeNull()
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
    await studentPage.getByRole('link', { name: new RegExp(`View Platform Engineer at ${company}`) }).click()
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

    const deleteOnboardingSource = await studentContext.request.delete(`/api/documents/${onboardingDocumentId}`)
    expect(deleteOnboardingSource.status()).toBe(409)
    expect(await deleteOnboardingSource.json()).toMatchObject({ error: { code: 'DOCUMENT_IN_USE' } })

    const closeDrive = await coordinatorContext.request.patch(`/api/drives/${driveId}`, { data: { status: 'registration_closed' } })
    expect(closeDrive.ok()).toBe(true)
    expect((await closeDrive.json()).data).toMatchObject({
      status: 'registration_closed',
      description: 'Build reliable placement infrastructure.',
    })
  })

  await Promise.all([studentPage.close(), coordinatorPage.close()])
})

test('runs documents, public and private communities, profile graph, and settings across both roles', async () => {
  test.setTimeout(300_000)
  const studentPage = await studentContext.newPage()
  const coordinatorPage = await coordinatorContext.newPage()
  const publicName = `Open campus ${runId}`
  const privateName = `Placement core ${runId}`

  await test.step('general document storage registers, retrieves, views, and isolates a text file', async () => {
    const textBlob = Buffer.from('PlaceFlow general document\nA private note for integration testing.\n')
    const path = `${student.id}/other/${randomUUID()}.txt`
    const upload = await student.client.storage.from('student-documents').upload(path, textBlob, { contentType: 'text/plain' })
    expect(upload.error).toBeNull()
    const metadata = await studentContext.request.post('/api/documents/metadata', { data: { storagePath: path, originalName: 'placement-notes.txt', mimeType: 'text/plain', sizeBytes: textBlob.length, type: 'other' } })
    expect(metadata.status()).toBe(201)
    const generalId = (await metadata.json()).data.id

    const signed = await studentContext.request.get(`/api/documents/${generalId}/url`)
    expect(signed.ok()).toBe(true)
    const signedBody = await signed.json()
    const download = await studentContext.request.get(signedBody.data.signedUrl)
    expect(await download.body()).toEqual(textBlob)
    const outsiderSigned = await outsiderContext.request.get(`/api/documents/${generalId}/url`)
    expect(outsiderSigned.status()).toBe(404)

    await studentPage.goto('/student/documents')
    await studentPage.getByRole('button', { name: 'View placement-notes.txt' }).click()
    await expect(studentPage.locator('iframe[title="placement-notes.txt"]')).toBeVisible()
    await studentPage.getByRole('button', { name: 'Close document viewer' }).click()
  })

  await test.step('coordinator creates a public group with as-you-type validation', async () => {
    await coordinatorPage.goto('/coordinator/community')
    await coordinatorPage.getByRole('button', { name: 'Create group' }).click()
    const dialog = coordinatorPage.getByRole('dialog')
    const createButton = dialog.getByRole('button', { name: 'Create group', exact: true })
    await expect(createButton).toBeDisabled()
    await dialog.getByLabel('Group name').fill('x')
    await expect(dialog.getByText('Use at least 2 characters.')).toBeVisible()
    await dialog.getByLabel('Group name').fill(publicName)
    await dialog.getByLabel('Description').fill('A public room for students and coordinators.')
    await dialog.getByLabel('Visibility').selectOption('public')
    await expect(createButton).toBeEnabled()
    await createButton.click()
    await expect(coordinatorPage.getByText('Group created.')).toBeVisible()
    const groups = await coordinatorContext.request.get('/api/communities')
    publicGroupId = (await groups.json()).data.find((group: { name: string }) => group.name === publicName).id
  })

  await test.step('public groups allow instant joining and shared messaging but reject non-members', async () => {
    const beforeJoin = await studentContext.request.post(`/api/communities/${publicGroupId}/messages`, { data: { body: 'not yet' } })
    expect(beforeJoin.status()).toBe(403)
    const studentJoin = await studentContext.request.post(`/api/communities/${publicGroupId}/join`)
    expect((await studentJoin.json()).data.viewerStatus).toBe('active')
    const outsiderJoin = await outsiderContext.request.post(`/api/communities/${publicGroupId}/join`)
    expect((await outsiderJoin.json()).data.viewerStatus).toBe('active')

    await studentPage.goto(`/student/community/${publicGroupId}`)
    await studentPage.getByRole('textbox', { name: 'Message', exact: true }).fill('hello from the student')
    await studentPage.getByRole('button', { name: 'Send message' }).click()
    await expect(studentPage.getByText('hello from the student')).toBeVisible()
    const outsiderMessage = await outsiderContext.request.post(`/api/communities/${publicGroupId}/messages`, { data: { body: 'hello from the public group' } })
    expect(outsiderMessage.status()).toBe(201)
    await expect(studentPage.getByText('hello from the public group')).toBeVisible({ timeout: 10_000 })

    await coordinatorPage.goto(`/coordinator/community/${publicGroupId}`)
    await expect(coordinatorPage.getByText('hello from the student')).toBeVisible()
    await coordinatorPage.getByRole('button', { name: 'Reply' }).first().click()
    await coordinatorPage.getByRole('textbox', { name: 'Message', exact: true }).fill('welcome to the group')
    await coordinatorPage.getByRole('button', { name: 'Send message' }).click()
    await expect(coordinatorPage.getByText('Replying to')).toHaveCount(0)
    await expect(studentPage.getByText('welcome to the group')).toBeVisible({ timeout: 10_000 })
  })

  await test.step('private groups hold requests until an owner approves them', async () => {
    const created = await coordinatorContext.request.post('/api/communities', { data: { name: privateName, description: 'Approval-controlled discussion.', visibility: 'private' } })
    expect(created.status()).toBe(201)
    privateGroupId = (await created.json()).data.id
    const requested = await studentContext.request.post(`/api/communities/${privateGroupId}/join`)
    expect((await requested.json()).data.viewerStatus).toBe('pending')
    const pendingDetail = await studentContext.request.get(`/api/communities/${privateGroupId}`)
    expect((await pendingDetail.json()).data.messages).toEqual([])
    const blockedMessage = await studentContext.request.post(`/api/communities/${privateGroupId}/messages`, { data: { body: 'blocked' } })
    expect(blockedMessage.status()).toBe(403)

    await coordinatorPage.goto(`/coordinator/community/${privateGroupId}`)
    await expect(coordinatorPage.getByRole('heading', { name: 'Join requests' })).toBeVisible()
    await expect(coordinatorPage.getByText(student.name)).toBeVisible()
    await coordinatorPage.getByRole('button', { name: 'Approve' }).click()
    await expect(coordinatorPage.getByText('Join request updated.')).toBeVisible()
    const approvedMessage = await studentContext.request.post(`/api/communities/${privateGroupId}/messages`, { data: { body: 'approved private message' } })
    expect(approvedMessage.status()).toBe(201)
    const outsiderDetail = await outsiderContext.request.get(`/api/communities/${privateGroupId}`)
    expect((await outsiderDetail.json()).data.messages).toEqual([])
  })

  await test.step('public profile graph follows visibility and group membership settings', async () => {
    const publicSettings = { profileVisibility: 'public', showGroupMemberships: true, themePreference: 'light', defaultGroupVisibility: 'private' }
    expect((await studentContext.request.patch('/api/settings', { data: publicSettings })).ok()).toBe(true)
    await coordinatorPage.goto('/coordinator/people')
    await expect(coordinatorPage.getByRole('img', { name: 'Your direct public profile connections' })).toBeVisible()
    await expect(coordinatorPage.getByText(student.name).last()).toBeVisible()
    const graph = await coordinatorContext.request.get('/api/profiles/graph')
    const graphBody = await graph.json()
    expect(graphBody.data.nodes.some((node: { id: string }) => node.id === student.id)).toBe(true)
    expect(graphBody.data.edges.some((edge: { source: string; target: string }) => [edge.source, edge.target].includes(student.id) && [edge.source, edge.target].includes(coordinator.id))).toBe(true)
    expect(graphBody.data.edges.every((edge: { source: string; target: string }) => [edge.source, edge.target].includes(coordinator.id))).toBe(true)

    const privateSettings = { ...publicSettings, profileVisibility: 'private' as const, showGroupMemberships: false, themePreference: 'dark' as const }
    expect((await studentContext.request.patch('/api/settings', { data: privateSettings })).ok()).toBe(true)
    const privateGraph = await coordinatorContext.request.get('/api/profiles/graph')
    expect((await privateGraph.json()).data.nodes.some((node: { id: string }) => node.id === student.id)).toBe(false)
  })

  await test.step('settings persist and apply the saved light or dark theme', async () => {
    await studentPage.goto('/student/settings')
    await expect(studentPage.getByRole('heading', { name: 'Settings' })).toBeVisible()
    await expect(studentPage.getByRole('button', { name: 'Dark' })).toBeVisible()
    await expect.poll(() => studentPage.evaluate(() => document.documentElement.dataset.theme)).toBe('dark')
    await studentPage.getByLabel('Profile visibility').selectOption('public')
    await studentPage.getByRole('button', { name: 'Save settings' }).click()
    await expect(studentPage.getByText('Settings saved.')).toBeVisible()
    const settings = await studentContext.request.get('/api/settings')
    expect(await settings.json()).toMatchObject({ data: { profileVisibility: 'public', themePreference: 'dark', defaultGroupVisibility: 'private' } })
  })

  await Promise.all([studentPage.close(), coordinatorPage.close()])
})
