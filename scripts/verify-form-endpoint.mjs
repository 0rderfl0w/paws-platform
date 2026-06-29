#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '..');
const envPath = process.env.CAPA_API_ENV_FILE || '/etc/capapvl-api.env';
const existingBaseUrl = process.env.FORM_API_BASE_URL?.replace(/\/$/, '');
const allowedOrigin = process.env.FORM_TEST_ORIGIN || 'http://127.0.0.1:4321';

function parseEnvFile(path) {
  try {
    return Object.fromEntries(
      readFileSync(path, 'utf8')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#') && line.includes('='))
        .map((line) => {
          const index = line.indexOf('=');
          return [line.slice(0, index), line.slice(index + 1)];
        }),
    );
  } catch {
    return {};
  }
}

async function getPort() {
  return await new Promise((resolvePort, reject) => {
    const server = createServer();
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => resolvePort(address.port));
    });
    server.on('error', reject);
  });
}

async function waitForHealth(baseUrl) {
  for (let i = 0; i < 80; i += 1) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolveWait) => setTimeout(resolveWait, 125));
  }
  throw new Error(`API did not become healthy: ${baseUrl}`);
}

async function post(baseUrl, payload, origin = allowedOrigin) {
  const response = await fetch(`${baseUrl}/forms/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
    },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({}));
  return { status: response.status, headers: Object.fromEntries(response.headers.entries()), body };
}

let serverProcess = null;
let baseUrl = existingBaseUrl;

try {
  if (!baseUrl) {
    const port = await getPort();
    const env = {
      ...process.env,
      ...parseEnvFile(envPath),
      PORT: String(port),
      CAPA_FORM_EMAIL_DRY_RUN: 'true',
    };
    serverProcess = spawn('bun', ['run', 'server/capa-api.ts'], {
      cwd: repoRoot,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stderr = '';
    serverProcess.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    serverProcess.once('exit', (code) => {
      if (code !== null && code !== 0 && !process.exitCode) {
        process.stderr.write(stderr);
      }
    });
    baseUrl = `http://127.0.0.1:${port}`;
  }

  await waitForHealth(baseUrl);

  const valid = await post(baseUrl, {
    kind: 'visit',
    locale: 'en',
    source: 'verify-form-endpoint',
    pageUrl: 'https://capapvl.org/en/dog/?id=qa',
    contextLabel: 'Dog',
    contextValue: 'Athos',
    name: 'QA Visitor',
    email: 'qa-visitor@example.com',
    phone: '+351 930 000 000',
    preferredTime: '2026-07-08T10:30',
    message: 'Form endpoint verifier',
  });
  if (valid.status !== 201 || !valid.body.ok || !valid.body.emailSent) {
    throw new Error(`Expected valid dry-run submission to return 201/emailSent: ${JSON.stringify(valid)}`);
  }
  if (valid.headers['access-control-allow-origin'] !== allowedOrigin) {
    throw new Error(`Expected CORS origin ${allowedOrigin}, got ${valid.headers['access-control-allow-origin']}`);
  }

  const unknown = await post(baseUrl, { kind: 'unknown' });
  if (unknown.status !== 400 || !String(unknown.body.error || '').includes('Invalid form type')) {
    throw new Error(`Expected unknown kind rejection: ${JSON.stringify(unknown)}`);
  }

  const missing = await post(baseUrl, { kind: 'visit', name: 'No Email' });
  if (missing.status !== 400 || !String(missing.body.error || '').includes('Valid email')) {
    throw new Error(`Expected missing email rejection: ${JSON.stringify(missing)}`);
  }

  const honeypot = await post(baseUrl, { kind: 'visit', website: 'https://spam.invalid' });
  if (honeypot.status !== 200 || !honeypot.body.ignored) {
    throw new Error(`Expected honeypot to be ignored: ${JSON.stringify(honeypot)}`);
  }

  const mbway = await post(baseUrl, {
    kind: 'mbway',
    locale: 'pt',
    source: 'verify-form-endpoint',
    pageUrl: 'https://capapvl.org/',
    phone: '+351 919 000 000',
    message: 'MB Way verifier',
  });
  if (mbway.status !== 201 || !mbway.body.ok || !mbway.body.emailSent) {
    throw new Error(`Expected MB Way dry-run submission to return 201/emailSent: ${JSON.stringify(mbway)}`);
  }

  const volunteer = await post(baseUrl, {
    kind: 'volunteer',
    locale: 'en',
    source: 'volunteer-form',
    pageUrl: 'https://capapvl.org/en/help/volunteer-form',
    contextLabel: 'Volunteer form',
    contextValue: 'CAPA volunteer scheduling',
    name: 'QA Volunteer',
    email: 'qa-volunteer@example.com',
    phone: '',
    preferredTime: '09/07/2026 14:30',
    workTypes: ['Dog walking', 'Shelter volunteering'],
    message: 'Volunteer verifier',
  });
  if (volunteer.status !== 201 || !volunteer.body.ok || !volunteer.body.emailSent) {
    throw new Error(`Expected volunteer dry-run submission to return 201/emailSent: ${JSON.stringify(volunteer)}`);
  }

  const volunteerMissingWork = await post(baseUrl, {
    kind: 'volunteer',
    locale: 'en',
    source: 'verify-form-endpoint',
    pageUrl: 'https://capapvl.org/en/help/volunteer-form',
    name: 'QA Volunteer',
    email: 'qa-volunteer@example.com',
    preferredTime: '09/07/2026 14:30',
  });
  if (volunteerMissingWork.status !== 400 || !String(volunteerMissingWork.body.error || '').includes('At least one volunteer work type')) {
    throw new Error(`Expected volunteer missing work type rejection: ${JSON.stringify(volunteerMissingWork)}`);
  }

  console.log(JSON.stringify({ ok: true, baseUrl, valid: valid.body, mbway: mbway.body, volunteer: volunteer.body, unknown: unknown.status, missing: missing.status, honeypot: honeypot.body }, null, 2));
} finally {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
    if (serverProcess.exitCode === null) serverProcess.kill('SIGKILL');
  }
}
