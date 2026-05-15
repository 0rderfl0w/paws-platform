import { readdir } from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';

const { Pool } = pg;

type DogRow = {
  id: string;
  name: string;
};

const DATABASE_URL = process.env.DATABASE_URL ?? '';
const PUBLIC_API_URL = (process.env.CAPA_PUBLIC_API_URL ?? '').replace(/\/$/, '');
const PROJECT_ROOT = process.env.CAPA_PROJECT_ROOT ?? process.cwd();
const DOG_IMAGES_ROOT = path.join(PROJECT_ROOT, 'public', 'images', 'dogs');

if (!DATABASE_URL) throw new Error('DATABASE_URL is required');
if (!PUBLIC_API_URL) throw new Error('CAPA_PUBLIC_API_URL is required');

const pool = new Pool({ connectionString: DATABASE_URL, max: 4 });

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

async function listPhotoFiles(slug: string): Promise<string[]> {
  try {
    const files = await readdir(path.join(DOG_IMAGES_ROOT, slug));
    return files
      .filter((file) => /\.(jpe?g|png|webp)$/i.test(file))
      .filter((file) => file !== 'photo-02.jpg')
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  } catch {
    return [];
  }
}

const client = await pool.connect();

try {
  await client.query('begin');
  await client.query(`
    do $$
    begin
      if not exists (
        select 1 from pg_constraint where conname = 'dog_photos_dog_filename_unique'
      ) then
        alter table dog_photos add constraint dog_photos_dog_filename_unique unique (dog_id, filename);
      end if;
    end
    $$;
  `);

  const { rows } = await client.query<DogRow>('select id, name from dogs order by name asc');
  let photoRows = 0;
  let dogsWithPhoto = 0;

  for (const dog of rows) {
    const slug = toSlug(dog.name);
    const files = await listPhotoFiles(slug);

    for (const file of files) {
      const sortOrder = Number(file.match(/^photo-(\d+)\./i)?.[1] ?? 0);
      await client.query(
        `insert into dog_photos (dog_id, filename, sort_order)
         values ($1, $2, $3)
         on conflict (dog_id, filename) do update set sort_order = excluded.sort_order`,
        [dog.id, file, sortOrder],
      );
      photoRows += 1;
    }

    if (files[0]) {
      dogsWithPhoto += 1;
      await client.query(
        'update dogs set photo_url = $1, updated_at = updated_at where id = $2',
        [`${PUBLIC_API_URL}/images/dogs/${encodeURIComponent(slug)}/${encodeURIComponent(files[0])}`, dog.id],
      );
    }
  }

  await client.query('commit');
  console.log(`Migrated ${rows.length} dogs, ${dogsWithPhoto} first-photo URLs, ${photoRows} dog photo rows.`);
} catch (err) {
  await client.query('rollback');
  throw err;
} finally {
  client.release();
  await pool.end();
}
