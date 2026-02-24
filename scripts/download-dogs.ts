#!/usr/bin/env bun
/**
 * Download all dog photos + descriptions from capapvl.pt
 * 
 * Reads all-dogs.json (list of {name, url, size})
 * For each dog:
 *   1. Fetches the detail page HTML
 *   2. Extracts all photo URLs (static.tildacdn.com)
 *   3. Extracts the description text
 *   4. Downloads photos into organized folders
 *   5. Saves description to info.txt
 * 
 * Folder structure:
 *   dogs/
 *     pequenos/    (small)
 *       dog-name/
 *         info.txt
 *         photo-01.jpg
 *         photo-02.jpg
 *     medios/      (medium)
 *       dog-name/
 *         ...
 *     grandes/     (large)
 *       dog-name/
 *         ...
 * 
 * Usage: bun run scripts/download-dogs.ts
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const SIZE_FOLDERS: Record<string, string> = {
  small: 'pequenos',
  medium: 'medios',
  large: 'grandes',
};

const BASE_DIR = join(import.meta.dir, '..', 'dogs');
const DOGS_JSON = join(import.meta.dir, '..', 'all-dogs.json');

// Rate limiting
const DELAY_BETWEEN_DOGS = 500; // ms between dog page fetches
const DELAY_BETWEEN_PHOTOS = 200; // ms between photo downloads
const MAX_RETRIES = 3;

interface DogEntry {
  name: string;
  url: string;
  size: 'small' | 'medium' | 'large';
}

interface DogData {
  name: string;
  size: string;
  url: string;
  description: string;
  photoUrls: string[];
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function sanitizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<Response | null> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': '*/*',
        },
      });
      if (res.ok) return res;
      console.warn(`  ⚠️  HTTP ${res.status} for ${url} (attempt ${i + 1}/${retries})`);
    } catch (err) {
      console.warn(`  ⚠️  Fetch error for ${url} (attempt ${i + 1}/${retries}): ${err}`);
    }
    if (i < retries - 1) await sleep(1000);
  }
  return null;
}

function extractPhotoUrls(html: string): string[] {
  const urls = new Set<string>();
  
  // Match static.tildacdn.com image URLs (full-size photos)
  const staticRegex = /https:\/\/static\.tildacdn\.(com|net)\/[^"'\s<>]+\.(jpg|jpeg|png|JPG|JPEG|PNG)/g;
  let match;
  while ((match = staticRegex.exec(html)) !== null) {
    urls.add(match[0]);
  }

  // Also check for optim.tildacdn.com URLs (optimized versions)
  const optimRegex = /https:\/\/optim\.tildacdn\.(com|net)\/[^"'\s<>]+\.(jpg|jpeg|png|webp|JPG|JPEG|PNG)[^"'\s<>]*/g;
  while ((match = optimRegex.exec(html)) !== null) {
    // Convert optim URLs to static URLs if possible (get full-size)
    // optim format: https://optim.tildacdn.com/tild6330-3638-4539-b061-306333333230/-/resize/480x360/-/format/webp/IMG_5771.JPG.webp
    // static format: https://static.tildacdn.com/tild6330-3638-4539-b061-306333333230/IMG_5771.JPG
    const optimUrl = match[0];
    const tildIdMatch = optimUrl.match(/tild[a-f0-9-]+/);
    const filenameMatch = optimUrl.match(/\/([^/]+\.(jpg|jpeg|png|JPG|JPEG|PNG))(\.\w+)?$/);
    if (tildIdMatch && filenameMatch) {
      const staticUrl = `https://static.tildacdn.com/${tildIdMatch[0]}/${filenameMatch[1]}`;
      urls.add(staticUrl);
    }
  }

  return [...urls];
}

function extractDescription(html: string): string {
  // The description is in the page body after the gallery
  // It contains structured data like -Sexo:, -Idade:, -Personalidade:, -História:, etc.
  
  const lines: string[] = [];
  
  // Try to extract text content between common Tilda text block elements
  // Match content inside <p>, <div> with text that looks like dog info
  const textRegex = /<(?:p|div|li)[^>]*>([^<]+)<\/(?:p|div|li)>/g;
  let match;
  while ((match = textRegex.exec(html)) !== null) {
    const text = match[1]
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
    
    if (text && text.length > 2) {
      // Check if it looks like dog profile data
      if (text.startsWith('-') || 
          text.includes('Sexo') || 
          text.includes('Idade') || 
          text.includes('Raça') || 
          text.includes('Porte') ||
          text.includes('Personalidade') ||
          text.includes('Sociável') ||
          text.includes('Chipado') || text.includes('Chipada') ||
          text.includes('Vacinado') || text.includes('Vacinada') ||
          text.includes('Esterilizado') || text.includes('Esterilizada') ||
          text.includes('História') ||
          text.length > 50) { // Likely a history/description paragraph
        lines.push(text);
      }
    }
  }

  return lines.join('\n');
}

function getExtension(url: string): string {
  const match = url.match(/\.(jpg|jpeg|png|JPG|JPEG|PNG)/);
  return match ? match[1].toLowerCase() : 'jpg';
}

async function processDog(dog: DogEntry, index: number, total: number): Promise<DogData | null> {
  const sizeFolder = SIZE_FOLDERS[dog.size] || 'outros';
  const dogFolder = sanitizeName(dog.name);
  const fullPath = join(BASE_DIR, sizeFolder, dogFolder);

  console.log(`[${index + 1}/${total}] 🐕 ${dog.name} (${sizeFolder}) → ${fullPath}`);

  // Fetch dog page HTML
  const res = await fetchWithRetry(dog.url);
  if (!res) {
    console.error(`  ❌ Failed to fetch page for ${dog.name}`);
    return null;
  }

  const html = await res.text();

  // Extract data
  const photoUrls = extractPhotoUrls(html);
  const description = extractDescription(html);

  console.log(`  📸 ${photoUrls.length} photos found`);

  if (photoUrls.length === 0 && !description) {
    console.warn(`  ⚠️  No data found for ${dog.name}`);
    return null;
  }

  // Create directory
  mkdirSync(fullPath, { recursive: true });

  // Save description
  const infoContent = [
    `Nome: ${dog.name}`,
    `Tamanho: ${sizeFolder}`,
    `URL: ${dog.url}`,
    '',
    description || '(sem descrição)',
  ].join('\n');
  writeFileSync(join(fullPath, 'info.txt'), infoContent, 'utf-8');

  // Download photos
  for (let i = 0; i < photoUrls.length; i++) {
    const photoUrl = photoUrls[i];
    const ext = getExtension(photoUrl);
    const filename = `photo-${String(i + 1).padStart(2, '0')}.${ext}`;
    const filepath = join(fullPath, filename);

    if (existsSync(filepath)) {
      console.log(`  ⏩ ${filename} (already exists)`);
      continue;
    }

    const photoRes = await fetchWithRetry(photoUrl);
    if (photoRes) {
      const buffer = await photoRes.arrayBuffer();
      writeFileSync(filepath, Buffer.from(buffer));
      console.log(`  ✅ ${filename} (${(buffer.byteLength / 1024).toFixed(0)} KB)`);
    } else {
      console.warn(`  ❌ Failed to download ${photoUrl}`);
    }

    if (i < photoUrls.length - 1) await sleep(DELAY_BETWEEN_PHOTOS);
  }

  return {
    name: dog.name,
    size: dog.size,
    url: dog.url,
    description,
    photoUrls,
  };
}

async function main() {
  console.log('🐾 CAPA PVL Dog Photo Downloader');
  console.log('================================\n');

  // Load dog list
  if (!existsSync(DOGS_JSON)) {
    console.error(`❌ ${DOGS_JSON} not found!`);
    console.error('   Run the browser scraper first to generate this file.');
    process.exit(1);
  }

  const dogs: DogEntry[] = JSON.parse(await Bun.file(DOGS_JSON).text());
  console.log(`📋 Loaded ${dogs.length} dogs from all-dogs.json`);
  
  const counts = {
    small: dogs.filter(d => d.size === 'small').length,
    medium: dogs.filter(d => d.size === 'medium').length,
    large: dogs.filter(d => d.size === 'large').length,
  };
  console.log(`   Pequenos: ${counts.small} | Médios: ${counts.medium} | Grandes: ${counts.large}\n`);

  // Create base directories
  for (const folder of Object.values(SIZE_FOLDERS)) {
    mkdirSync(join(BASE_DIR, folder), { recursive: true });
  }

  // Process each dog
  const results: DogData[] = [];
  const failures: string[] = [];

  for (let i = 0; i < dogs.length; i++) {
    const result = await processDog(dogs[i], i, dogs.length);
    if (result) {
      results.push(result);
    } else {
      failures.push(dogs[i].name);
    }
    if (i < dogs.length - 1) await sleep(DELAY_BETWEEN_DOGS);
  }

  // Summary
  console.log('\n================================');
  console.log('📊 Download Summary:');
  console.log(`   ✅ Success: ${results.length}/${dogs.length}`);
  console.log(`   ❌ Failed: ${failures.length}`);
  if (failures.length > 0) {
    console.log(`   Failed dogs: ${failures.join(', ')}`);
  }
  
  const totalPhotos = results.reduce((sum, d) => sum + d.photoUrls.length, 0);
  console.log(`   📸 Total photos downloaded: ${totalPhotos}`);
  console.log(`\n📁 Output: ${BASE_DIR}/`);

  // Save manifest
  const manifest = {
    downloadedAt: new Date().toISOString(),
    totalDogs: results.length,
    totalPhotos,
    failures,
    dogs: results.map(d => ({
      name: d.name,
      size: d.size,
      photos: d.photoUrls.length,
      url: d.url,
    })),
  };
  writeFileSync(join(BASE_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log('📝 Manifest saved to dogs/manifest.json');
}

main().catch(console.error);
