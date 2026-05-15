import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { mkdir, readdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import pg from 'pg';

const { Pool } = pg;

type DogRow = {
  id: string;
  name: string;
  size: 'small' | 'medium' | 'large';
  sex: 'male' | 'female' | null;
  age: string | null;
  description: string | null;
  photo_url: string | null;
  is_adopted: boolean;
  created_at: string;
  updated_at: string;
};

type DogPayload = {
  name?: string;
  size?: 'small' | 'medium' | 'large';
  sex?: 'male' | 'female' | null | '';
  age?: string;
  description?: string;
  photo_url?: string;
  is_adopted?: boolean;
};

const PORT = Number(process.env.PORT ?? 3314);
const DATABASE_URL = process.env.DATABASE_URL ?? '';
const ADMIN_EMAIL = process.env.CAPA_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD_SHA256 = process.env.CAPA_ADMIN_PASSWORD_SHA256 ?? '';
const SESSION_SECRET = process.env.CAPA_SESSION_SECRET ?? '';
const PUBLIC_API_URL = (process.env.CAPA_PUBLIC_API_URL ?? '').replace(/\/$/, '');
const PROJECT_ROOT = process.env.CAPA_PROJECT_ROOT ?? process.cwd();
const DOG_IMAGES_ROOT = path.join(PROJECT_ROOT, 'public', 'images', 'dogs');
const ALLOWED_ORIGINS = (process.env.CAPA_ALLOWED_ORIGINS ?? 'https://capapvl.pt,https://www.capapvl.pt,http://127.0.0.1:14324,http://127.0.0.1:4321')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

if (!DATABASE_URL) throw new Error('DATABASE_URL is required');
if (!ADMIN_EMAIL || !ADMIN_PASSWORD_SHA256 || !SESSION_SECRET) {
  throw new Error('CAPA admin auth env vars are required');
}

const pool = new Pool({ connectionString: DATABASE_URL, max: 8 });

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function base64Url(input: string | Buffer): string {
  return Buffer.from(input).toString('base64url');
}

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function constantTimeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function signToken(email: string): string {
  const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64Url(JSON.stringify({
    sub: email,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 14,
  }));
  const signature = createHmac('sha256', SESSION_SECRET).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

function verifyToken(token: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [header, payload, signature] = parts;
  const expected = createHmac('sha256', SESSION_SECRET).update(`${header}.${payload}`).digest('base64url');
  if (!constantTimeEqual(signature, expected)) return false;

  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return decoded.sub === ADMIN_EMAIL && Number(decoded.exp) > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

function corsHeaders(origin: string | null): HeadersInit {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0] ?? '*';
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Credentials': 'false',
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Vary': 'Origin',
  };
}

function json(data: unknown, init: ResponseInit = {}, origin: string | null = null): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders(origin),
      ...(init.headers ?? {}),
    },
  });
}

function error(message: string, status = 400, origin: string | null = null): Response {
  return json({ error: message }, { status }, origin);
}

function requireAuth(request: Request, origin: string | null): Response | null {
  const auth = request.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  return token && verifyToken(token) ? null : error('Unauthorized', 401, origin);
}

async function listPhotoFiles(slug: string): Promise<string[]> {
  try {
    const dir = path.join(DOG_IMAGES_ROOT, slug);
    const files = await readdir(dir);
    return files
      .filter((file) => /\.(jpe?g|png|webp)$/i.test(file))
      .filter((file) => file !== 'photo-02.jpg')
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  } catch {
    return [];
  }
}

function photoUrl(slug: string, filename: string): string {
  const pathname = `/images/dogs/${encodeURIComponent(slug)}/${encodeURIComponent(filename)}`;
  return PUBLIC_API_URL ? `${PUBLIC_API_URL}${pathname}` : pathname;
}

async function serializeDog(row: DogRow) {
  const slug = toSlug(row.name);
  const files = await listPhotoFiles(slug);
  const photos = files.map((file) => photoUrl(slug, file));
  return {
    id: row.id,
    name: row.name,
    size: row.size,
    sex: row.sex,
    age: row.age ?? '',
    description: row.description ?? '',
    photo_url: photos[0] ?? row.photo_url ?? '',
    photos,
    is_adopted: row.is_adopted,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function serializeDogs(rows: DogRow[]) {
  return Promise.all(rows.map(serializeDog));
}

function cleanPayload(input: DogPayload, existing?: DogRow): Required<DogPayload> {
  const name = (input.name ?? existing?.name ?? '').trim();
  const size = input.size ?? existing?.size ?? 'medium';
  const sex = input.sex === '' ? null : input.sex ?? existing?.sex ?? null;

  if (!name) throw new Error('Name is required');
  if (!['small', 'medium', 'large'].includes(size)) throw new Error('Invalid size');
  if (sex && !['male', 'female'].includes(sex)) throw new Error('Invalid sex');

  return {
    name,
    size,
    sex,
    age: input.age ?? existing?.age ?? '',
    description: input.description ?? existing?.description ?? '',
    photo_url: input.photo_url ?? existing?.photo_url ?? '',
    is_adopted: input.is_adopted ?? existing?.is_adopted ?? false,
  };
}

async function getDogRow(id: string): Promise<DogRow | null> {
  const result = await pool.query<DogRow>('select * from dogs where id = $1', [id]);
  return result.rows[0] ?? null;
}

async function handleListDogs(url: URL, origin: string | null) {
  const includeAdopted = url.searchParams.get('includeAdopted') === 'true';
  const result = includeAdopted
    ? await pool.query<DogRow>('select * from dogs order by name asc')
    : await pool.query<DogRow>('select * from dogs where is_adopted = false order by name asc');
  return json({ dogs: await serializeDogs(result.rows) }, {}, origin);
}

async function handleGetDog(id: string, origin: string | null) {
  const row = await getDogRow(id);
  if (!row) return error('Dog not found', 404, origin);
  return json({ dog: await serializeDog(row) }, {}, origin);
}

async function handleCreateDog(request: Request, origin: string | null) {
  const payload = cleanPayload(await request.json() as DogPayload);
  const result = await pool.query<DogRow>(
    `insert into dogs (name, size, sex, age, description, photo_url, is_adopted, updated_at)
     values ($1, $2, $3, $4, $5, $6, $7, now())
     returning *`,
    [payload.name, payload.size, payload.sex, payload.age, payload.description, payload.photo_url, payload.is_adopted],
  );
  return json({ dog: await serializeDog(result.rows[0]) }, { status: 201 }, origin);
}

async function handleUpdateDog(id: string, request: Request, origin: string | null) {
  const existing = await getDogRow(id);
  if (!existing) return error('Dog not found', 404, origin);
  const payload = cleanPayload(await request.json() as DogPayload, existing);
  const result = await pool.query<DogRow>(
    `update dogs
     set name = $1, size = $2, sex = $3, age = $4, description = $5, photo_url = $6, is_adopted = $7, updated_at = now()
     where id = $8
     returning *`,
    [payload.name, payload.size, payload.sex, payload.age, payload.description, payload.photo_url, payload.is_adopted, id],
  );
  return json({ dog: await serializeDog(result.rows[0]) }, {}, origin);
}

async function handleDeleteDog(id: string, origin: string | null) {
  const existing = await getDogRow(id);
  if (!existing) return error('Dog not found', 404, origin);
  await pool.query('delete from dogs where id = $1', [id]);
  return json({ ok: true }, {}, origin);
}

function nextPhotoNumber(files: string[]): number {
  const numbers = files
    .map((file) => file.match(/^photo-(\d+)\./i)?.[1])
    .filter(Boolean)
    .map((value) => Number(value));
  const max = numbers.length > 0 ? Math.max(...numbers) : 0;
  if (max < 1) return 1;
  if (max === 1) return 3;
  return max + 1;
}

async function handleUploadPhotos(id: string, request: Request, origin: string | null) {
  const dog = await getDogRow(id);
  if (!dog) return error('Dog not found', 404, origin);

  const form = await request.formData();
  const files = form.getAll('photos').filter((item): item is File => item instanceof File);
  if (files.length === 0) return error('No photos uploaded', 400, origin);

  const slug = toSlug(dog.name);
  const dir = path.join(DOG_IMAGES_ROOT, slug);
  await mkdir(dir, { recursive: true });

  let currentFiles = await listPhotoFiles(slug);
  const uploaded: string[] = [];

  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    let photoNumber = nextPhotoNumber(currentFiles);
    if (photoNumber === 2) photoNumber = 3;
    const filename = `photo-${String(photoNumber).padStart(2, '0')}.jpg`;
    const destination = path.join(dir, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await sharp(buffer).rotate().resize(1600, 1600, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 82 }).toFile(destination);
    await pool.query(
      `insert into dog_photos (dog_id, filename, sort_order)
       values ($1, $2, $3)
       on conflict (dog_id, filename) do update set sort_order = excluded.sort_order`,
      [id, filename, photoNumber],
    );
    uploaded.push(photoUrl(slug, filename));
    currentFiles = [...currentFiles, filename];
  }

  const first = (await listPhotoFiles(slug))[0];
  if (first) {
    await pool.query('update dogs set photo_url = $1, updated_at = now() where id = $2', [photoUrl(slug, first), id]);
  }

  const updated = await getDogRow(id);
  return json({ dog: updated ? await serializeDog(updated) : null, uploaded }, {}, origin);
}

async function handleDeletePhoto(id: string, filename: string, origin: string | null) {
  const dog = await getDogRow(id);
  if (!dog) return error('Dog not found', 404, origin);
  if (!/^photo-\d+\.(jpe?g|png|webp)$/i.test(filename)) return error('Invalid filename', 400, origin);

  const slug = toSlug(dog.name);
  await unlink(path.join(DOG_IMAGES_ROOT, slug, filename)).catch(() => undefined);
  await pool.query('delete from dog_photos where dog_id = $1 and filename = $2', [id, filename]);

  const first = (await listPhotoFiles(slug))[0];
  await pool.query('update dogs set photo_url = $1, updated_at = now() where id = $2', [first ? photoUrl(slug, first) : '', id]);

  const updated = await getDogRow(id);
  return json({ dog: updated ? await serializeDog(updated) : null }, {}, origin);
}

async function serveImage(slug: string, filename: string, origin: string | null) {
  if (!/^[a-z0-9-]+$/.test(slug) || !/^photo-\d+\.(jpe?g|png|webp)$/i.test(filename)) {
    return error('Invalid image path', 400, origin);
  }
  const file = Bun.file(path.join(DOG_IMAGES_ROOT, slug, filename));
  if (!(await file.exists())) return error('Image not found', 404, origin);
  const type = filename.endsWith('.webp') ? 'image/webp' : filename.endsWith('.png') ? 'image/png' : 'image/jpeg';
  return new Response(file, {
    headers: {
      ...corsHeaders(origin),
      'Content-Type': type,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}

Bun.serve({
  port: PORT,
  async fetch(request) {
    const origin = request.headers.get('origin');
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) });

    try {
      const url = new URL(request.url);
      const parts = url.pathname.split('/').filter(Boolean);

      if (url.pathname === '/health') return json({ ok: true }, {}, origin);

      if (url.pathname === '/auth/login' && request.method === 'POST') {
        const body = await request.json().catch(() => ({})) as { email?: string; password?: string };
        const email = (body.email ?? '').trim().toLowerCase();
        const passwordHash = sha256(body.password ?? '');
        if (email !== ADMIN_EMAIL.toLowerCase() || !constantTimeEqual(passwordHash, ADMIN_PASSWORD_SHA256)) {
          return error('Invalid login', 401, origin);
        }
        return json({ token: signToken(ADMIN_EMAIL) }, {}, origin);
      }

      if (url.pathname === '/dogs' && request.method === 'GET') return handleListDogs(url, origin);
      if (url.pathname === '/dogs' && request.method === 'POST') {
        const authError = requireAuth(request, origin);
        return authError ?? handleCreateDog(request, origin);
      }

      if (parts[0] === 'dogs' && parts[1]) {
        const id = parts[1];
        if (parts.length === 2 && request.method === 'GET') return handleGetDog(id, origin);
        if (parts.length === 2 && request.method === 'PUT') {
          const authError = requireAuth(request, origin);
          return authError ?? handleUpdateDog(id, request, origin);
        }
        if (parts.length === 2 && request.method === 'DELETE') {
          const authError = requireAuth(request, origin);
          return authError ?? handleDeleteDog(id, origin);
        }
        if (parts[2] === 'photos' && parts.length === 3 && request.method === 'POST') {
          const authError = requireAuth(request, origin);
          return authError ?? handleUploadPhotos(id, request, origin);
        }
        if (parts[2] === 'photos' && parts[3] && request.method === 'DELETE') {
          const authError = requireAuth(request, origin);
          return authError ?? handleDeletePhoto(id, decodeURIComponent(parts[3]), origin);
        }
      }

      if (parts[0] === 'images' && parts[1] === 'dogs' && parts[2] && parts[3] && request.method === 'GET') {
        return serveImage(decodeURIComponent(parts[2]), decodeURIComponent(parts[3]), origin);
      }

      return error('Not found', 404, origin);
    } catch (err) {
      console.error(err);
      return error('Internal server error', 500, origin);
    }
  },
});

console.log(`CAPA API listening on 127.0.0.1:${PORT}`);
