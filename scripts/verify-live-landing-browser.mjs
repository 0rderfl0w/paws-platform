#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';
import { createServer } from 'node:net';

const chromium = process.env.CHROMIUM || '/snap/bin/chromium';
const url = process.argv[2];
const locale = process.argv[3] || 'pt';
const width = Number(process.argv[4] || 1440);
const height = Number(process.argv[5] || 1000);
const portArg = process.argv[6];

if (!url) {
  console.error('usage: node scripts/verify-live-landing-browser.mjs <url> [pt|en] [width] [height] [port]');
  process.exit(2);
}

if (!Number.isFinite(width) || !Number.isFinite(height)) {
  throw new Error(`Invalid viewport: ${width}x${height}`);
}

async function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close(() => reject(new Error('Could not allocate a local CDP port')));
        return;
      }
      const freePort = address.port;
      server.close(() => resolve(freePort));
    });
  });
}

const port = portArg ? Number(portArg) : await getFreePort();
if (!Number.isInteger(port) || port <= 0) {
  throw new Error(`Invalid CDP port: ${portArg}`);
}

const expected = locale === 'en'
  ? { title: 'CAPA Póvoa de Lanhoso — Adopt a Dog', dogHrefPrefix: '/en/dog?id=', helpText: 'Learn how to help', filter: 'Medium' }
  : { title: 'CAPA Póvoa de Lanhoso — Adota um Cão', dogHrefPrefix: '/cao?id=', helpText: 'Saiba como ajudar', filter: 'Médios' };

const profileDir = `/tmp/capa-live-landing-browser-${port}-${Date.now()}`;
let browser = null;
let browserExit = null;
let browserError = null;
let stderr = '';
let ws = null;
let loaded = false;
let nextId = 1;
const pending = new Map();

async function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

function waitForExit(proc, timeoutMs) {
  if (!proc || proc.exitCode !== null) return Promise.resolve();
  return Promise.race([
    new Promise((resolve) => proc.once('exit', resolve)),
    sleep(timeoutMs),
  ]);
}

async function stopBrowser() {
  if (!browser || browser.exitCode !== null) return;
  browser.kill('SIGTERM');
  await waitForExit(browser, 2000);
  if (browser.exitCode === null) {
    browser.kill('SIGKILL');
    await waitForExit(browser, 1000);
  }
}

async function getJsonVersion() {
  for (let i = 0; i < 90; i += 1) {
    if (browserError) throw browserError;
    if (browserExit) throw new Error(`Chrome exited before CDP became ready: ${JSON.stringify(browserExit)}\nstderr:\n${stderr}`);
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) return await res.json();
    } catch {}
    await sleep(100);
  }
  throw new Error(`Chrome CDP not ready. stderr:\n${stderr}`);
}

function send(method, params = {}) {
  if (!ws) throw new Error(`Cannot call ${method}: websocket is not connected`);
  const id = nextId++;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject, method });
  });
}

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
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

  browser.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
  browser.once('error', (error) => { browserError = error; });
  browser.once('exit', (code, signal) => { browserExit = { code, signal }; });

  const version = await getJsonVersion();
  const targetsRes = await fetch(`http://127.0.0.1:${port}/json/list`);
  const targets = await targetsRes.json();
  const pageTarget = targets.find((target) => target.type === 'page' && target.webSocketDebuggerUrl);
  if (!pageTarget) throw new Error(`No page CDP target. Browser version: ${JSON.stringify(version)}`);

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
    if (msg.method === 'Page.loadEventFired') loaded = true;
  });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 700,
  });
  await send('Page.navigate', { url });
  for (let i = 0; i < 120 && !loaded; i += 1) await sleep(100);
  await sleep(1200);

  const initial = await evaluate(`(async () => {
    document.querySelector('#caes')?.scrollIntoView({ block: 'start' });
    await new Promise((resolve) => setTimeout(resolve, 500));
    for (let i = 0; i < 80; i++) {
      if (document.querySelectorAll('[data-featured-dog-card]').length >= 6) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    const cards = [...document.querySelectorAll('[data-featured-dog-card]')];
    return {
      title: document.title,
      htmlLang: document.documentElement.lang,
      hasPlayfulRoot: Boolean(document.querySelector('[data-playful-scroll-reveal]')),
      cardCount: cards.length,
      firstHref: cards[0]?.getAttribute('href') || '',
      hasHelpText: document.body.innerText.includes(${JSON.stringify(expected.helpText)}),
      hasNoindex: Boolean(document.querySelector('meta[name="robots"][content*="noindex"]')),
      overflow: document.documentElement.scrollWidth > window.innerWidth + 2,
    };
  })()`);

  if (initial.title !== expected.title) throw new Error(`Unexpected title: ${initial.title}`);
  if (!initial.hasPlayfulRoot) throw new Error('Missing Playful root marker');
  if (initial.cardCount !== 6) throw new Error(`Expected 6 featured dog cards, got ${initial.cardCount}`);
  if (!initial.firstHref.startsWith(expected.dogHrefPrefix)) throw new Error(`Unexpected first dog href: ${initial.firstHref}`);
  if (!initial.hasHelpText) throw new Error(`Missing help CTA text: ${expected.helpText}`);
  if (initial.hasNoindex) throw new Error('Live landing page has noindex');
  if (initial.overflow) throw new Error('Initial page has horizontal overflow');

  let mobileMenu = null;
  if (width < 700) {
    mobileMenu = await evaluate(`(async () => {
      const button = document.querySelector('#playful-mobile-menu-btn');
      const menu = document.querySelector('#playful-mobile-menu');
      if (!button || !menu) return { present: false };
      button.click();
      await new Promise((resolve) => setTimeout(resolve, 150));
      const opened = !menu.classList.contains('hidden') && button.getAttribute('aria-expanded') === 'true';
      menu.querySelector('ul a[href^="#"]')?.click();
      await new Promise((resolve) => setTimeout(resolve, 150));
      const closed = menu.classList.contains('hidden') && button.getAttribute('aria-expanded') === 'false';
      return { present: true, opened, closed };
    })()`);

    if (!mobileMenu.present) throw new Error('Missing mobile menu controls');
    if (!mobileMenu.opened) throw new Error('Mobile menu did not open');
    if (!mobileMenu.closed) throw new Error('Mobile menu did not close after link click');
  }

  const filterResult = await evaluate(`(async () => {
    const buttons = [...document.querySelectorAll('button[aria-pressed]')];
    const target = buttons.find((button) => button.textContent.trim() === ${JSON.stringify(expected.filter)});
    if (!target) return { clicked: false, cardCount: document.querySelectorAll('[data-featured-dog-card]').length };
    target.click();
    await new Promise((resolve) => setTimeout(resolve, 500));
    return {
      clicked: true,
      pressed: target.getAttribute('aria-pressed'),
      cardCount: document.querySelectorAll('[data-featured-dog-card]').length,
    };
  })()`);

  if (!filterResult.clicked) throw new Error(`Missing filter ${expected.filter}`);
  if (filterResult.pressed !== 'true') throw new Error(`Filter ${expected.filter} was not pressed`);
  if (filterResult.cardCount < 1 || filterResult.cardCount > 6) throw new Error(`Filter returned invalid card count: ${filterResult.cardCount}`);

  const reveal = await evaluate(`(async () => {
    const height = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    const step = Math.max(420, Math.floor(window.innerHeight * 0.72));
    for (let y = 0; y <= height + step; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 220));
    }
    window.scrollTo(0, height);
    await new Promise((resolve) => setTimeout(resolve, 700));
    const items = [...document.querySelectorAll('[data-reveal]')];
    return {
      total: items.length,
      visible: items.filter((item) => item.classList.contains('is-visible')).length,
      hidden: items.filter((item) => item.classList.contains('playful-reveal') && !item.classList.contains('is-visible')).length,
      overflow: document.documentElement.scrollWidth > window.innerWidth + 2,
    };
  })()`);

  if (reveal.hidden !== 0) throw new Error(`Reveal left ${reveal.hidden} hidden element(s)`);
  if (reveal.overflow) throw new Error('Page has horizontal overflow after scrolling');

  console.log(JSON.stringify({ ok: true, url, locale, width, port, initial, mobileMenu, filterResult, reveal }, null, 2));
} finally {
  for (const { reject, method } of pending.values()) {
    reject(new Error(`${method}: browser verifier shutting down`));
  }
  pending.clear();
  try { ws?.close(); } catch {}
  await stopBrowser();
  rmSync(profileDir, { recursive: true, force: true });
}
