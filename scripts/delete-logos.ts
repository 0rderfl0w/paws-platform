import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(".env", "utf-8").split("\n").filter(l => l.includes("=")).map(l => {
    const [k, ...v] = l.split("=");
    return [k.trim(), v.join("=").trim()];
  })
);

const supabase = createClient(env.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const dogs = JSON.parse(readFileSync("all-dogs.json", "utf-8"));

let deleted = 0;
for (const dog of dogs) {
  const slug = dog.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-");
  
  // List files in this dog's folder
  const { data: files } = await supabase.storage.from("dog-photos").list(slug);
  if (!files) continue;

  // Find and delete the logo (photo-02.jpg that's tiny)
  for (const f of files) {
    if (f.name === "photo-02.jpg" && f.metadata?.size && f.metadata.size < 20000) {
      const { error } = await supabase.storage.from("dog-photos").remove([`${slug}/${f.name}`]);
      if (!error) {
        deleted++;
        console.log(`🗑 Deleted logo from ${slug}/`);
      }
    }
  }
}

console.log(`\n✅ Deleted ${deleted} logos`);
