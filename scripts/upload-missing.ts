import { readFileSync, readdirSync, existsSync } from "fs";
import { join, extname } from "path";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(".env", "utf-8").split("\n").filter(l => l.includes("=")).map(l => {
    const [k, ...v] = l.split("=");
    return [k.trim(), v.join("=").trim()];
  })
);

const supabase = createClient(env.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const missing = [
  { name: "Jóia", folder: "dogs/medios/joia", size: "medium" },
  { name: "Leão", folder: "dogs/medios/leao", size: "medium" },
  { name: "Limão", folder: "dogs/medios/limao", size: "medium" },
  { name: "Noélia", folder: "dogs/medios/noelia", size: "medium" },
  { name: "Tim Tim", folder: "dogs/medios/tim-tim", size: "medium" },
  { name: "Capitão", folder: "dogs/grandes/capitao", size: "large" },
  { name: "Romeu", folder: "dogs/grandes/romeu", size: "large" },
  { name: "Ringo", folder: "dogs/grandes/ringo", size: "large" },
  { name: "Stuart", folder: "dogs/grandes/stuart", size: "large" },
];

for (const dog of missing) {
  const slug = dog.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-");
  
  if (!existsSync(dog.folder)) {
    console.log(`⚠️  Folder not found for ${dog.name}: ${dog.folder}`);
    continue;
  }

  const photos = readdirSync(dog.folder)
    .filter(f => /\.(jpe?g|png|webp)$/i.test(f))
    .sort();

  if (photos.length === 0) {
    console.log(`⚠️  No photos for ${dog.name}`);
    continue;
  }

  // Resize + upload first photo
  const photoPath = join(dog.folder, photos[0]);
  const resized = await sharp(readFileSync(photoPath))
    .resize({ width: 1200, withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();

  const storagePath = `${slug}/photo-01.jpg`;
  const { error: uploadErr } = await supabase.storage
    .from("dog-photos")
    .upload(storagePath, resized, { contentType: "image/jpeg", upsert: true });

  if (uploadErr) {
    console.log(`❌ Upload failed for ${dog.name}: ${uploadErr.message}`);
    continue;
  }

  const { data: urlData } = supabase.storage.from("dog-photos").getPublicUrl(storagePath);

  const { error: dbErr } = await supabase.from("dogs").insert({
    name: dog.name,
    size: dog.size,
    photo_url: urlData.publicUrl,
    is_adopted: false,
  });

  if (dbErr) {
    console.log(`❌ DB insert failed for ${dog.name}: ${dbErr.message}`);
    continue;
  }

  console.log(`✅ ${dog.name} — uploaded + inserted`);

  // Upload remaining photos
  for (let i = 1; i < photos.length; i++) {
    const p = join(dog.folder, photos[i]);
    const buf = await sharp(readFileSync(p))
      .resize({ width: 1200, withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
    const sp = `${slug}/photo-${String(i + 1).padStart(2, "0")}.jpg`;
    await supabase.storage.from("dog-photos").upload(sp, buf, { contentType: "image/jpeg", upsert: true });
  }
  console.log(`   📸 ${photos.length} photos uploaded for ${dog.name}`);
}

// Final count
const { count } = await supabase.from("dogs").select("*", { count: "exact", head: true });
console.log(`\n🐾 Total dogs in DB: ${count}`);
