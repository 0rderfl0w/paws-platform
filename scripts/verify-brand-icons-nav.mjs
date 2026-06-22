#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';
import { createServer } from 'node:net';

const chromium = process.env.CHROMIUM || '/snap/bin/chromium';
const baseUrl = (process.argv[2] || 'http://127.0.0.1:4178').replace(/\/$/, '');
const portArg = process.argv[3];

async function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

async function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') return reject(new Error('Could not allocate CDP port'));
      const port = address.port;
      server.close(() => resolve(port));
    });
  });
}

const port = portArg ? Number(portArg) : await getFreePort();
const profileDir = `/tmp/capa-brand-nav-${port}-${Date.now()}`;
let browser = null;
let ws = null;
let nextId = 1;
const pending = new Map();

function send(method, params = {}) {
  const id = nextId++;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject, method }));
}

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}

async function waitForCdp() {
  for (let i = 0; i < 90; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) return;
    } catch {}
    await sleep(100);
  }
  throw new Error('Chrome CDP did not become ready');
}

function assert(condition, message, data) {
  if (!condition) throw new Error(`${message}: ${JSON.stringify(data)}`);
}

async function checkPage({ path, width, locale, nav }) {
  await send('Emulation.setDeviceMetricsOverride', { width, height: 820, deviceScaleFactor: 1, mobile: width < 700 });
  await send('Page.navigate', { url: `${baseUrl}${path}` });
  await sleep(1400);

  const result = await evaluate(`(async () => {
    const width = window.innerWidth;
    const mobileButton = document.querySelector(${JSON.stringify(nav === 'site' ? '#playful-site-mobile-menu-btn' : '#playful-mobile-menu-btn')});
    const mobileMenu = document.querySelector(${JSON.stringify(nav === 'site' ? '#playful-site-mobile-menu' : '#playful-mobile-menu')});
    const desktopNav = document.querySelector('nav ul[role="list"]');
    const rect = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom };
    };
    const display = (el) => el ? getComputedStyle(el).display : null;
    const visible = (el) => Boolean(el) && display(el) !== 'none' && rect(el).w > 0 && rect(el).h > 0;
    const brandCounts = Object.fromEntries(['facebook', 'instagram', 'paypal', 'mbway'].map((name) => [name, document.querySelectorAll('[data-brand-icon="' + name + '"]').length]));
    const oldPaymentGlyphs = document.body.textContent.includes('◈') || document.body.textContent.includes('▯');
    const data = {
      width,
      path: location.pathname,
      mobileButtonDisplay: display(mobileButton),
      mobileButtonRect: rect(mobileButton),
      mobileMenuClass: mobileMenu?.className || '',
      desktopNavDisplay: display(desktopNav),
      desktopNavRect: rect(desktopNav),
      brandCounts,
      oldPaymentGlyphs,
      overflow: document.documentElement.scrollWidth > window.innerWidth + 2,
    };

    if (width < 1000) {
      mobileButton?.click();
      await new Promise((resolve) => setTimeout(resolve, 220));
      const mobileSocials = document.querySelector('[data-mobile-socials]');
      const socialIcons = mobileSocials ? [...mobileSocials.querySelectorAll('[data-brand-icon]')].map((node) => node.getAttribute('data-brand-icon')) : [];
      const socialLinks = mobileSocials ? [...mobileSocials.querySelectorAll('a')].map((link) => ({ href: link.getAttribute('href'), target: link.getAttribute('target'), rel: link.getAttribute('rel') })) : [];
      const socialCluster = mobileSocials?.querySelector('span');
      const socialRect = rect(mobileSocials);
      const socialClusterRect = rect(socialCluster);
      const socialCenterDelta = socialRect && socialClusterRect
        ? Math.abs((socialClusterRect.x + socialClusterRect.w / 2) - (socialRect.x + socialRect.w / 2))
        : null;
      const donateRoot = document.querySelector('[data-donate-menu*="mobile"]');
      const donateToggle = donateRoot?.querySelector('[data-donate-toggle]');
      donateToggle?.click();
      await new Promise((resolve) => setTimeout(resolve, 220));
      const panelIcons = donateRoot ? [...donateRoot.querySelectorAll('[data-brand-icon]')].map((node) => node.getAttribute('data-brand-icon')) : [];
      return {
        ...data,
        mobileButtonVisible: visible(mobileButton),
        mobileOpen: mobileMenu && !mobileMenu.classList.contains('hidden'),
        mobileSocialsPresent: Boolean(mobileSocials),
        mobileSocialsText: mobileSocials?.textContent?.trim() || '',
        socialCenterDelta,
        socialRect,
        socialClusterRect,
        socialIcons,
        socialLinks,
        donatePanelIcons: panelIcons,
      };
    }

    return {
      ...data,
      mobileButtonVisible: visible(mobileButton),
      desktopNavVisible: visible(desktopNav),
    };
  })()`);

  assert(!result.overflow, 'Page has horizontal overflow', result);
  assert(!result.oldPaymentGlyphs, 'Old payment placeholder glyph remains', result);
  assert(result.brandCounts.facebook >= 2, 'Facebook icon missing from page', result);
  assert(result.brandCounts.instagram >= 2, 'Instagram icon missing from page', result);
  assert(result.brandCounts.paypal >= 1, 'PayPal icon missing from page', result);
  assert(result.brandCounts.mbway >= 1, 'MB Way icon missing from page', result);

  if (width < 1000) {
    assert(result.mobileButtonVisible, 'Burger button should be visible below 1000px', result);
    assert(result.mobileOpen, 'Mobile menu did not open below 1000px', result);
    assert(result.mobileSocialsPresent, 'Mobile menu social icon row missing', result);
    assert(result.mobileSocialsText === '', 'Mobile menu social row should not contain visible label text', result);
    assert(result.socialCenterDelta !== null && result.socialCenterDelta <= 2, 'Mobile menu social icons are not centered in their row', result);
    assert(result.socialIcons.includes('facebook') && result.socialIcons.includes('instagram'), 'Mobile menu social icons missing', result);
    assert(result.socialLinks.every((link) => link.target === '_blank' && (link.rel || '').includes('noopener')), 'Mobile social links are not safe external links', result);
    assert(result.donatePanelIcons.includes('paypal') && result.donatePanelIcons.includes('mbway'), 'Mobile donate menu payment icons missing', result);
  } else {
    assert(!result.mobileButtonVisible, 'Burger button should be hidden at 1000px and above', result);
    assert(result.desktopNavVisible, 'Desktop nav should be visible at 1000px and above', result);
  }

  return { locale, nav, path, width, ok: true, brandCounts: result.brandCounts };
}

try {
  browser = spawn(chromium, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--hide-scrollbars',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });

  await waitForCdp();
  const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((res) => res.json());
  const pageTarget = targets.find((target) => target.type === 'page' && target.webSocketDebuggerUrl);
  ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject, method } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(`${method}: ${JSON.stringify(msg.error)}`));
      else resolve(msg.result);
    }
  });
  await send('Page.enable');
  await send('Runtime.enable');

  const cases = [
    { path: '/', locale: 'pt', nav: 'home' },
    { path: '/ajudar/', locale: 'pt', nav: 'site' },
    { path: '/en/help/', locale: 'en', nav: 'site' },
  ];
  const results = [];
  for (const item of cases) {
    results.push(await checkPage({ ...item, width: 999 }));
    results.push(await checkPage({ ...item, width: 1000 }));
  }
  console.log(JSON.stringify({ ok: true, baseUrl, results }, null, 2));
} finally {
  for (const { reject, method } of pending.values()) reject(new Error(`${method}: verifier shutting down`));
  pending.clear();
  try { ws?.close(); } catch {}
  if (browser && browser.exitCode === null) browser.kill('SIGTERM');
  await sleep(500);
  rmSync(profileDir, { recursive: true, force: true });
}
