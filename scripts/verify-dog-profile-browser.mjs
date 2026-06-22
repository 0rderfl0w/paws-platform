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
  },
  {
    name: 'athos-pt-mobile',
    path: '/cao/?id=5fd31126-e731-45a8-ae30-b662d83ce4f5',
    dog: 'Athos',
    width: 390,
    height: 900,
  },
  {
    name: 'abby-adopted-mobile',
    path: '/cao/?id=35a53d19-adbd-4438-9e1d-7f3022d60fb0',
    dog: 'Abby',
    width: 390,
    height: 900,
    adopted: true,
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
  },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
    server.on('error', reject);
  });
}

async function openCdp(port) {
  for (let i = 0; i < 100; i += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      const pages = await response.json();
      const page = pages.find((entry) => entry.type === 'page');
      if (page?.webSocketDebuggerUrl) {
        const ws = new WebSocket(page.webSocketDebuggerUrl);
        await new Promise((resolve, reject) => {
          ws.addEventListener('open', resolve, { once: true });
          ws.addEventListener('error', reject, { once: true });
        });
        return ws;
      }
    } catch {
      // Retry until Chromium exposes CDP.
    }
    await sleep(100);
  }
  throw new Error('Could not connect to Chromium CDP');
}

async function runProfile(profile) {
  const port = await freePort();
  const userDataDir = `/tmp/capa-profile-check-${process.pid}-${Date.now()}-${Math.random()}`;
  let browser;
  let ws;

  try {
    browser = spawn(
      chromium,
      [
        '--headless=new',
        '--no-sandbox',
        '--disable-gpu',
        `--remote-debugging-port=${port}`,
        `--user-data-dir=${userDataDir}`,
        'about:blank',
      ],
      { stdio: ['ignore', 'ignore', 'pipe'] },
    );

    ws = await openCdp(port);
    let id = 0;
    const pending = new Map();

    ws.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.id && pending.has(message.id)) {
        const { resolve, reject } = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) reject(new Error(JSON.stringify(message.error)));
        else resolve(message.result);
      }
    });

    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const messageId = ++id;
      pending.set(messageId, { resolve, reject });
      ws.send(JSON.stringify({ id: messageId, method, params }));
    });

    const evaluate = async (expression) => {
      const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
      return result.result.value;
    };

    await send('Page.enable');
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', {
      width: profile.width,
      height: profile.height,
      deviceScaleFactor: 1,
      mobile: profile.width < 700,
    });

    const url = `${baseUrl}${profile.path}`;
    await send('Page.navigate', { url });
    await new Promise((resolve) => {
      const listener = (event) => {
        const message = JSON.parse(event.data);
        if (message.method === 'Page.loadEventFired') {
          ws.removeEventListener('message', listener);
          resolve();
        }
      };
      ws.addEventListener('message', listener);
      setTimeout(resolve, 8000);
    });
    await sleep(2600);

    const result = await evaluate(`(() => {
      const rect = (el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height };
      };
      const profile = document.querySelector('[data-dog-profile]');
      const gallery = document.querySelector('[data-dog-profile-gallery]');
      const title = document.querySelector('#dog-profile-heading')?.textContent?.trim() || '';
      const bodyText = document.body.innerText;
      const mainImage = gallery?.querySelector('img');
      const mainImageRect = rect(mainImage);
      return {
        url: location.href,
        title,
        hasProfile: Boolean(profile),
        hasGallery: Boolean(gallery),
        profileRect: rect(profile),
        galleryRect: rect(gallery),
        mainImageRect,
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
        bodyText,
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
    if (profile.adopted && !result.bodyText.includes('ADOTADO!')) failures.push('missing adopted label');

    return {
      name: profile.name,
      ok: failures.length === 0,
      failures,
      url: result.url,
      title: result.title,
      galleryWidth: result.galleryRect?.w,
      profileWidth: result.profileRect?.w,
      imageWidth: result.mainImageRect?.w,
      scrollWidth: result.scrollWidth,
      innerWidth: result.innerWidth,
    };
  } finally {
    if (ws) ws.close();
    if (browser && !browser.killed) browser.kill('SIGTERM');
    await sleep(150);
    rmSync(userDataDir, { recursive: true, force: true });
  }
}

const results = [];
for (const profile of profiles) {
  results.push(await runProfile(profile));
}

const failed = results.filter((result) => !result.ok);
console.log(JSON.stringify({ ok: failed.length === 0, baseUrl, results }, null, 2));
if (failed.length > 0) process.exit(1);
