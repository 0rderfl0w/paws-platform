/**
 * upload-dogs.ts
 * Uploads 104 dogs + their photos to Supabase.
 * Run: bun run scripts/upload-dogs.ts
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join, extname } from "path";
import sharp from "sharp";

// ── Config ──────────────────────────────────────────────────────────────────

const PROJECT_ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const ENV_PATH = join(PROJECT_ROOT, ".env");
const DOGS_JSON_PATH = join(PROJECT_ROOT, "all-dogs.json");
const DOGS_DIR = join(PROJECT_ROOT, "dogs");

const MAX_RETRIES = 3;
const DELAY_MS = 300; // between dogs
const UPLOAD_DELAY_MS = 100; // between individual photo uploads
const TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes hard stop

// ── Parse .env ───────────────────────────────────────────────────────────────

function parseEnv(path: string): Record<string, string> {
  const env: Record<string, string> = {};
  const lines = readFileSync(path, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    env[key] = val;
  }
  return env;
}

const env = parseEnv(ENV_PATH);
const SUPABASE_URL = env["PUBLIC_SUPABASE_URL"];
const SERVICE_ROLE_KEY = env["SUPABASE_SERVICE_ROLE_KEY"];

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ Missing SUPABASE_URL or SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

// ── Supabase client (service role — bypasses RLS) ────────────────────────────

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ── Helpers ──────────────────────────────────────────────────────────────────

const sizeFolder: Record<string, string> = {
  small: "pequenos",
  medium: "medios",
  large: "grandes",
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

interface Dog {
  name: string;
  url: string;
  size: "small" | "medium" | "large";
}

function getPhotos(dogName: string, size: string): string[] {
  const folder = join(DOGS_DIR, sizeFolder[size] ?? size, dogName.toLowerCase());
  if (!existsSync(folder)) return [];
  const files = readdirSync(folder)
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
    .sort();
  return files.map((f) => join(folder, f));
}

async function resizePhoto(filePath: string): Promise<Buffer> {
  return sharp(filePath)
    .resize({ width: 1200, withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();
}

async function uploadWithRetry(
  storagePath: string,
  buffer: Buffer,
  retries = MAX_RETRIES
): Promise<string | null> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const { error } = await supabase.storage
      .from("dog-photos")
      .upload(storagePath, buffer, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (!error) {
      const { data } = supabase.storage
        .from("dog-photos")
        .getPublicUrl(storagePath);
      return data.publicUrl;
    }

    console.warn(
      `    ⚠️  Upload attempt ${attempt}/${retries} failed for ${storagePath}: ${error.message}`
    );
    if (attempt < retries) await sleep(500 * attempt);
  }
  return null;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const startTime = Date.now();
  const dogs: Dog[] = JSON.parse(readFileSync(DOGS_JSON_PATH, "utf8"));

  let uploaded = 0;
  let skipped = 0;
  let totalPhotos = 0;
  const failures: string[] = [];

  console.log(`🐾 Starting upload of ${dogs.length} dogs...\n`);

  for (let i = 0; i < dogs.length; i++) {
    if (Date.now() - startTime > TIMEOUT_MS) {
      console.warn("⏰ 10-minute timeout reached. Stopping early.");
      break;
    }

    const dog = dogs[i];
    const idx = `[${i + 1}/${dogs.length}]`;
    console.log(`${idx} Uploading ${dog.name}...`);

    const photos = getPhotos(dog.name, dog.size);

    if (photos.length === 0) {
      console.warn(`  ⚠️  No photos found for ${dog.name} (size: ${dog.size})`);
      failures.push(`${dog.name} — no photos found`);
      skipped++;
      continue;
    }

    // ── Upload first photo → get URL → insert DB row ──────────────────────

    let firstPhotoUrl: string | null = null;

    try {
      const firstPhotoBuffer = await resizePhoto(photos[0]);
      const storagePath = `${dog.name.toLowerCase()}/photo-01.jpg`;
      firstPhotoUrl = await uploadWithRetry(storagePath, firstPhotoBuffer);

      if (!firstPhotoUrl) {
        throw new Error("All retry attempts failed for first photo");
      }

      totalPhotos++;
      console.log(`  ✅ First photo uploaded → ${storagePath}`);
    } catch (err: any) {
      console.error(`  ❌ Failed to upload first photo for ${dog.name}: ${err.message}`);
      failures.push(`${dog.name} — first photo upload failed`);
      skipped++;
      continue;
    }

    // ── Insert DB row ──────────────────────────────────────────────────────

    try {
      const { error: dbError } = await supabase.from("dogs").insert({
        name: dog.name,
        size: dog.size,
        photo_url: firstPhotoUrl,
        is_adopted: false,
      });

      if (dbError) throw dbError;

      console.log(`  ✅ DB row inserted for ${dog.name}`);
      uploaded++;
    } catch (err: any) {
      console.error(`  ❌ DB insert failed for ${dog.name}: ${err.message}`);
      failures.push(`${dog.name} — DB insert failed`);
      skipped++;
      // Photo is already uploaded, but we can't use it — log and continue
      continue;
    }

    // ── Upload remaining photos ────────────────────────────────────────────

    for (let p = 1; p < photos.length; p++) {
      if (Date.now() - startTime > TIMEOUT_MS) break;

      try {
        const buffer = await resizePhoto(photos[p]);
        const photoNum = String(p + 1).padStart(2, "0");
        const storagePath = `${dog.name.toLowerCase()}/photo-${photoNum}.jpg`;
        const url = await uploadWithRetry(storagePath, buffer);

        if (url) {
          totalPhotos++;
          await sleep(UPLOAD_DELAY_MS);
        } else {
          console.warn(`  ⚠️  Skipped extra photo ${p + 1} for ${dog.name}`);
        }
      } catch (err: any) {
        console.warn(`  ⚠️  Extra photo ${p + 1} for ${dog.name} failed: ${err.message}`);
      }
    }

    await sleep(DELAY_MS);
  }

  // ── Summary ──────────────────────────────────────────────────────────────

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log("\n" + "═".repeat(50));
  console.log("📊 Upload Summary");
  console.log("═".repeat(50));
  console.log(`✅ Dogs uploaded to DB:  ${uploaded}/${dogs.length}`);
  console.log(`📸 Total photos stored:  ${totalPhotos}`);
  console.log(`⚠️  Dogs skipped:         ${skipped}`);
  console.log(`⏱️  Elapsed time:          ${elapsed}s`);

  if (failures.length > 0) {
    console.log("\n❌ Failures:");
    failures.forEach((f) => console.log(`  - ${f}`));
  }

  console.log("\n✨ Done!");
}

main().catch((err) => {
  console.error("💥 Fatal error:", err);
  process.exit(1);
});
