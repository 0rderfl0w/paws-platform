#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';

const chromium = process.env.CHROMIUM || '/snap/bin/chromium';
const baseUrl = (process.argv[2] || 'http://127.0.0.1:4321').replace(/\/$/, '');
const portArg = process.argv[3];

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
if (!Number.isInteger(port) || port <= 0) throw new Error(`Invalid CDP port: ${portArg}`);

const profileDir = `/tmp/capa-volunteer-browser-${port}-${Date.now()}`;
const screenshotDir = '/tmp/capa-volunteer-form-qa';
mkdirSync(screenshotDir, { recursive: true });

let browser = null;
let browserExit = null;
let browserError = null;
let stderr = '';
let ws = null;
let nextId = 1;
let loaded = false;
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

async function navigate(path, width = 1440, height = 1100) {
  loaded = false;
  await send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 700,
  });
  await send('Page.navigate', { url: `${baseUrl}${path}` });
  for (let i = 0; i < 120 && !loaded; i += 1) await sleep(100);
  await sleep(1000);
}

async function capture(name) {
  const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  const path = `${screenshotDir}/${name}.png`;
  writeFileSync(path, Buffer.from(result.data, 'base64'));
  return path;
}

async function captureClip(name, clip) {
  const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip });
  const path = `${screenshotDir}/${name}.png`;
  writeFileSync(path, Buffer.from(result.data, 'base64'));
  return path;
}

async function checkHelpLink(path, expectedHref, label) {
  await navigate(path, 1280, 900);
  return await evaluate(`(() => {
    const link = [...document.querySelectorAll('a')].find((anchor) => anchor.getAttribute('href') === ${JSON.stringify(expectedHref)});
    return {
      ok: Boolean(link),
      path: ${JSON.stringify(path)},
      expectedHref: ${JSON.stringify(expectedHref)},
      text: link?.textContent?.trim() || '',
      label: ${JSON.stringify(label)},
      overflow: document.documentElement.scrollWidth > window.innerWidth + 2,
    };
  })()`);
}

async function checkHeroActions(path, expectedVolunteerHref, instanceId, donateLabel, locale, mode = 'desktop') {
  await navigate(path, mode === 'mobile' ? 390 : 1280, mode === 'mobile' ? 900 : 900);
  const result = await evaluate(`(async () => {
    const volunteer = document.querySelector('[data-hero-volunteer-link]');
    const donateRoot = document.querySelector('[data-donate-menu="${instanceId}"]');
    const donateToggle = donateRoot?.querySelector('[data-donate-toggle]');
    const donatePanel = donateRoot?.querySelector('[data-donate-panel]');
    donateToggle?.click();
    await new Promise((resolve) => setTimeout(resolve, 250));
    const items = [...(donatePanel?.querySelectorAll('[role="menuitem"]') || [])].map((item) => item.textContent.trim().replace(/\\s+/g, ' '));
    const rect = donatePanel?.getBoundingClientRect();
    return {
      ok: Boolean(volunteer && donateRoot && donateToggle && donatePanel),
      path: ${JSON.stringify(path)},
      volunteerHref: volunteer?.getAttribute('href') || '',
      volunteerText: volunteer?.textContent?.trim().replace(/\\s+/g, ' ') || '',
      expectedVolunteerHref: ${JSON.stringify(expectedVolunteerHref)},
      donateText: donateToggle?.textContent?.trim().replace(/\\s+/g, ' ') || '',
      donateLabel: ${JSON.stringify(donateLabel)},
      donateOpen: donateToggle?.getAttribute('aria-expanded') === 'true' && !donatePanel?.classList.contains('hidden'),
      items,
      panelWithinViewport: Boolean(rect && rect.left >= -2 && rect.right <= window.innerWidth + 2 && rect.top >= -2 && rect.bottom <= window.innerHeight + 2),
      overflow: document.documentElement.scrollWidth > window.innerWidth + 2,
    };
  })()`);
  result.screenshot = await capture(`hero-${locale}-${mode}-donate-open`);
  if (!result.ok) throw new Error(`Hero actions missing for ${path}: ${JSON.stringify(result)}`);
  if (result.volunteerHref !== expectedVolunteerHref) throw new Error(`Hero volunteer href mismatch for ${path}: ${JSON.stringify(result)}`);
  if (!result.donateText.includes(donateLabel)) throw new Error(`Hero donate label mismatch for ${path}: ${JSON.stringify(result)}`);
  if (!result.donateOpen) throw new Error(`Hero donate dropdown did not open for ${path}: ${JSON.stringify(result)}`);
  if (!result.items.some((item) => item.includes('PayPal')) || !result.items.some((item) => item.includes('MB Way')) || result.items.length < 3) {
    throw new Error(`Hero donate options missing for ${path}: ${JSON.stringify(result)}`);
  }
  if (!result.panelWithinViewport || result.overflow) throw new Error(`Hero donate dropdown overflows for ${path}: ${JSON.stringify(result)}`);
  return result;
}

async function checkDonateSiblingClose(path, navInstanceId, heroInstanceId, locale) {
  await navigate(path, 1280, 900);
  const result = await evaluate(`(async () => {
    const navRoot = document.querySelector('[data-donate-menu="${navInstanceId}"]');
    const heroRoot = document.querySelector('[data-donate-menu="${heroInstanceId}"]');
    const navToggle = navRoot?.querySelector('[data-donate-toggle]');
    const heroToggle = heroRoot?.querySelector('[data-donate-toggle]');
    const navPanel = navRoot?.querySelector('[data-donate-panel]');
    const heroPanel = heroRoot?.querySelector('[data-donate-panel]');

    navToggle?.click();
    await new Promise((resolve) => setTimeout(resolve, 100));
    const navInitiallyOpen = navToggle?.getAttribute('aria-expanded') === 'true' && !navPanel?.classList.contains('hidden');

    heroToggle?.click();
    await new Promise((resolve) => setTimeout(resolve, 150));
    const navClosedAfterHero = navToggle?.getAttribute('aria-expanded') === 'false' && navPanel?.classList.contains('hidden');
    const heroOpenAfterHero = heroToggle?.getAttribute('aria-expanded') === 'true' && !heroPanel?.classList.contains('hidden');

    navToggle?.click();
    await new Promise((resolve) => setTimeout(resolve, 150));
    const heroClosedAfterNav = heroToggle?.getAttribute('aria-expanded') === 'false' && heroPanel?.classList.contains('hidden');
    const navOpenAfterNav = navToggle?.getAttribute('aria-expanded') === 'true' && !navPanel?.classList.contains('hidden');

    return { path: ${JSON.stringify(path)}, navInitiallyOpen, navClosedAfterHero, heroOpenAfterHero, heroClosedAfterNav, navOpenAfterNav };
  })()`);
  result.screenshot = await capture(`donate-sibling-close-${locale}`);
  if (!result.navInitiallyOpen || !result.navClosedAfterHero || !result.heroOpenAfterHero || !result.heroClosedAfterNav || !result.navOpenAfterNav) {
    throw new Error(`Donate sibling close behavior failed for ${path}: ${JSON.stringify(result)}`);
  }
  return result;
}

async function submitVolunteer(path, locale, mode) {
  await navigate(path, mode === 'mobile' ? 390 : 1365, mode === 'mobile' ? 900 : 1100);
  const screenshot = await capture(`volunteer-${locale}-${mode}`);
  let bottomScreenshot = '';
  if (mode === 'mobile') {
    await evaluate(`document.querySelector('[data-volunteer-form] button[type="submit"]')?.scrollIntoView({ block: 'center' })`);
    await sleep(250);
    bottomScreenshot = await capture(`volunteer-${locale}-${mode}-bottom`);
    await evaluate(`window.scrollTo(0, 0)`);
    await sleep(150);
  }
  const result = await evaluate(`(async () => {
    for (let i = 0; i < 80; i += 1) {
      if (document.querySelector('[data-volunteer-form]')) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    const form = document.querySelector('[data-volunteer-form]');
    if (!form) return { ok: false, reason: 'missing volunteer form' };

    window.__capaVolunteerRequests = [];
    const originalFetch = window.fetch.bind(window);
    window.fetch = (input, init = {}) => {
      const requestUrl = typeof input === 'string' ? input : input?.url || '';
      if (String(requestUrl).includes('/forms/submit')) {
        let payload = {};
        try { payload = JSON.parse(init?.body || '{}'); } catch {}
        window.__capaVolunteerRequests.push(payload);
        return Promise.resolve(new Response(JSON.stringify({ ok: true, emailSent: true, submissionId: 'browser-volunteer-qa' }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        }));
      }
      return originalFetch(input, init);
    };

    form.dataset.skipMailLaunch = 'true';
    form.querySelector('[name="volunteer_name"]').value = ${JSON.stringify(locale === 'pt' ? 'Voluntário QA' : 'QA Volunteer')};
    form.querySelector('[name="volunteer_email"]').value = 'qa-volunteer@example.com';
    form.querySelector('[name="volunteer_phone"]').value = '';
    form.querySelector('[name="volunteer_time"]').value = '09/07/2026 14:30';
    const boxes = [...form.querySelectorAll('[name="volunteer_work"]')];
    boxes[0].checked = true;
    boxes[1].checked = true;
    form.querySelector('[name="volunteer_message"]').value = 'Browser volunteer smoke';
    form.requestSubmit();
    for (let i = 0; i < 40; i += 1) {
      if (document.querySelector('[data-volunteer-success]') || document.querySelector('[data-volunteer-mailto-note]')) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const payload = window.__capaVolunteerRequests[0] || null;
    const successVisible = Boolean(document.querySelector('[data-volunteer-success]'));
    const noteVisible = Boolean(document.querySelector('[data-volunteer-mailto-note]'));
    const phone = form.querySelector('[name="volunteer_phone"]');
    const time = form.querySelector('[name="volunteer_time"]');
    const languageLinks = [...document.querySelectorAll('[data-playful-language-link]')].map((link) => ({ locale: link.getAttribute('data-locale'), href: link.getAttribute('href') }));
    return {
      ok: true,
      title: document.title,
      htmlLang: document.documentElement.lang,
      successVisible,
      noteVisible,
      payload,
      checkboxCount: boxes.length,
      phoneRequired: phone?.hasAttribute('required') || false,
      timeType: time?.getAttribute('type') || '',
      timePlaceholder: time?.getAttribute('placeholder') || '',
      languageLinks,
      overflow: document.documentElement.scrollWidth > window.innerWidth + 2,
      screenshot: ${JSON.stringify(screenshot)},
      bottomScreenshot: ${JSON.stringify(bottomScreenshot)},
    };
  })()`);
  if (!result.ok) throw new Error(`Volunteer form check failed for ${path}: ${result.reason}`);
  if (!result.successVisible) throw new Error(`Volunteer success state missing for ${path}: ${JSON.stringify(result)}`);
  if (result.noteVisible) throw new Error(`Volunteer fallback note appeared on mocked success for ${path}: ${JSON.stringify(result)}`);
  if (!result.payload || result.payload.kind !== 'volunteer' || result.payload.source !== 'volunteer-form') throw new Error(`Volunteer payload missing for ${path}: ${JSON.stringify(result)}`);
  if (!Array.isArray(result.payload.workTypes) || result.payload.workTypes.length !== 2) throw new Error(`Volunteer workTypes missing for ${path}: ${JSON.stringify(result)}`);
  if (result.payload.phone !== '') throw new Error(`Volunteer phone should be optional/empty for ${path}: ${JSON.stringify(result)}`);
  if (result.phoneRequired) throw new Error(`Volunteer phone field is required for ${path}: ${JSON.stringify(result)}`);
  if (result.timeType !== 'text') throw new Error(`Volunteer time input should be text for ${path}: ${JSON.stringify(result)}`);
  if (!result.timePlaceholder.startsWith('dd/mm/')) throw new Error(`Volunteer time placeholder is not European day/month/year for ${path}: ${JSON.stringify(result)}`);
  if (result.overflow) throw new Error(`Volunteer page overflows horizontally for ${path}: ${JSON.stringify(result)}`);
  return result;
}

async function checkFallback(path) {
  await navigate(path, 1280, 900);
  const result = await evaluate(`(async () => {
    for (let i = 0; i < 80; i += 1) {
      if (document.querySelector('[data-volunteer-form]')) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    const form = document.querySelector('[data-volunteer-form]');
    if (!form) return { ok: false, reason: 'missing volunteer form' };
    form.dataset.skipBackend = 'true';
    form.dataset.skipMailLaunch = 'true';
    form.querySelector('[name="volunteer_name"]').value = 'Fallback QA';
    form.querySelector('[name="volunteer_email"]').value = 'fallback@example.com';
    form.querySelector('[name="volunteer_time"]').value = '10/07/2026 09:00';
    form.querySelector('[name="volunteer_work"]').checked = true;
    form.requestSubmit();
    for (let i = 0; i < 40; i += 1) {
      if (document.querySelector('[data-volunteer-mailto-note]')) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    const mailto = document.querySelector('[data-volunteer-mailto]')?.getAttribute('href') || '';
    return {
      ok: true,
      noteVisible: Boolean(document.querySelector('[data-volunteer-mailto-note]')),
      mailto,
    };
  })()`);
  if (!result.ok || !result.noteVisible || !result.mailto.startsWith('mailto:capa.geralpvl@gmail.com')) {
    throw new Error(`Volunteer fallback failed for ${path}: ${JSON.stringify(result)}`);
  }
  return result;
}

async function checkSupplyDonationSection(path, expectedHref, label) {
  await navigate(path, 1280, 900);
  await evaluate(`document.querySelector('[data-supply-donation-link]')?.scrollIntoView({ block: 'center' })`);
  await sleep(900);
  const result = await evaluate(`(() => {
    const link = document.querySelector('[data-supply-donation-link]');
    const section = link?.closest('section');
    return {
      ok: Boolean(link && section),
      path: ${JSON.stringify(path)},
      expectedHref: ${JSON.stringify(expectedHref)},
      href: link?.getAttribute('href') || '',
      text: link?.textContent?.trim().replace(/\\s+/g, ' ') || '',
      label: ${JSON.stringify(label)},
      emailVisibleInSection: Boolean(section?.textContent?.includes('capa.geralpvl@gmail.com')),
      overflow: document.documentElement.scrollWidth > window.innerWidth + 2,
      clip: link ? {
        x: 0,
        y: Math.max(0, link.getBoundingClientRect().top + window.scrollY - 350),
        width: Math.min(window.innerWidth, document.documentElement.scrollWidth),
        height: Math.min(700, document.documentElement.scrollHeight - Math.max(0, link.getBoundingClientRect().top + window.scrollY - 350)),
        scale: 1,
      } : null,
    };
  })()`);
  result.screenshot = result.clip ? await captureClip(`supply-section-${label}`, result.clip) : await capture(`supply-section-${label}`);
  if (!result.ok || result.href !== expectedHref || result.emailVisibleInSection || result.overflow) {
    throw new Error(`Supply donation section failed for ${path}: ${JSON.stringify(result)}`);
  }
  return result;
}

async function submitSupplyDonation(path, locale, mode) {
  await navigate(path, mode === 'mobile' ? 390 : 1365, mode === 'mobile' ? 900 : 1100);
  const screenshot = await capture(`supply-donation-${locale}-${mode}`);
  let bottomScreenshot = '';
  if (mode === 'mobile') {
    await evaluate(`document.querySelector('[data-supply-donation-form] button[type="submit"]')?.scrollIntoView({ block: 'center' })`);
    await sleep(250);
    bottomScreenshot = await capture(`supply-donation-${locale}-${mode}-bottom`);
    await evaluate(`window.scrollTo(0, 0)`);
    await sleep(150);
  }
  const result = await evaluate(`(async () => {
    for (let i = 0; i < 80; i += 1) {
      if (document.querySelector('[data-supply-donation-form]')) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    const form = document.querySelector('[data-supply-donation-form]');
    if (!form) return { ok: false, reason: 'missing supply donation form' };

    window.__capaSupplyDonationRequests = [];
    const originalFetch = window.fetch.bind(window);
    window.fetch = (input, init = {}) => {
      const requestUrl = typeof input === 'string' ? input : input?.url || '';
      if (String(requestUrl).includes('/forms/submit')) {
        let payload = {};
        try { payload = JSON.parse(init?.body || '{}'); } catch {}
        window.__capaSupplyDonationRequests.push(payload);
        return Promise.resolve(new Response(JSON.stringify({ ok: true, emailSent: true, submissionId: 'browser-supply-qa' }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        }));
      }
      return originalFetch(input, init);
    };

    form.dataset.skipMailLaunch = 'true';
    form.querySelector('[name="supply_name"]').value = ${JSON.stringify(locale === 'pt' ? 'Doador QA' : 'QA Donor')};
    form.querySelector('[name="supply_email"]').value = 'qa-donor@example.com';
    form.querySelector('[name="supply_phone"]').value = '';
    form.querySelector('[name="supply_time"]').value = '11/07/2026 15:00';
    const boxes = [...form.querySelectorAll('[name="supply_type"]')];
    boxes[0].checked = true;
    boxes[1].checked = true;
    form.querySelector('[name="supply_message"]').value = 'Browser supply donation smoke';
    form.requestSubmit();
    for (let i = 0; i < 40; i += 1) {
      if (document.querySelector('[data-supply-success]') || document.querySelector('[data-supply-mailto-note]')) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const payload = window.__capaSupplyDonationRequests[0] || null;
    const successVisible = Boolean(document.querySelector('[data-supply-success]'));
    const noteVisible = Boolean(document.querySelector('[data-supply-mailto-note]'));
    const phone = form.querySelector('[name="supply_phone"]');
    const time = form.querySelector('[name="supply_time"]');
    const languageLinks = [...document.querySelectorAll('[data-playful-language-link]')].map((link) => ({ locale: link.getAttribute('data-locale'), href: link.getAttribute('href') }));
    return {
      ok: true,
      title: document.title,
      htmlLang: document.documentElement.lang,
      successVisible,
      noteVisible,
      payload,
      checkboxCount: boxes.length,
      phoneRequired: phone?.hasAttribute('required') || false,
      timeType: time?.getAttribute('type') || '',
      timePlaceholder: time?.getAttribute('placeholder') || '',
      languageLinks,
      overflow: document.documentElement.scrollWidth > window.innerWidth + 2,
      screenshot: ${JSON.stringify(screenshot)},
      bottomScreenshot: ${JSON.stringify(bottomScreenshot)},
    };
  })()`);
  if (!result.ok) throw new Error(`Supply donation form check failed for ${path}: ${result.reason}`);
  if (!result.successVisible) throw new Error(`Supply donation success state missing for ${path}: ${JSON.stringify(result)}`);
  if (result.noteVisible) throw new Error(`Supply donation fallback note appeared on mocked success for ${path}: ${JSON.stringify(result)}`);
  if (!result.payload || result.payload.kind !== 'supply_donation' || result.payload.source !== 'supply-donation-form') throw new Error(`Supply donation payload missing for ${path}: ${JSON.stringify(result)}`);
  if (!Array.isArray(result.payload.supplyTypes) || result.payload.supplyTypes.length !== 2) throw new Error(`Supply donation supplyTypes missing for ${path}: ${JSON.stringify(result)}`);
  if (result.payload.phone !== '') throw new Error(`Supply donation phone should be optional/empty for ${path}: ${JSON.stringify(result)}`);
  if (result.phoneRequired) throw new Error(`Supply donation phone field is required for ${path}: ${JSON.stringify(result)}`);
  if (result.timeType !== 'text') throw new Error(`Supply donation time input should be text for ${path}: ${JSON.stringify(result)}`);
  if (!result.timePlaceholder.startsWith('dd/mm/')) throw new Error(`Supply donation time placeholder is not European day/month/year for ${path}: ${JSON.stringify(result)}`);
  if (locale === 'en' && !result.languageLinks.some((link) => link.locale === 'pt' && link.href.includes('/ajudar/formulario-donativos-em-especie'))) {
    throw new Error(`Supply donation English page language link should point to PT supply form for ${path}: ${JSON.stringify(result)}`);
  }
  if (locale === 'pt' && !result.languageLinks.some((link) => link.locale === 'en' && link.href.includes('/en/help/supply-donation-form'))) {
    throw new Error(`Supply donation Portuguese page language link should point to EN supply form for ${path}: ${JSON.stringify(result)}`);
  }
  if (result.overflow) throw new Error(`Supply donation page overflows horizontally for ${path}: ${JSON.stringify(result)}`);
  return result;
}

async function checkSupplyFallback(path) {
  await navigate(path, 1280, 900);
  const result = await evaluate(`(async () => {
    for (let i = 0; i < 80; i += 1) {
      if (document.querySelector('[data-supply-donation-form]')) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    const form = document.querySelector('[data-supply-donation-form]');
    if (!form) return { ok: false, reason: 'missing supply donation form' };
    form.dataset.skipBackend = 'true';
    form.dataset.skipMailLaunch = 'true';
    form.querySelector('[name="supply_name"]').value = 'Fallback QA';
    form.querySelector('[name="supply_email"]').value = 'fallback@example.com';
    form.querySelector('[name="supply_time"]').value = '12/07/2026 09:00';
    form.querySelector('[name="supply_type"]').checked = true;
    form.requestSubmit();
    for (let i = 0; i < 40; i += 1) {
      if (document.querySelector('[data-supply-mailto-note]')) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    const mailto = document.querySelector('[data-supply-mailto]')?.getAttribute('href') || '';
    return {
      ok: true,
      noteVisible: Boolean(document.querySelector('[data-supply-mailto-note]')),
      mailto,
    };
  })()`);
  if (!result.ok || !result.noteVisible || !result.mailto.startsWith('mailto:capa.geralpvl@gmail.com')) {
    throw new Error(`Supply donation fallback failed for ${path}: ${JSON.stringify(result)}`);
  }
  return result;
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

  await getJsonVersion();
  const targetsRes = await fetch(`http://127.0.0.1:${port}/json/list`);
  const targets = await targetsRes.json();
  const pageTarget = targets.find((target) => target.type === 'page' && target.webSocketDebuggerUrl);
  if (!pageTarget) throw new Error('No page CDP target');

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

  const helpEn = await checkHelpLink('/en/help/', '/en/help/volunteer-form', 'English help volunteer CTA');
  const helpPt = await checkHelpLink('/ajudar/', '/ajudar/formulario-voluntariado', 'Portuguese help volunteer CTA');
  if (!helpEn.ok || helpEn.overflow) throw new Error(`English help link failed: ${JSON.stringify(helpEn)}`);
  if (!helpPt.ok || helpPt.overflow) throw new Error(`Portuguese help link failed: ${JSON.stringify(helpPt)}`);

  const supplySectionEn = await checkSupplyDonationSection('/en/help/', '/en/help/supply-donation-form', 'en');
  const supplySectionPt = await checkSupplyDonationSection('/ajudar/', '/ajudar/formulario-donativos-em-especie', 'pt');

  const heroPt = await checkHeroActions('/ajudar/', '/ajudar/formulario-voluntariado', 'hero-pt-donate', 'Doar', 'pt');
  const heroEn = await checkHeroActions('/en/help/', '/en/help/volunteer-form', 'hero-en-donate', 'Donate', 'en');
  const heroPtMobile = await checkHeroActions('/ajudar/', '/ajudar/formulario-voluntariado', 'hero-pt-donate', 'Doar', 'pt', 'mobile');
  const heroEnMobile = await checkHeroActions('/en/help/', '/en/help/volunteer-form', 'hero-en-donate', 'Donate', 'en', 'mobile');
  const siblingPt = await checkDonateSiblingClose('/ajudar/', 'site-pt-desktop', 'hero-pt-donate', 'pt');
  const siblingEn = await checkDonateSiblingClose('/en/help/', 'site-en-desktop', 'hero-en-donate', 'en');

  const formEnDesktop = await submitVolunteer('/en/help/volunteer-form/', 'en', 'desktop');
  const formPtDesktop = await submitVolunteer('/ajudar/formulario-voluntariado/', 'pt', 'desktop');
  const formEnMobile = await submitVolunteer('/en/help/volunteer-form/', 'en', 'mobile');
  const fallback = await checkFallback('/en/help/volunteer-form/');
  const supplyEnDesktop = await submitSupplyDonation('/en/help/supply-donation-form/', 'en', 'desktop');
  const supplyPtDesktop = await submitSupplyDonation('/ajudar/formulario-donativos-em-especie/', 'pt', 'desktop');
  const supplyEnMobile = await submitSupplyDonation('/en/help/supply-donation-form/', 'en', 'mobile');
  const supplyFallback = await checkSupplyFallback('/en/help/supply-donation-form/');

  console.log(JSON.stringify({ ok: true, baseUrl, helpEn, helpPt, supplySectionEn, supplySectionPt, heroPt, heroEn, heroPtMobile, heroEnMobile, siblingPt, siblingEn, formEnDesktop, formPtDesktop, formEnMobile, fallback, supplyEnDesktop, supplyPtDesktop, supplyEnMobile, supplyFallback }, null, 2));
} finally {
  for (const { reject, method } of pending.values()) {
    reject(new Error(`${method}: browser verifier shutting down`));
  }
  pending.clear();
  try { ws?.close(); } catch {}
  await stopBrowser();
  rmSync(profileDir, { recursive: true, force: true });
}
