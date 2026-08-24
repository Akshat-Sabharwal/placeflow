import { createClient } from "@supabase/supabase-js";
import { loadEnvFile } from "node:process";

try {
  loadEnvFile(".env.local");
} catch {
  // ci may provide environment values without a local file.
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;

if (!url || !secret) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY.");
  process.exit(1);
}

const supabase = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const now = new Date();
const isoInDays = (days) => new Date(now.getTime() + days * 86_400_000).toISOString();

const actorSpecs = [
  { key: "maya", email: "maya.coordinator@placeflow.demo", name: "Maya Sharma", role: "coordinator", branch: null, year: null, cgpa: null, backlogs: null, roll: null },
  { key: "arjun", email: "arjun.coordinator@placeflow.demo", name: "Arjun Mehta", role: "coordinator", branch: null, year: null, cgpa: null, backlogs: null, roll: null },
  { key: "aanya", email: "aanya.student@placeflow.demo", name: "Aanya Rao", role: "student", branch: "DEMO-CSE", year: 2027, cgpa: 9.1, backlogs: 0, roll: "DEMO-2027-001" },
  { key: "rohan", email: "rohan.student@placeflow.demo", name: "Rohan Das", role: "student", branch: "DEMO-ECE", year: 2027, cgpa: 8.4, backlogs: 0, roll: "DEMO-2027-002" },
  { key: "noor", email: "noor.student@placeflow.demo", name: "Noor Khan", role: "student", branch: "DEMO-IT", year: 2027, cgpa: 8.8, backlogs: 0, roll: "DEMO-2027-003" },
  { key: "vivaan", email: "vivaan.student@placeflow.demo", name: "Vivaan Patel", role: "student", branch: "DEMO-ME", year: 2027, cgpa: 7.9, backlogs: 1, roll: "DEMO-2027-004" },
];

const actors = new Map();

async function allAuthUsers() {
  const users = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 1000) return users;
  }
}

const existingUsers = await allAuthUsers();

for (const spec of actorSpecs) {
  let user = existingUsers.find((candidate) => candidate.email?.toLowerCase() === spec.email);
  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: spec.email,
      email_confirm: true,
      user_metadata: { full_name: spec.name, name: spec.name, placeflow_demo: true },
      app_metadata: { placeflow_demo: true },
    });
    if (error || !data.user) throw new Error(error?.message ?? `Could not create ${spec.email}`);
    user = data.user;
  }
  actors.set(spec.key, { ...spec, id: user.id });
}

for (const actor of actors.values()) {
  const { error: profileError } = await supabase.from("profiles").upsert({
    id: actor.id,
    email: actor.email,
    full_name: actor.name,
    primary_provider: "demo",
    roll_number: actor.roll,
    branch: actor.branch,
    graduation_year: actor.year,
    cgpa: actor.cgpa,
    backlogs: actor.backlogs,
    onboarding_completed_at: actor.role === "student" ? now.toISOString() : null,
    profile_visibility: "public",
    show_group_memberships: true,
    theme_preference: actor.key === "arjun" || actor.key === "noor" ? "dark" : "light",
    default_group_visibility: actor.role === "coordinator" ? "private" : "public",
  }, { onConflict: "id" });
  if (profileError) throw profileError;
  const { error: roleError } = await supabase.from("user_roles").upsert({
    user_id: actor.id,
    role: actor.role,
    granted_at: now.toISOString(),
  }, { onConflict: "user_id" });
  if (roleError) throw roleError;
}

const driveSpecs = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    created_by: actors.get("maya").id,
    company_name: "Nova Labs",
    job_role: "Frontend Engineer",
    description: "Build accessible product interfaces for a fast-moving developer platform.",
    location: "Bengaluru",
    package_text: "18 LPA",
    eligible_branches: ["DEMO-CSE", "DEMO-IT"],
    eligible_years: [2027],
    minimum_cgpa: 8,
    maximum_backlogs: 0,
    registration_deadline: isoInDays(21),
    drive_date: isoInDays(28),
    status: "published",
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    created_by: actors.get("arjun").id,
    company_name: "Orbit Systems",
    job_role: "Data Platform Analyst",
    description: "Work with operational datasets, internal tooling, and analytics infrastructure.",
    location: "Hyderabad",
    package_text: "14 LPA",
    eligible_branches: ["DEMO-CSE", "DEMO-ECE"],
    eligible_years: [2027],
    minimum_cgpa: 7.5,
    maximum_backlogs: 0,
    registration_deadline: isoInDays(14),
    drive_date: isoInDays(20),
    status: "published",
  },
  {
    id: "10000000-0000-4000-8000-000000000003",
    created_by: actors.get("maya").id,
    company_name: "Cedar Mobility",
    job_role: "Graduate Operations Engineer",
    description: "Coordinate technical operations across manufacturing and software teams.",
    location: "Pune",
    package_text: "11 LPA",
    eligible_branches: ["DEMO-CSE", "DEMO-IT", "DEMO-ECE", "DEMO-ME"],
    eligible_years: [2027],
    minimum_cgpa: 7,
    maximum_backlogs: 1,
    registration_deadline: isoInDays(7),
    drive_date: isoInDays(12),
    status: "published",
  },
];

for (const drive of driveSpecs) {
  const { data: existing, error: lookupError } = await supabase.from("drives").select("id,status").eq("id", drive.id).maybeSingle();
  if (lookupError) throw lookupError;
  if (!existing) {
    const { error } = await supabase.from("drives").insert(drive);
    if (error) throw error;
  } else {
    const safeUpdate = { ...drive };
    delete safeUpdate.status;
    const { error } = await supabase.from("drives").update(safeUpdate).eq("id", drive.id);
    if (error) throw error;
  }
}

const pdfBytes = (name) => Buffer.from(`%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n% ${name}\ntrailer<</Root 1 0 R>>\n%%EOF\n`);
const documentSpecs = [
  { id: "20000000-0000-4000-8000-000000000001", actor: "aanya", type: "resume", name: "aanya-rao-resume.pdf", mime: "application/pdf", extension: "pdf", bytes: pdfBytes("Aanya Rao resume") },
  { id: "20000000-0000-4000-8000-000000000002", actor: "rohan", type: "resume", name: "rohan-das-resume.pdf", mime: "application/pdf", extension: "pdf", bytes: pdfBytes("Rohan Das resume") },
  { id: "20000000-0000-4000-8000-000000000003", actor: "noor", type: "resume", name: "noor-khan-resume.pdf", mime: "application/pdf", extension: "pdf", bytes: pdfBytes("Noor Khan resume") },
  { id: "20000000-0000-4000-8000-000000000004", actor: "vivaan", type: "resume", name: "vivaan-patel-resume.pdf", mime: "application/pdf", extension: "pdf", bytes: pdfBytes("Vivaan Patel resume") },
  { id: "20000000-0000-4000-8000-000000000005", actor: "aanya", type: "other", name: "frontend-interview-notes.txt", mime: "text/plain", extension: "txt", bytes: Buffer.from("PlaceFlow demo notes\nAccessibility\nReact rendering\nBrowser fundamentals\n") },
  { id: "20000000-0000-4000-8000-000000000006", actor: "noor", type: "marksheet", name: "semester-marksheet.pdf", mime: "application/pdf", extension: "pdf", bytes: pdfBytes("Noor Khan marksheet") },
];

for (const document of documentSpecs) {
  const owner = actors.get(document.actor);
  const storagePath = `${owner.id}/${document.type}/${document.id}.${document.extension}`;
  const { error: uploadError } = await supabase.storage.from("student-documents").upload(storagePath, document.bytes, {
    contentType: document.mime,
    upsert: true,
  });
  if (uploadError) throw uploadError;
  const { error: documentError } = await supabase.from("documents").upsert({
    id: document.id,
    student_id: owner.id,
    type: document.type,
    storage_path: storagePath,
    original_name: document.name,
    mime_type: document.mime,
    size_bytes: document.bytes.length,
  }, { onConflict: "id" });
  if (documentError) throw documentError;
}

const applicationSpecs = [
  { id: "30000000-0000-4000-8000-000000000001", actor: "aanya", drive: driveSpecs[0].id, document: documentSpecs[0].id, target: "applied" },
  { id: "30000000-0000-4000-8000-000000000002", actor: "noor", drive: driveSpecs[0].id, document: documentSpecs[2].id, target: "shortlisted" },
  { id: "30000000-0000-4000-8000-000000000003", actor: "rohan", drive: driveSpecs[1].id, document: documentSpecs[1].id, target: "selected" },
  { id: "30000000-0000-4000-8000-000000000004", actor: "vivaan", drive: driveSpecs[2].id, document: documentSpecs[3].id, target: "rejected" },
];

const transitions = {
  applied: ["shortlisted", "rejected"],
  shortlisted: ["selected", "rejected"],
  selected: [],
  rejected: [],
};

async function advanceApplication(id, target) {
  for (let step = 0; step < 3; step += 1) {
    const { data, error } = await supabase.from("applications").select("status").eq("id", id).single();
    if (error) throw error;
    if (data.status === target) return;
    const next = transitions[data.status].includes(target) ? target : transitions[data.status][0];
    if (!next) return;
    const { error: updateError } = await supabase.from("applications").update({ status: next }).eq("id", id);
    if (updateError) throw updateError;
  }
}

for (const application of applicationSpecs) {
  const { data: existing, error: lookupError } = await supabase.from("applications").select("id").eq("id", application.id).maybeSingle();
  if (lookupError) throw lookupError;
  if (!existing) {
    const { error } = await supabase.from("applications").insert({
      id: application.id,
      student_id: actors.get(application.actor).id,
      drive_id: application.drive,
      resume_document_id: application.document,
      status: "applied",
    });
    if (error) throw error;
  }
  await advanceApplication(application.id, application.target);
}

const { data: closedDrive, error: closedDriveError } = await supabase.from("drives").select("status").eq("id", driveSpecs[2].id).single();
if (closedDriveError) throw closedDriveError;
if (closedDrive.status === "published") {
  const { error } = await supabase.from("drives").update({ status: "registration_closed" }).eq("id", driveSpecs[2].id);
  if (error) throw error;
}

const groupSpecs = [
  { id: "40000000-0000-4000-8000-000000000001", owner: "maya", name: "Placement Lounge", slug: "placement-lounge-demo", description: "Open conversation about drives, applications, and campus placement logistics.", visibility: "public" },
  { id: "40000000-0000-4000-8000-000000000002", owner: "arjun", name: "Interview Lab", slug: "interview-lab-demo", description: "Peer practice for technical interviews, portfolios, and group discussions.", visibility: "public" },
  { id: "40000000-0000-4000-8000-000000000003", owner: "maya", name: "Offer Review Circle", slug: "offer-review-demo", description: "A private room for comparing offer details and next steps.", visibility: "private" },
];

for (const group of groupSpecs) {
  const { error } = await supabase.from("community_groups").upsert({
    id: group.id,
    owner_id: actors.get(group.owner).id,
    name: group.name,
    slug: group.slug,
    description: group.description,
    visibility: group.visibility,
  }, { onConflict: "id" });
  if (error) throw error;
}

const membershipSpecs = [
  ...["maya", "arjun", "aanya", "rohan", "noor", "vivaan"].map((actor) => ({ group: groupSpecs[0].id, actor, status: "active", role: actor === "maya" ? "owner" : "member" })),
  ...["arjun", "aanya", "rohan", "noor"].map((actor) => ({ group: groupSpecs[1].id, actor, status: "active", role: actor === "arjun" ? "owner" : "member" })),
  ...["maya", "aanya", "noor"].map((actor) => ({ group: groupSpecs[2].id, actor, status: "active", role: actor === "maya" ? "owner" : "member" })),
  { group: groupSpecs[2].id, actor: "vivaan", status: "pending", role: "member" },
];

for (const membership of membershipSpecs) {
  const { error } = await supabase.from("community_members").upsert({
    group_id: membership.group,
    user_id: actors.get(membership.actor).id,
    role: membership.role,
    status: membership.status,
    requested_at: now.toISOString(),
    joined_at: membership.status === "active" ? now.toISOString() : null,
  }, { onConflict: "group_id,user_id" });
  if (error) throw error;
}

const messageSpecs = [
  { id: "50000000-0000-4000-8000-000000000001", group: 0, actor: "maya", body: "Welcome to the placement lounge. Use this space for questions that help everyone." },
  { id: "50000000-0000-4000-8000-000000000002", group: 0, actor: "aanya", body: "Does anyone want to review frontend portfolios this week?" },
  { id: "50000000-0000-4000-8000-000000000003", group: 0, actor: "noor", body: "Yes. I can share a checklist for project write-ups.", reply: "50000000-0000-4000-8000-000000000002" },
  { id: "50000000-0000-4000-8000-000000000004", group: 0, actor: "rohan", body: "I added a few data-platform interview resources to my notes." },
  { id: "50000000-0000-4000-8000-000000000005", group: 0, actor: "arjun", body: "Keep company-specific questions in the relevant drive page when possible." },
  { id: "50000000-0000-4000-8000-000000000006", group: 1, actor: "arjun", body: "This week: arrays, SQL joins, and one behavioral round." },
  { id: "50000000-0000-4000-8000-000000000007", group: 1, actor: "rohan", body: "I can host the SQL practice session on Thursday." },
  { id: "50000000-0000-4000-8000-000000000008", group: 1, actor: "aanya", body: "I will bring two frontend debugging exercises." },
  { id: "50000000-0000-4000-8000-000000000009", group: 1, actor: "noor", body: "Thursday works for me.", reply: "50000000-0000-4000-8000-000000000007" },
  { id: "50000000-0000-4000-8000-000000000010", group: 2, actor: "maya", body: "Share only offer details you are comfortable discussing with this group." },
  { id: "50000000-0000-4000-8000-000000000011", group: 2, actor: "aanya", body: "I made a comparison sheet for location, role, and learning opportunities." },
  { id: "50000000-0000-4000-8000-000000000012", group: 2, actor: "noor", body: "That would be useful before the next review call.", reply: "50000000-0000-4000-8000-000000000011" },
];

for (const message of messageSpecs) {
  const { error } = await supabase.from("community_messages").upsert({
    id: message.id,
    group_id: groupSpecs[message.group].id,
    author_id: actors.get(message.actor).id,
    reply_to_id: message.reply ?? null,
    body: message.body,
  }, { onConflict: "id" });
  if (error) throw error;
}

const notificationSpecs = [
  { actor: "aanya", key: "demo:welcome", type: "demo", title: "Welcome to the demo workspace", body: "Explore drives, documents, groups, and the public profile graph.", url: "/student" },
  { actor: "noor", key: "demo:shortlisted", type: "application_status_changed", title: "Application updated", body: "Nova Labs — shortlisted", url: "/student/applications", drive_id: driveSpecs[0].id, application_id: applicationSpecs[1].id },
  { actor: "rohan", key: "demo:selected", type: "application_status_changed", title: "Application updated", body: "Orbit Systems — selected", url: "/student/applications", drive_id: driveSpecs[1].id, application_id: applicationSpecs[2].id },
  { actor: "maya", key: "demo:join-request", type: "community_join_request", title: "New group join request", body: "Vivaan Patel requested to join Offer Review Circle.", url: `/coordinator/community/${groupSpecs[2].id}` },
];

for (const notification of notificationSpecs) {
  const { error } = await supabase.from("notifications").upsert({
    user_id: actors.get(notification.actor).id,
    event_key: notification.key,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    url: notification.url,
    drive_id: notification.drive_id ?? null,
    application_id: notification.application_id ?? null,
  }, { onConflict: "user_id,event_key" });
  if (error) throw error;
}

console.log(JSON.stringify({
  project: new URL(url).hostname.split(".")[0],
  actors: actorSpecs.length,
  drives: driveSpecs.length,
  documents: documentSpecs.length,
  applications: applicationSpecs.length,
  groups: groupSpecs.length,
  memberships: membershipSpecs.length,
  messages: messageSpecs.length,
  notifications: notificationSpecs.length,
}, null, 2));
