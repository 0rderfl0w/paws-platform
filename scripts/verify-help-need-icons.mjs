#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const pages = [
  { page: 'pt-help', htmlPath: 'dist/ajudar/index.html', heading: 'O Que Mais Precisamos' },
  { page: 'en-help', htmlPath: 'dist/en/help/index.html', heading: 'What We Need Most' },
];
const requiredIcons = ['cleaning', 'dog-food', 'medicine', 'other-items'];
const oldNeedGlyphs = ['>✦<', '>◒<', '>✹<'];

function assertIncludes(html, needle, context) {
  if (!html.includes(needle)) throw new Error(`${context}: missing ${JSON.stringify(needle)}`);
}

function assertNotIncludes(html, needle, context) {
  if (html.includes(needle)) throw new Error(`${context}: old abstract glyph still present: ${JSON.stringify(needle)}`);
}

const results = pages.map(({ page, htmlPath, heading }) => {
  const absolute = resolve(root, htmlPath);
  const html = readFileSync(absolute, 'utf8');
  const context = `${page} (${htmlPath})`;
  assertIncludes(html, heading, context);
  for (const icon of requiredIcons) {
    assertIncludes(html, `data-need-icon="${icon}"`, context);
  }
  for (const glyph of oldNeedGlyphs) {
    assertNotIncludes(html, glyph, context);
  }
  const count = (html.match(/data-need-icon="/g) || []).length;
  if (count < 4) throw new Error(`${context}: expected at least 4 need icons, got ${count}`);
  return { page, htmlPath: absolute, checked: requiredIcons.length + oldNeedGlyphs.length + 2, needIconCount: count };
});

console.log(JSON.stringify({ ok: true, pages: results }, null, 2));
