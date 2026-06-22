#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';
import { createServer } from 'node:net';

const chromium = process.env.CHROMIUM || '/snap/bin/chromium';
const baseUrl = (process.env.PROFILE_BASE_URL || process.argv[2] || 'http://127.0.0.1:4321').replace(/\/$/, '');

const profiles = [
  {
    name: 'athos-pt-desktop',
    path: '/cao/?id=5fd31126-e731-45a8-ae30-b662d83ce4f5',
    dog: 'Athos',
    width: 1440,
    height: 1000,
    alternatePath: '/en/dog?id=5fd31126-e731-45a8-ae30-b662d83ce4f5',
  },
  {
    name: 'athos-pt-mobile',
    path: '/cao/?id=5fd31126-e731-45a8-ae30-b662d83ce4f5',
    dog: 'Athos',
    width: 390,
    height: 900,
    alternatePath: '/en/dog?id=5fd31126-e731-45a8-ae30-b662d83ce4f5',
  },
  {
    name: 'abby-adopted-mobile',
    path: '/cao/?id=35a53d19-adbd-4438-9e1d-7f3022d60fb0',
    dog: 'Abby',
    width: 390,
    height: 900,
    adoptedLabel: 'Adotado!',
    alternatePath: '/en/dog?id=35a53d19-adbd-4438-9e1d-7f3022d60fb0',
  },
  {
    name: 'alana-long-story-desktop',
    path: '/cao/?id=ea404451-14d2-48be-94a6-e3784be6ac33',
    dog: 'Alana',
    width: 1440,
    height: 1000,
  },
  {
    name: 'athos-en-mobile',
    path: '/en/dog/?id=5fd31126-e731-45a8-ae30-b662d83ce4f5',
    dog: 'Athos',
    width: 390,
    height: 900,
    alternatePath: '/cao?id=5fd31126-e731-45a8-ae30-b662d83ce4f5',
  },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
      server.close(() => resolve(address.port));
    });
  });
}

function waitForExit(proc, timeoutMs) {
  if (!proc || proc.exitCode !== null) return Promise.resolve();
  return Promise.race([
    new Promise((resolve) => proc.once('exit', resolve)),
    sleep(timeoutMs),
  ]);
}

const port = await getFreePort();
const profileDir = `/tmp/capa-profile-browser-${port}-${Date.now()}`;
let browser = null;
let browserExit = null;
let browserError = null;
let stderr = '';
let ws = null;
let nextId = 1;
const pending = new Map();
const loadWaiters = new Set();

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
    } catch {
      // Retry until Chromium exposes CDP.
    }
    await sleep(100);
  }
  throw new Error(`Chrome CDP not ready. stderr:\n${stderr}`);
}

function send(method, params = {}) {
  if (!ws) throw new Error(`Cannot call ${method}: websocket is not connected`);
  if (browserError) throw browserError;
  if (browserExit) throw new Error(`Chrome exited during verifier run: ${JSON.stringify(browserExit)}\nstderr:\n${stderr}`);

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

async function navigateAndWait(url) {
  const loaded = new Promise((resolve) => {
    const timer = setTimeout(() => {
      loadWaiters.delete(done);
      resolve(false);
    }, 8000);
    const done = () => {
      clearTimeout(timer);
      loadWaiters.delete(done);
      resolve(true);
    };
    loadWaiters.add(done);
  });

  await send('Page.navigate', { url });
  await loaded;
  await sleep(2600);
}

async function runProfile(profile) {
  await send('Emulation.setDeviceMetricsOverride', {
    width: profile.width,
    height: profile.height,
    deviceScaleFactor: 1,
    mobile: profile.width < 700,
  });

  const url = `${baseUrl}${profile.path}`;
  await navigateAndWait(url);

  const result = await evaluate(`(() => {
    const rect = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    };
    const profile = document.querySelector('[data-dog-profile]');
    const gallery = document.querySelector('[data-dog-profile-gallery]');
    const title = document.querySelector('#dog-profile-heading')?.textContent?.trim() || '';
    const mainImage = gallery?.querySelector('img');
    const galleryFrame = gallery?.querySelector('[data-dog-profile-gallery-frame]');
    const mobileControls = gallery?.querySelector('[data-gallery-mobile-controls]');
    const mobilePrev = gallery?.querySelector('[data-gallery-prev="mobile"]');
    const mobileNext = gallery?.querySelector('[data-gallery-next="mobile"]');
    const desktopPrev = gallery?.querySelector('[data-gallery-prev="desktop"]');
    const desktopNext = gallery?.querySelector('[data-gallery-next="desktop"]');
    const isVisible = (el) => {
      if (!el) return false;
      const style = getComputedStyle(el);
      const box = el.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && box.width > 0 && box.height > 0;
    };
    const galleryLabels = [...(gallery?.querySelectorAll('span') || [])]
      .map((node) => node.textContent.trim())
      .filter(Boolean);
    const languageHrefs = [...document.querySelectorAll('a[aria-label="Português"], a[aria-label="English"]')]
      .map((node) => node.getAttribute('href'))
      .filter(Boolean);
    return {
      url: location.href,
      title,
      hasProfile: Boolean(profile),
      hasGallery: Boolean(gallery),
      profileRect: rect(profile),
      galleryRect: rect(gallery),
      galleryFrameRect: rect(galleryFrame),
      mainImageRect: rect(mainImage),
      mobileControlsRect: rect(mobileControls),
      mobilePrevRect: rect(mobilePrev),
      mobileNextRect: rect(mobileNext),
      desktopPrevRect: rect(desktopPrev),
      desktopNextRect: rect(desktopNext),
      mobileControlsVisible: isVisible(mobileControls),
      mobilePrevVisible: isVisible(mobilePrev),
      mobileNextVisible: isVisible(mobileNext),
      desktopPrevVisible: isVisible(desktopPrev),
      desktopNextVisible: isVisible(desktopNext),
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      galleryLabels,
      languageHrefs,
    };
  })()`);

  const failures = [];
  if (!result.hasProfile) failures.push('missing profile root');
  if (!result.hasGallery) failures.push('missing gallery root');
  if (result.title !== profile.dog) failures.push(`expected dog title ${profile.dog}, got ${result.title}`);
  if (result.scrollWidth > result.innerWidth + 1) failures.push(`horizontal overflow ${result.scrollWidth} > ${result.innerWidth}`);
  if (result.galleryRect && result.profileRect && result.galleryRect.w > result.profileRect.w + 1) {
    failures.push(`gallery wider than profile ${result.galleryRect.w} > ${result.profileRect.w}`);
  }
  if (result.mainImageRect && result.galleryRect && result.mainImageRect.w > result.galleryRect.w + 1) {
    failures.push(`main image wider than gallery ${result.mainImageRect.w} > ${result.galleryRect.w}`);
  }
  if (profile.width < 700) {
    if (!result.mobileControlsVisible || !result.mobilePrevVisible || !result.mobileNextVisible) {
      failures.push('mobile gallery controls are not visible below the photo');
    }
    if (result.desktopPrevVisible || result.desktopNextVisible) {
      failures.push('desktop overlay arrows are visible on mobile');
    }
    if (result.galleryFrameRect && result.mobileControlsRect && result.mobileControlsRect.y < result.galleryFrameRect.y + result.galleryFrameRect.h - 1) {
      failures.push(`mobile gallery controls overlap image frame ${result.mobileControlsRect.y} < ${result.galleryFrameRect.y + result.galleryFrameRect.h}`);
    }
    for (const [label, buttonRect] of [['mobile previous', result.mobilePrevRect], ['mobile next', result.mobileNextRect]]) {
      if (!buttonRect) failures.push(`${label} button missing rect`);
      else if (buttonRect.w > 48 || buttonRect.h > 48) failures.push(`${label} button too large on mobile ${buttonRect.w}x${buttonRect.h}`);
    }
  } else {
    if (!result.desktopPrevVisible || !result.desktopNextVisible) {
      failures.push('desktop gallery overlay arrows are not visible on desktop');
    }
    if (result.mobileControlsVisible) {
      failures.push('mobile gallery controls are visible on desktop');
    }
  }
  if (profile.adoptedLabel && !result.galleryLabels.includes(profile.adoptedLabel)) {
    failures.push(`missing adopted label ${profile.adoptedLabel}`);
  }
  if (profile.alternatePath && !result.languageHrefs.includes(profile.alternatePath)) {
    failures.push(`missing language switch href ${profile.alternatePath}; got ${result.languageHrefs.join(', ')}`);
  }

  return {
    name: profile.name,
    ok: failures.length === 0,
    failures,
    url: result.url,
    title: result.title,
    galleryWidth: result.galleryRect?.w,
    profileWidth: result.profileRect?.w,
    imageWidth: result.mainImageRect?.w,
    galleryFrameRect: result.galleryFrameRect,
    mobileControlsRect: result.mobileControlsRect,
    mobilePrevRect: result.mobilePrevRect,
    mobileNextRect: result.mobileNextRect,
    mobileControlsVisible: result.mobileControlsVisible,
    desktopPrevVisible: result.desktopPrevVisible,
    desktopNextVisible: result.desktopNextVisible,
    scrollWidth: result.scrollWidth,
    innerWidth: result.innerWidth,
    galleryLabels: result.galleryLabels,
    languageHrefs: result.languageHrefs,
  };
}

try {
  browser = spawn(chromium, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
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
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject, method } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(`${method}: ${JSON.stringify(message.error)}`));
      else resolve(message.result);
    }
    if (message.method === 'Page.loadEventFired') {
      for (const waiter of [...loadWaiters]) waiter();
    }
  });

  await send('Page.enable');
  await send('Runtime.enable');

  const results = [];
  for (const profile of profiles) {
    results.push(await runProfile(profile));
  }

  const failed = results.filter((result) => !result.ok);
  console.log(JSON.stringify({ ok: failed.length === 0, baseUrl, port, results }, null, 2));
  if (failed.length > 0) process.exitCode = 1;
} finally {
  for (const { reject, method } of pending.values()) {
    reject(new Error(`${method}: dog profile verifier shutting down`));
  }
  pending.clear();
  loadWaiters.clear();
  try { ws?.close(); } catch {}
  await stopBrowser();
  rmSync(profileDir, { recursive: true, force: true });
}
