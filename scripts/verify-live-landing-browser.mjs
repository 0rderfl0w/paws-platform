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

const paypalDonateUrl = 'https://www.paypal.com/donate/?cmd=_s-xclick&hosted_button_id=W6QJXB42XRY4G&source=urlw&ssrt=1782128512360';
const expected = locale === 'en'
  ? { title: 'CAPA Póvoa de Lanhoso — Adopt a Dog', dogHrefPrefix: '/en/dog?id=', adoptHref: '/en/adopt', adoptText: 'Adoption', helpHref: '/en/help', helpText: 'Learn how to help', filter: 'Medium', donateInstance: 'landing-en-desktop', donateCardInstance: 'home-en-donate-card', bankHref: '/en/help#financial-support' }
  : { title: 'CAPA Póvoa de Lanhoso — Adota um Cão', dogHrefPrefix: '/cao?id=', adoptHref: '/adocao', adoptText: 'Adoção', helpHref: '/ajudar', helpText: 'Saiba como ajudar', filter: 'Médios', donateInstance: 'landing-pt-desktop', donateCardInstance: 'home-pt-donate-card', bankHref: '/ajudar#apoio-financeiro' };

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
      sponsorModal: {
        openButtonCount: document.querySelectorAll('[data-sponsor-modal-open]').length,
        dialogPresent: Boolean(document.querySelector('[data-sponsor-modal]')),
        formPresent: Boolean(document.querySelector('[data-sponsor-form]')),
        requiredFieldsPresent: ['sponsor_name', 'sponsor_email', 'sponsor_business', 'sponsor_amount', 'sponsor_method']
          .every((name) => Boolean(document.querySelector('[name="' + name + '"]'))),
        phoneOptional: Boolean(document.querySelector('[name="sponsor_phone"]')) && !document.querySelector('[name="sponsor_phone"]')?.hasAttribute('required'),
      },
      donateMenu: {
        toggleCount: document.querySelectorAll('[data-donate-toggle]').length,
        panelCount: document.querySelectorAll('[data-donate-panel]').length,
        paypalHrefs: [...document.querySelectorAll('[data-donate-paypal]')].map((link) => link.getAttribute('href')),
        paypalTargets: [...document.querySelectorAll('[data-donate-paypal]')].map((link) => ({ target: link.getAttribute('target'), rel: link.getAttribute('rel') })),
        bankHrefs: [...document.querySelectorAll('[data-donate-bank]')].map((link) => link.getAttribute('href')),
        mbwayModalCount: document.querySelectorAll('[data-mbway-modal]').length,
        mbwayPhoneRequired: Boolean(document.querySelector('[name="mbway_phone"]')) && document.querySelector('[name="mbway_phone"]')?.hasAttribute('required'),
      },
      adoptHrefs: [...document.querySelectorAll('nav a')]
        .filter((link) => link.textContent.trim() === ${JSON.stringify(expected.adoptText)})
        .map((link) => link.getAttribute('href')),
      helpHrefs: [...document.querySelectorAll('a')]
        .filter((link) => link.textContent.includes(${JSON.stringify(locale === 'en' ? 'Help' : 'Ajudar')}))
        .map((link) => link.getAttribute('href')),
      hasNoindex: Boolean(document.querySelector('meta[name="robots"][content*="noindex"]')),
      overflow: document.documentElement.scrollWidth > window.innerWidth + 2,
    };
  })()`);

  if (initial.title !== expected.title) throw new Error(`Unexpected title: ${initial.title}`);
  if (!initial.hasPlayfulRoot) throw new Error('Missing Playful root marker');
  if (initial.cardCount !== 6) throw new Error(`Expected 6 featured dog cards, got ${initial.cardCount}`);
  if (!initial.firstHref.startsWith(expected.dogHrefPrefix)) throw new Error(`Unexpected first dog href: ${initial.firstHref}`);
  if (!initial.hasHelpText) throw new Error(`Missing help CTA text: ${expected.helpText}`);
  if (initial.sponsorModal.openButtonCount !== 1) throw new Error(`Expected one sponsor modal opener, got ${initial.sponsorModal.openButtonCount}`);
  if (!initial.sponsorModal.dialogPresent) throw new Error('Missing sponsor modal dialog');
  if (!initial.sponsorModal.formPresent) throw new Error('Missing sponsor modal form');
  if (!initial.sponsorModal.requiredFieldsPresent) throw new Error('Missing required sponsor modal fields');
  if (!initial.sponsorModal.phoneOptional) throw new Error('Sponsor phone field is missing or required');
  if (initial.donateMenu.toggleCount !== 3) throw new Error(`Expected desktop, mobile, and #4-card donate toggles, got ${initial.donateMenu.toggleCount}`);
  if (initial.donateMenu.panelCount !== 3) throw new Error(`Expected desktop, mobile, and #4-card donate panels, got ${initial.donateMenu.panelCount}`);
  if (!initial.donateMenu.paypalHrefs.includes(paypalDonateUrl)) throw new Error(`Missing PayPal donation href: ${initial.donateMenu.paypalHrefs.join(', ')}`);
  if (!initial.donateMenu.paypalTargets.every((entry) => entry.target === '_blank' && (entry.rel || '').includes('noopener') && (entry.rel || '').includes('noreferrer'))) {
    throw new Error(`PayPal donation links do not all open safely in a new tab: ${JSON.stringify(initial.donateMenu.paypalTargets)}`);
  }
  if (!initial.donateMenu.bankHrefs.includes(expected.bankHref)) throw new Error(`Missing bank transfer href ${expected.bankHref}: ${initial.donateMenu.bankHrefs.join(', ')}`);
  if (initial.donateMenu.mbwayModalCount !== 3) throw new Error(`Expected desktop, mobile, and #4-card MB Way modals, got ${initial.donateMenu.mbwayModalCount}`);
  if (!initial.donateMenu.mbwayPhoneRequired) throw new Error('MB Way phone field is missing or not required');
  if (!initial.adoptHrefs.includes(expected.adoptHref)) {
    throw new Error(`Missing adoption nav href ${expected.adoptHref}; got ${initial.adoptHrefs.join(', ')}`);
  }
  if (!initial.helpHrefs.includes(expected.helpHref)) {
    throw new Error(`Missing help route href ${expected.helpHref}; got ${initial.helpHrefs.join(', ')}`);
  }
  if (initial.helpHrefs.includes('#ajudar')) throw new Error('Home Help links still point to #ajudar');
  if (initial.hasNoindex) throw new Error('Live landing page has noindex');
  if (initial.overflow) throw new Error('Initial page has horizontal overflow');

  const sponsorResult = await evaluate(`(async () => {
    const openButton = document.querySelector('[data-sponsor-modal-open]');
    const dialog = document.querySelector('[data-sponsor-modal]');
    const form = document.querySelector('[data-sponsor-form]');
    if (!openButton || !dialog || !form) return { ok: false, reason: 'missing controls' };
    openButton.click();
    await new Promise((resolve) => setTimeout(resolve, 200));
    const opened = dialog.open || dialog.hasAttribute('open');
    form.dataset.skipMailLaunch = 'true';
    form.querySelector('[name="sponsor_name"]').value = 'QA Sponsor';
    form.querySelector('[name="sponsor_email"]').value = 'qa-sponsor@example.com';
    form.querySelector('[name="sponsor_phone"]').value = '+351 912 345 678';
    form.querySelector('[name="sponsor_business"][value="yes"]').checked = true;
    form.querySelector('[name="sponsor_amount"]').value = '25';
    form.querySelector('[name="sponsor_method"]').value = form.querySelector('[name="sponsor_method"] option:nth-child(2)').value;
    form.querySelector('[name="sponsor_message"]').value = 'Browser smoke test sponsorship note';
    form.requestSubmit();
    await new Promise((resolve) => setTimeout(resolve, 200));
    const mailto = document.querySelector('[data-sponsor-mailto]')?.getAttribute('href') || '';
    const noteVisible = !document.querySelector('[data-sponsor-mailto-note]')?.classList.contains('hidden');
    dialog.close?.();
    return { ok: true, opened, mailto, noteVisible };
  })()`);

  if (!sponsorResult.ok) throw new Error(`Sponsor modal failed: ${sponsorResult.reason}`);
  if (!sponsorResult.opened) throw new Error('Sponsor modal did not open');
  if (!sponsorResult.noteVisible) throw new Error('Sponsor fallback mailto note did not appear');
  if (!sponsorResult.mailto.startsWith('mailto:capa.geralpvl@gmail.com')) throw new Error(`Unexpected sponsor mailto target: ${sponsorResult.mailto}`);
  const decodedSponsorMailto = decodeURIComponent(sponsorResult.mailto);
  for (const needle of ['QA Sponsor', 'qa-sponsor@example.com', '+351 912 345 678', '€25', 'Browser smoke test sponsorship note']) {
    if (!decodedSponsorMailto.includes(needle)) throw new Error(`Sponsor mailto missing ${needle}: ${decodedSponsorMailto}`);
  }

  const donateResult = await evaluate(`(async () => {
    const root = document.querySelector('[data-donate-menu=${JSON.stringify(expected.donateInstance).slice(1, -1)}]');
    const toggle = root?.querySelector('[data-donate-toggle]');
    const panel = root?.querySelector('[data-donate-panel]');
    if (!root || !toggle || !panel) return { ok: false, reason: 'missing donate menu controls' };
    toggle.click();
    await new Promise((resolve) => setTimeout(resolve, 200));
    const panelOpen = !panel.classList.contains('hidden') && toggle.getAttribute('aria-expanded') === 'true';
    const paypal = root.querySelector('[data-donate-paypal]');
    const bank = root.querySelector('[data-donate-bank]');
    const mbway = root.querySelector('[data-mbway-open]');
    if (!paypal || !bank || !mbway) return { ok: false, reason: 'missing donate menu items' };
    mbway.click();
    await new Promise((resolve) => setTimeout(resolve, 200));
    const dialog = document.querySelector('[data-mbway-modal=${JSON.stringify(expected.donateInstance).slice(1, -1)}]');
    const form = document.querySelector('[data-mbway-form=${JSON.stringify(expected.donateInstance).slice(1, -1)}]');
    if (!dialog || !form) return { ok: false, reason: 'missing MB Way dialog/form' };
    const dialogOpen = dialog.open || dialog.hasAttribute('open');
    form.dataset.skipMailLaunch = 'true';
    form.querySelector('[name="mbway_phone"]').value = '+351 919 000 000';
    form.requestSubmit();
    await new Promise((resolve) => setTimeout(resolve, 200));
    const mailto = document.querySelector('[data-mbway-mailto=${JSON.stringify(expected.donateInstance).slice(1, -1)}]')?.getAttribute('href') || '';
    const noteVisible = !document.querySelector('[data-mbway-mailto-note=${JSON.stringify(expected.donateInstance).slice(1, -1)}]')?.classList.contains('hidden');
    dialog.close?.();
    return {
      ok: true,
      panelOpen,
      paypalHref: paypal.getAttribute('href'),
      paypalTarget: paypal.getAttribute('target'),
      paypalRel: paypal.getAttribute('rel'),
      bankHref: bank.getAttribute('href'),
      dialogOpen,
      mailto,
      noteVisible,
    };
  })()`);

  if (!donateResult.ok) throw new Error(`Donate menu failed: ${donateResult.reason}`);
  if (!donateResult.panelOpen) throw new Error('Donate dropdown did not open');
  if (donateResult.paypalHref !== paypalDonateUrl) throw new Error(`Unexpected PayPal href: ${donateResult.paypalHref}`);
  if (donateResult.paypalTarget !== '_blank' || !(donateResult.paypalRel || '').includes('noopener') || !(donateResult.paypalRel || '').includes('noreferrer')) {
    throw new Error(`PayPal link does not open safely in a new tab: ${JSON.stringify(donateResult)}`);
  }
  if (donateResult.bankHref !== expected.bankHref) throw new Error(`Unexpected bank transfer href: ${donateResult.bankHref}`);
  if (!donateResult.dialogOpen) throw new Error('MB Way dialog did not open');
  if (!donateResult.noteVisible) throw new Error('MB Way fallback mailto note did not appear');
  if (!donateResult.mailto.startsWith('mailto:capa.geralpvl@gmail.com')) throw new Error(`Unexpected MB Way mailto target: ${donateResult.mailto}`);
  const decodedMbwayMailto = decodeURIComponent(donateResult.mailto);
  if (!decodedMbwayMailto.includes('+351 919 000 000')) throw new Error(`MB Way mailto missing phone: ${decodedMbwayMailto}`);

  const donateCardResult = await evaluate(`(async () => {
    const root = document.querySelector('[data-donate-menu=${JSON.stringify(expected.donateCardInstance).slice(1, -1)}]');
    const toggle = root?.querySelector('[data-donate-toggle]');
    const panel = root?.querySelector('[data-donate-panel]');
    if (!root || !toggle || !panel) return { ok: false, reason: 'missing #4 donate card controls' };
    root.scrollIntoView({ block: 'center' });
    await new Promise((resolve) => setTimeout(resolve, 200));
    toggle.click();
    await new Promise((resolve) => setTimeout(resolve, 200));
    const panelOpen = !panel.classList.contains('hidden') && toggle.getAttribute('aria-expanded') === 'true';
    const paypal = root.querySelector('[data-donate-paypal]');
    const bank = root.querySelector('[data-donate-bank]');
    const mbway = root.querySelector('[data-mbway-open]');
    return {
      ok: true,
      panelOpen,
      paypalHref: paypal?.getAttribute('href') || '',
      paypalTarget: paypal?.getAttribute('target') || '',
      paypalRel: paypal?.getAttribute('rel') || '',
      bankHref: bank?.getAttribute('href') || '',
      hasMbway: Boolean(mbway),
      buttonText: toggle.textContent.trim(),
      overflow: document.documentElement.scrollWidth > window.innerWidth + 2,
    };
  })()`);

  if (!donateCardResult.ok) throw new Error(`#4 donate card failed: ${donateCardResult.reason}`);
  if (!donateCardResult.panelOpen) throw new Error('#4 donate card dropdown did not open');
  if (donateCardResult.paypalHref !== paypalDonateUrl) throw new Error(`#4 donate card unexpected PayPal href: ${donateCardResult.paypalHref}`);
  if (donateCardResult.paypalTarget !== '_blank' || !(donateCardResult.paypalRel || '').includes('noopener') || !(donateCardResult.paypalRel || '').includes('noreferrer')) {
    throw new Error(`#4 donate card PayPal link does not open safely: ${JSON.stringify(donateCardResult)}`);
  }
  if (donateCardResult.bankHref !== expected.bankHref) throw new Error(`#4 donate card unexpected bank transfer href: ${donateCardResult.bankHref}`);
  if (!donateCardResult.hasMbway) throw new Error('#4 donate card is missing MB Way option');
  if (!donateCardResult.buttonText.includes(locale === 'en' ? 'Donate' : 'Doar')) throw new Error(`#4 donate card text did not include donate label: ${donateCardResult.buttonText}`);
  if (donateCardResult.overflow) throw new Error('#4 donate card caused horizontal overflow');

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

  const footerIban = await evaluate(`(() => {
    const pill = document.querySelector('[data-footer-iban]');
    const value = document.querySelector('[data-footer-iban-value]');
    const pillRect = pill?.getBoundingClientRect();
    const valueRect = value?.getBoundingClientRect();
    return {
      present: Boolean(pill && value),
      text: value?.textContent?.trim() || '',
      viewportWidth: window.innerWidth,
      pillRect: pillRect ? { x: pillRect.x, y: pillRect.y, w: pillRect.width, h: pillRect.height, right: pillRect.right } : null,
      valueRect: valueRect ? { x: valueRect.x, y: valueRect.y, w: valueRect.width, h: valueRect.height, right: valueRect.right } : null,
      valueScrollWidth: value?.scrollWidth || 0,
      valueClientWidth: value?.clientWidth || 0,
      pillScrollWidth: pill?.scrollWidth || 0,
      pillClientWidth: pill?.clientWidth || 0,
      overflow: document.documentElement.scrollWidth > window.innerWidth + 2,
    };
  })()`);

  if (!footerIban.present) throw new Error('Missing footer IBAN marker');
  if (!footerIban.text.includes('IBAN: PT50 0010 0000 4591 4000 0014 9')) throw new Error(`Footer IBAN text incomplete: ${footerIban.text}`);
  if (footerIban.overflow) throw new Error('Footer IBAN caused page horizontal overflow');
  if (footerIban.pillRect && (footerIban.pillRect.x < -1 || footerIban.pillRect.right > footerIban.viewportWidth + 1)) {
    throw new Error(`Footer IBAN pill extends outside viewport: ${JSON.stringify(footerIban)}`);
  }
  if (footerIban.valueScrollWidth > footerIban.valueClientWidth + 2) {
    throw new Error(`Footer IBAN value is horizontally clipped: ${JSON.stringify(footerIban)}`);
  }

  if (reveal.hidden !== 0) throw new Error(`Reveal left ${reveal.hidden} hidden element(s)`);
  if (reveal.overflow) throw new Error('Page has horizontal overflow after scrolling');

  console.log(JSON.stringify({ ok: true, url, locale, width, port, initial, sponsorResult, donateResult, donateCardResult, mobileMenu, filterResult, reveal, footerIban }, null, 2));
} finally {
  for (const { reject, method } of pending.values()) {
    reject(new Error(`${method}: browser verifier shutting down`));
  }
  pending.clear();
  try { ws?.close(); } catch {}
  await stopBrowser();
  rmSync(profileDir, { recursive: true, force: true });
}
