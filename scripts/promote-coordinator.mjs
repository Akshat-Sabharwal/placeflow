import { createClient } from "@supabase/supabase-js";
import { loadEnvFile } from "node:process";

try {
  loadEnvFile(".env.local");
} catch {
  // Environment values may be supplied by CI instead of a local file.
}

const email = process.argv[2]?.trim().toLowerCase();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;

if (!email || !url || !secret) {
  console.error(
    "Usage: NEXT_PUBLIC_SUPABASE_URL=… SUPABASE_SECRET_KEY=… npm run supabase:promote -- coordinator@example.edu",
  );
  process.exit(1);
}

const supabase = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: profile, error: profileError } = await supabase
  .from("profiles")
  .select("id,email")
  .eq("email", email)
  .maybeSingle();

if (profileError) {
  console.error(`Could not look up the account: ${profileError.message}`);
  process.exit(1);
}

if (!profile) {
  console.error("No matching account exists. Ask the coordinator to sign in once first.");
  process.exit(1);
}

const { error: roleError } = await supabase
  .from("user_roles")
  .update({ role: "coordinator", granted_at: new Date().toISOString() })
  .eq("user_id", profile.id);

if (roleError) {
  console.error(`Could not promote the account: ${roleError.message}`);
  process.exit(1);
}

console.log(`${email} is now a PlaceFlow coordinator.`);
