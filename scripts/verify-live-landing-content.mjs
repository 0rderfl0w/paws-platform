#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const mapsHref = 'https://maps.app.goo.gl/vjuwcaWTdFS4YzARA';
const paypalDonateUrl = 'https://www.paypal.com/donate/?cmd=_s-xclick&hosted_button_id=W6QJXB42XRY4G&source=urlw&ssrt=1782128512360';

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

function checkLivePage({ page, htmlPath, title, ogUrl, dogsHref, adoptHref, helpHref, bankHref, localeNeedles }) {
  const html = readBuilt(htmlPath);
  const context = `${page} (${htmlPath})`;

  assertIncludes(html, 'data-playful-scroll-reveal', context);
  assertIncludes(html, `<title>${title}</title>`, context);
  assertIncludes(html, `property="og:url" content="${ogUrl}"`, context);
  assertIncludes(html, 'property="og:type" content="website"', context);
  assertIncludes(html, 'IBAN: PT50 0010 0000 4591 4000 0014 9', context);
  assertIncludes(html, 'data-footer-iban', context);
  assertIncludes(html, 'data-footer-iban-value', context);
  assertIncludes(html, 'data-footer-visit', context);
  assertIncludes(html, 'data-footer-visit-map', context);
  assertIncludes(html, 'data-visit-source="footer"', context);
  assertIncludes(html, 'data-mobile-menu-scroll', context);
  assertIncludes(html, `href="${mapsHref}"`, context);
  assertIncludes(html, 'target="_blank"', context);
  assertIncludes(html, 'rel="noopener noreferrer"', context);
  assertIncludes(html, 'href="#inicio"', context);
  assertIncludes(html, `href="${dogsHref}"`, context);
  assertIncludes(html, `href="${adoptHref}"`, context);
  assertNotIncludes(html, 'href="#caes"', context);
  assertIncludes(html, 'href="#sobre-nos"', context);
  assertIncludes(html, `href="${helpHref}"`, context);
  assertIncludes(html, 'data-sponsor-modal-open', context);
  assertIncludes(html, 'data-sponsor-modal', context);
  assertIncludes(html, 'name="sponsor_email"', context);
  assertIncludes(html, 'name="sponsor_phone"', context);
  assertIncludes(html, 'name="sponsor_business"', context);
  assertIncludes(html, 'name="sponsor_amount"', context);
  assertIncludes(html, 'name="sponsor_method"', context);
  assertIncludes(html, 'mailto:capa.geralpvl@gmail.com', context);
  assertIncludes(html, 'data-donate-toggle', context);
  assertIncludes(html, 'data-donate-panel', context);
  assertIncludes(html, `href="${paypalDonateUrl}"`, context);
  assertIncludes(html, `href="${bankHref}"`, context);
  assertIncludes(html, 'data-mbway-modal', context);
  assertIncludes(html, 'name="mbway_phone"', context);
  assertNotIncludes(html, 'href="#ajudar"', context);
  assertNotIncludes(html, 'EN310 115<br />Póvoa de Lanhoso, Braga<br />Portugal', context);
  assertNotIncludes(html, 'name="robots" content="noindex, nofollow"', context);
  assertNotIncludes(html, 'CAPA Póvoa de Lanhoso — Test Landing', context);

  for (const needle of localeNeedles) {
    assertIncludes(html, needle, context);
  }

  return { page, checked: 36 + localeNeedles.length, htmlPath: resolve(root, htmlPath) };
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
  assertIncludes(html, 'data-footer-iban', context);
  assertIncludes(html, 'data-footer-iban-value', context);
  assertIncludes(html, 'data-footer-visit', context);
  assertIncludes(html, 'data-footer-visit-map', context);
  assertIncludes(html, 'data-visit-source="footer"', context);
  assertIncludes(html, 'data-mobile-menu-scroll', context);
  assertIncludes(html, 'href="/ajudar"', context);
  assertIncludes(html, 'data-sponsor-modal-open', context);
  assertIncludes(html, 'data-sponsor-modal', context);
  assertIncludes(html, 'name="sponsor_email"', context);
  assertIncludes(html, 'name="sponsor_phone"', context);
  assertIncludes(html, 'name="sponsor_business"', context);
  assertIncludes(html, 'name="sponsor_amount"', context);
  assertIncludes(html, 'name="sponsor_method"', context);
  assertIncludes(html, 'mailto:capa.geralpvl@gmail.com', context);
  assertIncludes(html, 'data-donate-toggle', context);
  assertIncludes(html, 'data-donate-panel', context);
  assertIncludes(html, `href="${paypalDonateUrl}"`, context);
  assertIncludes(html, 'href="/ajudar#apoio-financeiro"', context);
  assertIncludes(html, 'data-donate-menu="home-pt-donate-card"', context);
  assertIncludes(html, 'data-mbway-modal', context);
  assertIncludes(html, 'name="mbway_phone"', context);
  assertNotIncludes(html, 'href="#ajudar"', context);
  assertNotIncludes(html, 'EN310 115<br />Póvoa de Lanhoso, Braga<br />Portugal', context);
  assertNotIncludes(html, 'property="og:url" content="https://capapvl.org/"', context);

  return { page: 'test', checked: 36, htmlPath: resolve(root, htmlPath) };
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
    bankHref: '/ajudar#apoio-financeiro',
    localeNeedles: ['Os Nossos', 'Cães', 'Adota', 'Saiba como ajudar', 'href="/"', 'data-donate-menu="home-pt-donate-card"'],
  }),
  checkLivePage({
    page: 'en',
    htmlPath: 'dist/en/index.html',
    title: 'CAPA Póvoa de Lanhoso — Adopt a Dog',
    ogUrl: 'https://capapvl.org/en/',
    dogsHref: '/en/dogs',
    adoptHref: '/en/adopt',
    helpHref: '/en/help',
    bankHref: '/en/help#financial-support',
    localeNeedles: ['Our', 'Dogs', 'Adopt', 'Learn how to help', 'href="/en/"', 'data-donate-menu="home-en-donate-card"'],
  }),
  checkTestLanding(),
];

console.log(JSON.stringify({ ok: true, pages }, null, 2));
