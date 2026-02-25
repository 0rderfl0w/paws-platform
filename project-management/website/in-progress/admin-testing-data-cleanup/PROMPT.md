Project: CAPA PVL (capapvl.pt) — Dog Shelter Website

Working directory: `~/projects/capapvl.pt/`

Before You Start

1. Read `PROJECT.md` — full stack, architecture, Supabase schema, design direction
2. Read first 30 lines of `CHANGELOG.md`
3. Read this task's `SPEC.md` (same directory as this file)
4. Run `git log --oneline -5`

Your Task: Admin Testing & Data Cleanup

The admin panel at `/admin` is built but untested. Z has created an admin user in Supabase Auth. Your job:

1. Start dev server (`bun run dev`)
2. Test the admin login flow at `/admin`
3. Test CRUD: add a test dog (with photo upload), edit it, toggle adopted, delete it
4. Verify the public pages still show correct data after your test
5. Fill in sex values for 5 dogs with null sex: Bella, Bolt, Channel, Rastas, Bailey — check their photos in Supabase storage (`dog-photos` bucket) to determine sex if possible, otherwise ask Z
6. If Z has provided a CAPA logo SVG, replace `public/favicon.svg` and `public/favicon.ico`

Key Details

- Supabase project: `amkwoeepuhlnjmybbnbo`
- Admin auth: Supabase email/password (Z created the user)
- Storage bucket: `dog-photos` (public read, authenticated write)
- Unique constraint on `dogs.name` is live — duplicates will be rejected
- After testing, clean up any test data you created

Constraints

- Bun runtime
- Don't modify component logic unless you find a bug
- Build must pass clean after any changes: `bun run build`
- Update CHANGELOG.md when done
