import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
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
  { key: "nikhil", email: "nikhil.coordinator@placeflow.demo", name: "Nikhil Bose", role: "coordinator", branch: null, year: null, cgpa: null, backlogs: null, roll: null },
  { key: "leena", email: "leena.student@placeflow.demo", name: "Leena Joseph", role: "student", branch: "DEMO-CSE", year: 2027, cgpa: 8.7, backlogs: 0, roll: "DEMO-2027-005", onboarding: "submitted" },
  { key: "kabir", email: "kabir.student@placeflow.demo", name: "Kabir Singh", role: "student", branch: "DEMO-ECE", year: 2027, cgpa: 8.1, backlogs: 0, roll: "DEMO-2027-006", onboarding: "submitted" },
  { key: "tara", email: "tara.student@placeflow.demo", name: "Tara Menon", role: "student", branch: "DEMO-IT", year: 2028, cgpa: 9.0, backlogs: 0, roll: "DEMO-2028-001", onboarding: "review_required" },
  { key: "dev", email: "dev.student@placeflow.demo", name: "Dev Kulkarni", role: "student", branch: "DEMO-ME", year: 2028, cgpa: 7.6, backlogs: 1, roll: "DEMO-2028-002", onboarding: "ready" },
  { key: "isha", email: "isha.student@placeflow.demo", name: "Isha Verma", role: "student", branch: "DEMO-CSE", year: 2028, cgpa: 8.3, backlogs: 0, roll: "DEMO-2028-003", onboarding: "extraction_pending" },
  { key: "zoya", email: "zoya.student@placeflow.demo", name: "Zoya Ali", role: "student", branch: "DEMO-ECE", year: 2028, cgpa: 8.0, backlogs: 0, roll: "DEMO-2028-004", onboarding: "cancelled" },
  { key: "omar", email: "omar.student@placeflow.demo", name: "Omar Farooq", role: "student", branch: "DEMO-IT", year: 2028, cgpa: 8.2, backlogs: 0, roll: "DEMO-2028-005", onboarding: "draft" },
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
  const profileCompleted = actor.role === "student" && !["draft", "review_required", "ready", "extraction_pending", "cancelled"].includes(actor.onboarding);
  const { error: profileError } = await supabase.from("profiles").upsert({
    id: actor.id,
    email: actor.email,
    full_name: actor.name,
    primary_provider: "demo",
    roll_number: profileCompleted ? actor.roll : null,
    branch: profileCompleted ? actor.branch : null,
    graduation_year: profileCompleted ? actor.year : null,
    cgpa: profileCompleted ? actor.cgpa : null,
    backlogs: profileCompleted ? actor.backlogs : null,
    onboarding_completed_at: profileCompleted ? now.toISOString() : null,
    profile_visibility: "public",
    show_group_memberships: true,
    theme_preference: ["arjun", "noor", "dev", "zoya"].includes(actor.key) ? "dark" : "light",
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
  {
    id: "10000000-0000-4000-8000-000000000004",
    created_by: actors.get("nikhil").id,
    company_name: "Lattice Works",
    job_role: "Software Engineer I",
    description: "Develop reliable web services and internal platform capabilities with a product engineering team.",
    location: "Chennai",
    package_text: "16 LPA",
    eligible_branches: ["DEMO-CSE", "DEMO-IT"],
    eligible_years: [2027, 2028],
    minimum_cgpa: 8,
    maximum_backlogs: 0,
    registration_deadline: isoInDays(25),
    drive_date: isoInDays(31),
    status: "published",
  },
  {
    id: "10000000-0000-4000-8000-000000000005",
    created_by: actors.get("arjun").id,
    company_name: "Signal Grid",
    job_role: "Embedded Systems Graduate",
    description: "Build device software, validation tools, and telemetry for connected industrial systems.",
    location: "Noida",
    package_text: "13 LPA",
    eligible_branches: ["DEMO-ECE", "DEMO-CSE"],
    eligible_years: [2027, 2028],
    minimum_cgpa: 7.8,
    maximum_backlogs: 0,
    registration_deadline: isoInDays(18),
    drive_date: isoInDays(24),
    status: "published",
  },
  {
    id: "10000000-0000-4000-8000-000000000006",
    created_by: actors.get("maya").id,
    company_name: "Harbor Finance",
    job_role: "Technology Analyst",
    description: "Join a rotational program spanning application engineering, data operations, and security.",
    location: "Mumbai",
    package_text: "15 LPA",
    eligible_branches: ["DEMO-CSE", "DEMO-IT", "DEMO-ECE"],
    eligible_years: [2027],
    minimum_cgpa: 8,
    maximum_backlogs: 0,
    registration_deadline: isoInDays(32),
    drive_date: isoInDays(39),
    status: "published",
  },
  {
    id: "10000000-0000-4000-8000-000000000007",
    created_by: actors.get("nikhil").id,
    company_name: "Terra Robotics",
    job_role: "Robotics Operations Associate",
    description: "A draft opportunity for field deployment, systems integration, and fleet operations.",
    location: "Ahmedabad",
    package_text: "12 LPA",
    eligible_branches: ["DEMO-ME", "DEMO-ECE"],
    eligible_years: [2028],
    minimum_cgpa: 7,
    maximum_backlogs: 1,
    registration_deadline: isoInDays(40),
    drive_date: isoInDays(47),
    status: "draft",
  },
  {
    id: "10000000-0000-4000-8000-000000000008",
    created_by: actors.get("maya").id,
    company_name: "Prism Cloud",
    job_role: "Cloud Support Engineer",
    description: "Diagnose distributed systems, improve runbooks, and support production platform customers.",
    location: "Remote",
    package_text: "17 LPA",
    eligible_branches: ["DEMO-CSE", "DEMO-IT", "DEMO-ECE"],
    eligible_years: [2027],
    minimum_cgpa: 7.5,
    maximum_backlogs: 0,
    registration_deadline: isoInDays(29),
    drive_date: isoInDays(36),
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
const pngBytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
const documentSpecs = [
  { id: "20000000-0000-4000-8000-000000000001", actor: "aanya", type: "resume", name: "aanya-rao-resume.pdf", mime: "application/pdf", extension: "pdf", bytes: pdfBytes("Aanya Rao resume") },
  { id: "20000000-0000-4000-8000-000000000002", actor: "rohan", type: "resume", name: "rohan-das-resume.pdf", mime: "application/pdf", extension: "pdf", bytes: pdfBytes("Rohan Das resume") },
  { id: "20000000-0000-4000-8000-000000000003", actor: "noor", type: "resume", name: "noor-khan-resume.pdf", mime: "application/pdf", extension: "pdf", bytes: pdfBytes("Noor Khan resume") },
  { id: "20000000-0000-4000-8000-000000000004", actor: "vivaan", type: "resume", name: "vivaan-patel-resume.pdf", mime: "application/pdf", extension: "pdf", bytes: pdfBytes("Vivaan Patel resume") },
  { id: "20000000-0000-4000-8000-000000000005", actor: "aanya", type: "other", name: "frontend-interview-notes.txt", mime: "text/plain", extension: "txt", bytes: Buffer.from("PlaceFlow demo notes\nAccessibility\nReact rendering\nBrowser fundamentals\n") },
  { id: "20000000-0000-4000-8000-000000000006", actor: "noor", type: "marksheet", name: "semester-marksheet.pdf", mime: "application/pdf", extension: "pdf", bytes: pdfBytes("Noor Khan marksheet") },
  { id: "20000000-0000-4000-8000-000000000007", actor: "leena", type: "resume", name: "leena-joseph-resume.pdf", mime: "application/pdf", extension: "pdf", bytes: pdfBytes("Leena Joseph resume") },
  { id: "20000000-0000-4000-8000-000000000008", actor: "kabir", type: "resume", name: "kabir-singh-resume.pdf", mime: "application/pdf", extension: "pdf", bytes: pdfBytes("Kabir Singh resume") },
  { id: "20000000-0000-4000-8000-000000000009", actor: "tara", type: "marksheet", name: "tara-menon-marksheet.png", mime: "image/png", extension: "png", bytes: pngBytes },
  { id: "20000000-0000-4000-8000-000000000010", actor: "dev", type: "resume", name: "dev-kulkarni-resume.pdf", mime: "application/pdf", extension: "pdf", bytes: pdfBytes("Dev Kulkarni resume") },
  { id: "20000000-0000-4000-8000-000000000011", actor: "isha", type: "resume", name: "isha-verma-resume.png", mime: "image/png", extension: "png", bytes: pngBytes },
  { id: "20000000-0000-4000-8000-000000000012", actor: "zoya", type: "marksheet", name: "zoya-ali-marksheet.pdf", mime: "application/pdf", extension: "pdf", bytes: pdfBytes("Zoya Ali marksheet") },
  { id: "20000000-0000-4000-8000-000000000013", actor: "rohan", type: "marksheet", name: "rohan-das-transcript.pdf", mime: "application/pdf", extension: "pdf", bytes: pdfBytes("Rohan Das transcript") },
  { id: "20000000-0000-4000-8000-000000000014", actor: "vivaan", type: "other", name: "operations-project-summary.pdf", mime: "application/pdf", extension: "pdf", bytes: pdfBytes("Vivaan project summary") },
  { id: "20000000-0000-4000-8000-000000000015", actor: "leena", type: "marksheet", name: "leena-joseph-transcript.pdf", mime: "application/pdf", extension: "pdf", bytes: pdfBytes("Leena Joseph transcript") },
  { id: "20000000-0000-4000-8000-000000000016", actor: "kabir", type: "other", name: "embedded-lab-notes.txt", mime: "text/plain", extension: "txt", bytes: Buffer.from("UART debugging\nTiming constraints\nHardware validation\n") },
  { id: "20000000-0000-4000-8000-000000000017", actor: "aanya", type: "marksheet", name: "aanya-rao-transcript.pdf", mime: "application/pdf", extension: "pdf", bytes: pdfBytes("Aanya Rao transcript") },
  { id: "20000000-0000-4000-8000-000000000018", actor: "noor", type: "other", name: "analytics-portfolio.pdf", mime: "application/pdf", extension: "pdf", bytes: pdfBytes("Noor analytics portfolio") },
  { id: "20000000-0000-4000-8000-000000000019", actor: "omar", type: "resume", name: "omar-farooq-resume.pdf", mime: "application/pdf", extension: "pdf", bytes: pdfBytes("Omar Farooq resume") },
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

const onboardingSpecs = [
  { key: "leena", recordId: "70000000-0000-4000-8000-000000000001", extractionId: "80000000-0000-4000-8000-000000000001", documentId: "20000000-0000-4000-8000-000000000007", status: "submitted", extractionStatus: "succeeded", extractor: "pdfjs-dist", accepted: true },
  { key: "kabir", recordId: "70000000-0000-4000-8000-000000000002", extractionId: "80000000-0000-4000-8000-000000000002", documentId: "20000000-0000-4000-8000-000000000008", status: "submitted", extractionStatus: "succeeded", extractor: "pdfjs-dist", accepted: true },
  { key: "tara", recordId: "70000000-0000-4000-8000-000000000003", extractionId: "80000000-0000-4000-8000-000000000003", documentId: "20000000-0000-4000-8000-000000000009", status: "review_required", extractionStatus: "succeeded", extractor: "tesseract.js", accepted: false },
  { key: "dev", recordId: "70000000-0000-4000-8000-000000000004", extractionId: "80000000-0000-4000-8000-000000000004", documentId: "20000000-0000-4000-8000-000000000010", status: "ready", extractionStatus: "succeeded", extractor: "hybrid", accepted: true },
  { key: "isha", recordId: "70000000-0000-4000-8000-000000000005", extractionId: "80000000-0000-4000-8000-000000000005", documentId: "20000000-0000-4000-8000-000000000011", status: "extraction_pending", extractionStatus: "pending", extractor: "tesseract.js", accepted: false },
  { key: "zoya", recordId: "70000000-0000-4000-8000-000000000006", extractionId: "80000000-0000-4000-8000-000000000006", documentId: "20000000-0000-4000-8000-000000000012", status: "cancelled", extractionStatus: "failed", extractor: "pdfjs-dist", accepted: false },
  { key: "omar", recordId: "70000000-0000-4000-8000-000000000007", extractionId: null, documentId: null, status: "draft", extractionStatus: null, extractor: null, accepted: false },
];

for (const spec of onboardingSpecs) {
  const actor = actors.get(spec.key);
  const sourceDocument = documentSpecs.find((document) => document.id === spec.documentId);
  const { data: existingRecord, error: recordLookupError } = await supabase
    .from("onboarding_records")
    .select("id,status")
    .eq("id", spec.recordId)
    .maybeSingle();
  if (recordLookupError) throw recordLookupError;
  if (!existingRecord) {
    const hasExtractedFields = spec.extractionStatus === "succeeded";
    const { error } = await supabase.from("onboarding_records").insert({
      id: spec.recordId,
      student_id: actor.id,
      source_document_id: spec.documentId,
      status: spec.status,
      staged_full_name: hasExtractedFields || spec.status === "submitted" ? actor.name : null,
      staged_roll_number: hasExtractedFields || spec.status === "submitted" ? actor.roll : null,
      staged_branch: hasExtractedFields || spec.status === "submitted" ? actor.branch : null,
      staged_graduation_year: hasExtractedFields || spec.status === "submitted" ? actor.year : null,
      staged_cgpa: hasExtractedFields || spec.status === "submitted" ? actor.cgpa : null,
      staged_backlogs: hasExtractedFields || spec.status === "submitted" ? actor.backlogs : null,
      submitted_at: spec.status === "submitted" ? now.toISOString() : null,
    });
    if (error) throw error;
  }

  if (spec.extractionId && sourceDocument) {
    const { data: existingExtraction, error: extractionLookupError } = await supabase
      .from("document_extractions")
      .select("id")
      .eq("id", spec.extractionId)
      .maybeSingle();
    if (extractionLookupError) throw extractionLookupError;
    if (!existingExtraction) {
      const succeeded = spec.extractionStatus === "succeeded";
      const failed = spec.extractionStatus === "failed";
      const { error } = await supabase.from("document_extractions").insert({
        id: spec.extractionId,
        onboarding_record_id: spec.recordId,
        document_id: spec.documentId,
        student_id: actor.id,
        status: spec.extractionStatus,
        trust: "client_asserted",
        extractor_name: spec.extractor,
        extractor_version: spec.extractor === "tesseract.js" ? "7.0.0" : spec.extractor === "pdfjs-dist" ? "6.2.108" : "demo",
        source_original_name: sourceDocument.name,
        source_mime_type: sourceDocument.mime,
        source_size_bytes: sourceDocument.bytes.length,
        source_sha256: createHash("sha256").update(sourceDocument.bytes).digest("hex"),
        extracted_fields: succeeded ? {
          fullName: actor.name,
          rollNumber: actor.roll,
          branch: actor.branch,
          graduationYear: actor.year,
          cgpa: actor.cgpa,
          backlogs: actor.backlogs,
        } : {},
        field_confidence: succeeded ? { fullName: 0.98, rollNumber: 0.93, branch: 0.96, graduationYear: 0.91, cgpa: 0.89, backlogs: 0.88 } : {},
        error_code: failed ? "DEMO_UNREADABLE_SOURCE" : null,
        error_message: failed ? "The demo extractor could not confidently read this source." : null,
        completed_at: succeeded || failed ? now.toISOString() : null,
      });
      if (error) throw error;
    }

    if (spec.accepted) {
      const { error } = await supabase
        .from("onboarding_records")
        .update({ accepted_extraction_id: spec.extractionId })
        .eq("id", spec.recordId)
        .is("accepted_extraction_id", null);
      if (error) throw error;
    }
  }
}

const applicationSpecs = [
  { id: "30000000-0000-4000-8000-000000000001", actor: "aanya", drive: driveSpecs[0].id, document: documentSpecs[0].id, target: "applied" },
  { id: "30000000-0000-4000-8000-000000000002", actor: "noor", drive: driveSpecs[0].id, document: documentSpecs[2].id, target: "shortlisted" },
  { id: "30000000-0000-4000-8000-000000000003", actor: "rohan", drive: driveSpecs[1].id, document: documentSpecs[1].id, target: "selected" },
  { id: "30000000-0000-4000-8000-000000000004", actor: "vivaan", drive: driveSpecs[2].id, document: documentSpecs[3].id, target: "rejected" },
  { id: "30000000-0000-4000-8000-000000000005", actor: "leena", drive: driveSpecs[0].id, document: documentSpecs[6].id, target: "shortlisted" },
  { id: "30000000-0000-4000-8000-000000000006", actor: "leena", drive: driveSpecs[3].id, document: documentSpecs[6].id, target: "applied" },
  { id: "30000000-0000-4000-8000-000000000007", actor: "leena", drive: driveSpecs[5].id, document: documentSpecs[6].id, target: "selected" },
  { id: "30000000-0000-4000-8000-000000000008", actor: "kabir", drive: driveSpecs[1].id, document: documentSpecs[7].id, target: "shortlisted" },
  { id: "30000000-0000-4000-8000-000000000009", actor: "kabir", drive: driveSpecs[4].id, document: documentSpecs[7].id, target: "applied" },
  { id: "30000000-0000-4000-8000-000000000010", actor: "kabir", drive: driveSpecs[5].id, document: documentSpecs[7].id, target: "rejected" },
  { id: "30000000-0000-4000-8000-000000000011", actor: "aanya", drive: driveSpecs[3].id, document: documentSpecs[0].id, target: "selected" },
  { id: "30000000-0000-4000-8000-000000000012", actor: "aanya", drive: driveSpecs[5].id, document: documentSpecs[0].id, target: "applied" },
  { id: "30000000-0000-4000-8000-000000000013", actor: "rohan", drive: driveSpecs[4].id, document: documentSpecs[1].id, target: "selected" },
  { id: "30000000-0000-4000-8000-000000000014", actor: "rohan", drive: driveSpecs[7].id, document: documentSpecs[1].id, target: "shortlisted" },
  { id: "30000000-0000-4000-8000-000000000015", actor: "noor", drive: driveSpecs[3].id, document: documentSpecs[2].id, target: "selected" },
  { id: "30000000-0000-4000-8000-000000000016", actor: "noor", drive: driveSpecs[7].id, document: documentSpecs[2].id, target: "rejected" },
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
  { id: "40000000-0000-4000-8000-000000000004", owner: "nikhil", name: "Career Commons", slug: "career-commons-demo", description: "Cross-branch conversations about roles, industries, and early-career decisions.", visibility: "public" },
  { id: "40000000-0000-4000-8000-000000000005", owner: "arjun", name: "Circuits to Systems", slug: "circuits-to-systems-demo", description: "Embedded, electronics, and systems interview preparation for ECE students.", visibility: "public" },
  { id: "40000000-0000-4000-8000-000000000006", owner: "nikhil", name: "Class of 2028 Launchpad", slug: "class-of-2028-demo", description: "A cohort space for students beginning their placement preparation early.", visibility: "public" },
  { id: "40000000-0000-4000-8000-000000000007", owner: "maya", name: "Portfolio Studio", slug: "portfolio-studio-demo", description: "A small private critique group for resumes, projects, and personal portfolios.", visibility: "private" },
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
  ...["maya", "arjun", "nikhil", "aanya", "rohan", "noor", "vivaan", "leena", "kabir", "tara", "dev", "isha", "zoya", "omar"].map((actor) => ({ group: groupSpecs[0].id, actor, status: "active", role: actor === "maya" ? "owner" : actor === "arjun" ? "moderator" : "member" })),
  ...["arjun", "aanya", "rohan", "noor", "leena", "kabir", "tara", "isha", "omar"].map((actor) => ({ group: groupSpecs[1].id, actor, status: "active", role: actor === "arjun" ? "owner" : "member" })),
  ...["maya", "aanya", "noor", "leena", "kabir"].map((actor) => ({ group: groupSpecs[2].id, actor, status: "active", role: actor === "maya" ? "owner" : "member" })),
  { group: groupSpecs[2].id, actor: "vivaan", status: "pending", role: "member" },
  ...["nikhil", "maya", "arjun", "rohan", "vivaan", "leena", "dev", "zoya"].map((actor) => ({ group: groupSpecs[3].id, actor, status: "active", role: actor === "nikhil" ? "owner" : "member" })),
  ...["arjun", "rohan", "kabir", "zoya", "dev"].map((actor) => ({ group: groupSpecs[4].id, actor, status: "active", role: actor === "arjun" ? "owner" : actor === "kabir" ? "moderator" : "member" })),
  ...["nikhil", "tara", "dev", "isha", "zoya", "omar"].map((actor) => ({ group: groupSpecs[5].id, actor, status: "active", role: actor === "nikhil" ? "owner" : "member" })),
  ...["maya", "aanya", "noor", "leena", "tara", "isha"].map((actor) => ({ group: groupSpecs[6].id, actor, status: "active", role: actor === "maya" ? "owner" : "member" })),
  { group: groupSpecs[6].id, actor: "omar", status: "pending", role: "member" },
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
  { id: "50000000-0000-4000-8000-000000000013", group: 0, actor: "nikhil", body: "I added the new graduate-drive calendar and coordinator office hours." },
  { id: "50000000-0000-4000-8000-000000000014", group: 0, actor: "tara", body: "Is a scanned marksheet acceptable for onboarding review?" },
  { id: "50000000-0000-4000-8000-000000000015", group: 0, actor: "maya", body: "Yes, PDF and common image formats are supported. Confirm every extracted field before submitting.", reply: "50000000-0000-4000-8000-000000000014" },
  { id: "50000000-0000-4000-8000-000000000016", group: 1, actor: "leena", body: "I can run a short accessibility review after the debugging round." },
  { id: "50000000-0000-4000-8000-000000000017", group: 1, actor: "kabir", body: "Could we add one systems-design exercise for device telemetry?" },
  { id: "50000000-0000-4000-8000-000000000018", group: 1, actor: "arjun", body: "Good idea. Bring a simple event-ingestion sketch and we will review tradeoffs.", reply: "50000000-0000-4000-8000-000000000017" },
  { id: "50000000-0000-4000-8000-000000000019", group: 2, actor: "leena", body: "My comparison now separates fixed pay, variable pay, and relocation support." },
  { id: "50000000-0000-4000-8000-000000000020", group: 2, actor: "kabir", body: "Please add bond duration and probation terms too.", reply: "50000000-0000-4000-8000-000000000019" },
  { id: "50000000-0000-4000-8000-000000000021", group: 3, actor: "nikhil", body: "Welcome to Career Commons. Start with the work you want to learn, then compare job titles." },
  { id: "50000000-0000-4000-8000-000000000022", group: 3, actor: "vivaan", body: "I am mapping operations roles that still include hands-on engineering." },
  { id: "50000000-0000-4000-8000-000000000023", group: 3, actor: "dev", body: "I would like to compare field robotics and manufacturing automation." },
  { id: "50000000-0000-4000-8000-000000000024", group: 3, actor: "maya", body: "Share two example job descriptions and we can identify the recurring skills.", reply: "50000000-0000-4000-8000-000000000023" },
  { id: "50000000-0000-4000-8000-000000000025", group: 4, actor: "arjun", body: "First circuit-to-systems session: interfaces, timing, and failure diagnosis." },
  { id: "50000000-0000-4000-8000-000000000026", group: 4, actor: "kabir", body: "I will prepare a UART debugging example and a short timing trace." },
  { id: "50000000-0000-4000-8000-000000000027", group: 4, actor: "zoya", body: "I can document the checklist during the session." },
  { id: "50000000-0000-4000-8000-000000000028", group: 5, actor: "nikhil", body: "The 2028 cohort can use this room for early profile and document preparation." },
  { id: "50000000-0000-4000-8000-000000000029", group: 5, actor: "isha", body: "My image extraction is still processing. I will verify the scan quality first." },
  { id: "50000000-0000-4000-8000-000000000030", group: 5, actor: "omar", body: "I have uploaded a resume but have not started extraction yet." },
  { id: "50000000-0000-4000-8000-000000000031", group: 5, actor: "tara", body: "The review step was useful; one numeric field needed a manual correction." },
  { id: "50000000-0000-4000-8000-000000000032", group: 5, actor: "dev", body: "I finished review and will submit after checking my roll number once more.", reply: "50000000-0000-4000-8000-000000000031" },
  { id: "50000000-0000-4000-8000-000000000033", group: 6, actor: "maya", body: "Portfolio feedback should be specific: audience, evidence, clarity, and accessibility." },
  { id: "50000000-0000-4000-8000-000000000034", group: 6, actor: "aanya", body: "I rewrote my project summary around constraints and measurable outcomes." },
  { id: "50000000-0000-4000-8000-000000000035", group: 6, actor: "tara", body: "The shorter summary makes the technical decisions much easier to scan.", reply: "50000000-0000-4000-8000-000000000034" },
  { id: "50000000-0000-4000-8000-000000000036", group: 6, actor: "isha", body: "I will bring a mobile screenshot pass for the next critique." },
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
  { actor: "leena", key: "demo:lattice-applied", type: "application_received", title: "Application received", body: "Lattice Works — application submitted", url: "/student/applications", drive_id: driveSpecs[3].id, application_id: applicationSpecs[5].id },
  { actor: "leena", key: "demo:harbor-selected", type: "application_status_changed", title: "Application updated", body: "Harbor Finance — selected", url: "/student/applications", drive_id: driveSpecs[5].id, application_id: applicationSpecs[6].id },
  { actor: "kabir", key: "demo:signal-applied", type: "application_received", title: "Application received", body: "Signal Grid — application submitted", url: "/student/applications", drive_id: driveSpecs[4].id, application_id: applicationSpecs[8].id },
  { actor: "kabir", key: "demo:nova-shortlisted", type: "application_status_changed", title: "Application updated", body: "Orbit Systems — shortlisted", url: "/student/applications", drive_id: driveSpecs[1].id, application_id: applicationSpecs[7].id },
  { actor: "aanya", key: "demo:lattice-selected", type: "application_status_changed", title: "Application updated", body: "Lattice Works — selected", url: "/student/applications", drive_id: driveSpecs[3].id, application_id: applicationSpecs[10].id },
  { actor: "rohan", key: "demo:prism-shortlisted", type: "application_status_changed", title: "Application updated", body: "Prism Cloud — shortlisted", url: "/student/applications", drive_id: driveSpecs[7].id, application_id: applicationSpecs[13].id },
  { actor: "tara", key: "demo:onboarding-review", type: "onboarding_review_required", title: "Review extracted details", body: "Confirm the fields extracted from your marksheet before continuing.", url: "/onboarding" },
  { actor: "dev", key: "demo:onboarding-ready", type: "onboarding_ready", title: "Profile ready to submit", body: "Your corrected placement profile is ready for final submission.", url: "/onboarding" },
  { actor: "isha", key: "demo:extraction-pending", type: "onboarding_extraction_pending", title: "Extraction in progress", body: "Your uploaded image is queued for local extraction.", url: "/onboarding" },
  { actor: "zoya", key: "demo:extraction-failed", type: "onboarding_extraction_failed", title: "Try another source", body: "The previous file could not be read confidently. Upload a clearer PDF or image.", url: "/onboarding" },
  { actor: "omar", key: "demo:onboarding-draft", type: "onboarding_draft", title: "Finish onboarding", body: "Your source document is uploaded. Start extraction when you are ready.", url: "/onboarding" },
  { actor: "nikhil", key: "demo:portfolio-request", type: "community_join_request", title: "New group activity", body: "A student requested access to Portfolio Studio.", url: `/coordinator/community/${groupSpecs[6].id}` },
  { actor: "maya", key: "demo:drive-published-lattice", type: "drive_published", title: "Demo drive published", body: "Lattice Works — Software Engineer I", url: `/coordinator/drives/${driveSpecs[3].id}`, drive_id: driveSpecs[3].id },
  { actor: "arjun", key: "demo:drive-published-signal", type: "drive_published", title: "Demo drive published", body: "Signal Grid — Embedded Systems Graduate", url: `/coordinator/drives/${driveSpecs[4].id}`, drive_id: driveSpecs[4].id },
  { actor: "noor", key: "demo:portfolio-message", type: "community_message", title: "New Portfolio Studio reply", body: "Tara replied to Aanya's project-summary thread.", url: `/student/community/${groupSpecs[6].id}` },
  { actor: "vivaan", key: "demo:career-commons", type: "community_message", title: "New Career Commons reply", body: "Maya shared a job-description comparison exercise.", url: `/student/community/${groupSpecs[3].id}` },
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
  onboardingRecords: onboardingSpecs.length,
  extractionProvenance: onboardingSpecs.filter((spec) => spec.extractionId).length,
  applications: applicationSpecs.length,
  groups: groupSpecs.length,
  memberships: membershipSpecs.length,
  messages: messageSpecs.length,
  notifications: notificationSpecs.length,
}, null, 2));
