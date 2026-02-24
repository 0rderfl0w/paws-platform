import { readFileSync, writeFileSync } from 'fs';
import { setTimeout as sleep } from 'timers/promises';

const dogs = JSON.parse(readFileSync(new URL('./all-dogs.json', import.meta.url), 'utf8'));

function extractDescription(text) {
  // The page content comes as markdown text
  // Lines look like: -Sexo: Masculino;
  // We want to find the block starting with Sexo and ending before nav/menu content
  
  const lines = text.split('\n');
  let descLines = [];
  let inDesc = false;
  
  for (const rawLine of lines) {
    const line = rawLine.trim();
    
    // Start capturing when we hit a Sexo line
    if (/^-?\s*Sexo\s*:/i.test(line)) {
      inDesc = true;
    }
    
    if (inDesc) {
      // Stop if we hit navigation/website structure markers
      if (/^(Home|Blog|Adoptar|Contacto|Instagram|Facebook|Twitter|Partilhar|Tweet|Pin|Email|Comentários|Publicado em|Ver mais|Seguinte|Anterior|Tags:|Categorias:|Arquivo|Newsletter|Subscrever)\b/i.test(line)) {
        break;
      }
      // Stop if we hit empty lines followed by non-description content
      // Allow empty lines within the description block (for História: paragraph)
      if (line.length === 0 && descLines.length > 0) {
        // Check if we're done (peek ahead is handled by continuing)
        descLines.push('');
        continue;
      }
      if (line.length > 0) {
        descLines.push(line);
      }
    }
  }
  
  // Trim trailing empty lines
  while (descLines.length > 0 && descLines[descLines.length - 1].trim() === '') {
    descLines.pop();
  }
  
  if (descLines.length === 0) return '';
  
  // Clean each line
  const cleaned = descLines.map(line => {
    if (line === '') return '';
    // Remove leading dashes
    let l = line.replace(/^[-–—]\s*/, '').trim();
    // Remove trailing semicolons and/or trailing dash (e.g., "fêmeas;-" artifact)
    l = l.replace(/[;\s\-–—]+$/, '').trim();
    return l;
  });
  
  // Remove blank lines (collapse to single newlines for cleaner output)
  const noBlank = cleaned.filter(l => l !== '');
  
  return noBlank.join('\n').trim();
}

async function fetchDogPage(url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'pt-PT,pt;q=0.9',
        },
        signal: AbortSignal.timeout(12000),
      });
      if (!response.ok) {
        console.error(`  HTTP ${response.status} for ${url}`);
        if (attempt < retries) await sleep(1500);
        continue;
      }
      const html = await response.text();
      return html;
    } catch (err) {
      console.error(`  Attempt ${attempt} failed for ${url}: ${err.message}`);
      if (attempt < retries) await sleep(1500);
    }
  }
  return null;
}

function extractFromHtml(html) {
  // Strip scripts and styles first
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Replace block-level tags with newlines
  text = text.replace(/<\/(p|div|li|br|h[1-6]|section|article|header|footer)[^>]*>/gi, '\n');
  text = text.replace(/<br\s*\/?>/gi, '\n');
  
  // Remove remaining tags
  text = text.replace(/<[^>]+>/g, '');
  
  // Decode entities
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&#[0-9]+;/g, ' ')
    .replace(/&[a-z]+;/g, ' ');
  
  // Normalize whitespace within lines but keep newlines
  text = text.split('\n').map(l => l.replace(/[ \t]+/g, ' ').trim()).join('\n');
  // Collapse multiple blank lines to single blank
  text = text.replace(/\n{3,}/g, '\n\n');
  
  return text;
}

async function processBatch(batch) {
  const results = [];
  for (const dog of batch) {
    process.stdout.write(`Fetching: ${dog.name}... `);
    const html = await fetchDogPage(dog.url);
    if (!html) {
      console.log(`FAILED`);
      results.push({ name: dog.name, description: '' });
      continue;
    }
    
    const text = extractFromHtml(html);
    const desc = extractDescription(text);
    
    if (desc) {
      const lines = desc.split('\n').filter(l => l.trim()).length;
      console.log(`OK (${lines} lines)`);
    } else {
      console.log(`EMPTY`);
    }
    results.push({ name: dog.name, description: desc });
  }
  return results;
}

const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 600;
const START_TIME = Date.now();
const MAX_TIME_MS = 5 * 60 * 1000;

const allResults = [];
let succeeded = 0;
let emptyCount = 0;

for (let i = 0; i < dogs.length; i += BATCH_SIZE) {
  if (Date.now() - START_TIME > MAX_TIME_MS) {
    console.log('\n⏱ Time limit reached, stopping.');
    // Fill remaining with empty
    for (let j = i; j < dogs.length; j++) {
      allResults.push({ name: dogs[j].name, description: '' });
    }
    break;
  }
  
  const batch = dogs.slice(i, i + BATCH_SIZE);
  const batchNum = Math.floor(i / BATCH_SIZE) + 1;
  const totalBatches = Math.ceil(dogs.length / BATCH_SIZE);
  console.log(`\n=== Batch ${batchNum}/${totalBatches} (${i + 1}–${i + batch.length}) ===`);
  
  const results = await processBatch(batch);
  allResults.push(...results);
  
  for (const r of results) {
    if (r.description) succeeded++;
    else emptyCount++;
  }
  
  if (i + BATCH_SIZE < dogs.length) {
    await sleep(BATCH_DELAY_MS);
  }
}

writeFileSync(
  new URL('./dogs-descriptions.json', import.meta.url),
  JSON.stringify(allResults, null, 2)
);

const elapsed = ((Date.now() - START_TIME) / 1000).toFixed(1);
console.log(`\n✅ Done in ${elapsed}s`);
console.log(`  Total processed: ${allResults.length}/${dogs.length}`);
console.log(`  With descriptions: ${succeeded}`);
console.log(`  Empty/failed: ${emptyCount}`);
console.log(`  Saved to dogs-descriptions.json`);
