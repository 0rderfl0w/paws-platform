#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const mapsHref = 'https://maps.app.goo.gl/vjuwcaWTdFS4YzARA';

function readBuilt(relativePath) {
  return readFileSync(resolve(root, relativePath), 'utf8');
}

function assertIncludes(html, needle, context) {
  if (!html.includes(needle)) {
    throw new Error(`${context}: expected to include ${JSON.stringify(needle)}`);
  }
}

function assertNotIncludes(html, needle, context) {
  if (html.includes(needle)) {
    throw new Error(`${context}: expected not to include ${JSON.stringify(needle)}`);
  }
}

function checkLivePage({ page, htmlPath, title, ogUrl, dogsHref, adoptHref, helpHref, localeNeedles }) {
  const html = readBuilt(htmlPath);
  const context = `${page} (${htmlPath})`;

  assertIncludes(html, 'data-playful-scroll-reveal', context);
  assertIncludes(html, `<title>${title}</title>`, context);
  assertIncludes(html, `property="og:url" content="${ogUrl}"`, context);
  assertIncludes(html, 'property="og:type" content="website"', context);
  assertIncludes(html, 'IBAN: PT50 0010 0000 4591 4000 0014 9', context);
  assertIncludes(html, `href="${mapsHref}"`, context);
  assertIncludes(html, 'target="_blank"', context);
  assertIncludes(html, 'rel="noopener noreferrer"', context);
  assertIncludes(html, 'href="#inicio"', context);
  assertIncludes(html, `href="${dogsHref}"`, context);
  assertIncludes(html, `href="${adoptHref}"`, context);
  assertNotIncludes(html, 'href="#caes"', context);
  assertIncludes(html, 'href="#sobre-nos"', context);
  assertIncludes(html, `href="${helpHref}"`, context);
  assertNotIncludes(html, 'href="#ajudar"', context);
  assertNotIncludes(html, 'name="robots" content="noindex, nofollow"', context);
  assertNotIncludes(html, 'CAPA Póvoa de Lanhoso — Test Landing', context);

  for (const needle of localeNeedles) {
    assertIncludes(html, needle, context);
  }

  return { page, checked: 15 + localeNeedles.length, htmlPath: resolve(root, htmlPath) };
}

function checkTestLanding() {
  const htmlPath = 'dist/test-landing/index.html';
  const html = readBuilt(htmlPath);
  const context = `test (${htmlPath})`;

  assertIncludes(html, 'data-playful-scroll-reveal', context);
  assertIncludes(html, '<title>CAPA Póvoa de Lanhoso — Test Landing</title>', context);
  assertIncludes(html, 'name="robots" content="noindex, nofollow"', context);
  assertIncludes(html, 'href="/test-landing"', context);
  assertIncludes(html, 'href="/caes"', context);
  assertIncludes(html, 'href="/adocao"', context);
  assertNotIncludes(html, 'href="#caes"', context);
  assertIncludes(html, `href="${mapsHref}"`, context);
  assertIncludes(html, 'target="_blank"', context);
  assertIncludes(html, 'rel="noopener noreferrer"', context);
  assertIncludes(html, 'IBAN: PT50 0010 0000 4591 4000 0014 9', context);
  assertIncludes(html, 'href="/ajudar"', context);
  assertNotIncludes(html, 'href="#ajudar"', context);
  assertNotIncludes(html, 'property="og:url" content="https://capapvl.org/"', context);

  return { page: 'test', checked: 14, htmlPath: resolve(root, htmlPath) };
}

const pages = [
  checkLivePage({
    page: 'pt',
    htmlPath: 'dist/index.html',
    title: 'CAPA Póvoa de Lanhoso — Adota um Cão',
    ogUrl: 'https://capapvl.org/',
    dogsHref: '/caes',
    adoptHref: '/adocao',
    helpHref: '/ajudar',
    localeNeedles: ['Os Nossos', 'Cães', 'Adota', 'Saiba como ajudar', 'href="/"'],
  }),
  checkLivePage({
    page: 'en',
    htmlPath: 'dist/en/index.html',
    title: 'CAPA Póvoa de Lanhoso — Adopt a Dog',
    ogUrl: 'https://capapvl.org/en/',
    dogsHref: '/en/dogs',
    adoptHref: '/en/adopt',
    helpHref: '/en/help',
    localeNeedles: ['Our', 'Dogs', 'Adopt', 'Learn how to help', 'href="/en/"'],
  }),
  checkTestLanding(),
];

console.log(JSON.stringify({ ok: true, pages }, null, 2));
