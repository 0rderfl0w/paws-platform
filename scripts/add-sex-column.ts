import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(".env", "utf-8").split("\n").filter(l => l.includes("=")).map(l => {
    const [k, ...v] = l.split("=");
    return [k.trim(), v.join("=").trim()];
  })
);

const supabase = createClient(env.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const descriptions: { name: string; description: string }[] = JSON.parse(
  readFileSync("dogs-descriptions.json", "utf-8")
);

let updated = 0;
for (const dog of descriptions) {
  let sex: string | null = null;
  if (dog.description.includes('Masculino')) sex = 'male';
  else if (dog.description.includes('Feminino')) sex = 'female';
  
  if (!sex) continue;

  const { error } = await supabase
    .from("dogs")
    .update({ sex })
    .eq("name", dog.name);

  if (error) {
    console.log(`❌ ${dog.name}: ${error.message}`);
  } else {
    updated++;
  }
}

console.log(`✅ Updated ${updated} dogs with sex`);
