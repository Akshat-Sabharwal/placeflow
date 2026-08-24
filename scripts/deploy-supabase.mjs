import { mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { loadEnvFile } from "node:process";

try {
  loadEnvFile(".env.local");
} catch {
  // ci may provide environment values without a local file.
}

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_PROJECT_REF",
  "SUPABASE_ACCESS_TOKEN",
  "SUPABASE_DB_PASSWORD",
  "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY",
  "VAPID_SUBJECT",
];

const missing = required.filter((name) => !process.env[name]?.trim());

if (missing.length > 0) {
  console.error(`Missing required environment values: ${missing.join(", ")}`);
  process.exit(1);
}

// this secret protects the database-to-function webhook.
if (!process.env.PLACEMENT_WEBHOOK_SECRET?.trim()) {
  process.env.PLACEMENT_WEBHOOK_SECRET = randomBytes(32).toString("base64url");
  console.log("Generated an internal placement webhook secret for this deployment.");
}

const projectRef = process.env.SUPABASE_PROJECT_REF;

function run(args, options = {}) {
  const result = spawnSync("npx", ["supabase", ...args], {
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
  });

  if (result.status !== 0) {
    if (options.capture && result.stderr) process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }

  return result.stdout;
}

function sqlLiteral(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

function syncVaultSecret(name, value) {
  const sql = `
do $placeflow$
declare
  target_id uuid;
begin
  select id into target_id from vault.secrets where name = ${sqlLiteral(name)} limit 1;
  if target_id is null then
    perform vault.create_secret(${sqlLiteral(value)}, ${sqlLiteral(name)});
  else
    perform vault.update_secret(target_id, ${sqlLiteral(value)}, ${sqlLiteral(name)});
  end if;
end;
$placeflow$;
`;
  run(["db", "query", "--linked", sql]);
}

console.log("Linking the Supabase project…");
run([
  "link",
  "--project-ref",
  projectRef,
  "--password",
  process.env.SUPABASE_DB_PASSWORD,
  "--yes",
]);

console.log("Applying database migrations…");
run(["db", "push", "--linked", "--include-all"]);

console.log("Synchronizing database webhook secrets…");
syncVaultSecret("placeflow_project_url", process.env.NEXT_PUBLIC_SUPABASE_URL);
syncVaultSecret("placement_webhook_secret", process.env.PLACEMENT_WEBHOOK_SECRET);

console.log("Installing Edge Function secrets…");
run([
  "secrets",
  "set",
  `VAPID_PUBLIC_KEY=${process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY}`,
  `VAPID_PRIVATE_KEY=${process.env.VAPID_PRIVATE_KEY}`,
  `VAPID_SUBJECT=${process.env.VAPID_SUBJECT}`,
  `PLACEMENT_WEBHOOK_SECRET=${process.env.PLACEMENT_WEBHOOK_SECRET}`,
  "--project-ref",
  projectRef,
]);

console.log("Deploying the push webhook function…");
run([
  "functions",
  "deploy",
  "send-push",
  "--project-ref",
  projectRef,
  "--no-verify-jwt",
  "--use-api",
]);

console.log("Refreshing generated database types…");
const generatedTypes = run(
  ["gen", "types", "typescript", "--project-id", projectRef, "--schema", "public"],
  { capture: true },
);
mkdirSync(new URL("../lib/types", import.meta.url), { recursive: true });
writeFileSync(
  new URL("../lib/types/database.types.ts", import.meta.url),
  generatedTypes,
  "utf8",
);

console.log("Supabase database and Edge Function deployment complete.");
