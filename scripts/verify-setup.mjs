import { loadEnvFile } from "node:process";

try {
  loadEnvFile(".env.local");
} catch {
  // Environment values may be supplied by CI instead of a local file.
}

const expected = [
  ["NEXT_PUBLIC_SUPABASE_URL", "public"],
  ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "public"],
  ["SUPABASE_SECRET_KEY", "secret"],
  ["NEXT_PUBLIC_APP_URL", "public"],
  ["NEXT_PUBLIC_VAPID_PUBLIC_KEY", "public"],
];

const missing = expected.filter(([name]) => !process.env[name]?.trim());
if (missing.length > 0) {
  console.error(`Missing application values: ${missing.map(([name]) => name).join(", ")}`);
  process.exit(1);
}

const publicLeaks = Object.keys(process.env).filter(
  (name) => name.startsWith("NEXT_PUBLIC_") && /SECRET|PRIVATE|PASSWORD|ACCESS_TOKEN/.test(name),
);

if (publicLeaks.length > 0) {
  console.error(`Unsafe browser-visible secret names: ${publicLeaks.join(", ")}`);
  process.exit(1);
}

const supabaseUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
const appUrl = new URL(process.env.NEXT_PUBLIC_APP_URL);

if (supabaseUrl.protocol !== "https:" && supabaseUrl.hostname !== "127.0.0.1") {
  console.error("NEXT_PUBLIC_SUPABASE_URL must use HTTPS outside local development.");
  process.exit(1);
}

if (appUrl.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(appUrl.hostname)) {
  console.error("NEXT_PUBLIC_APP_URL must use HTTPS outside local development.");
  process.exit(1);
}

console.log("PlaceFlow application environment looks ready.");
console.log(`OAuth application redirect: ${appUrl.origin}/auth/callback`);
console.log(`Provider callback: ${supabaseUrl.origin}/auth/v1/callback`);
