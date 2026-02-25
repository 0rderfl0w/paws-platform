Project: CAPA PVL (capapvl.pt) — Dog Shelter Website

Working directory: `~/projects/capapvl.pt/`

Before You Start

1. Read `PROJECT.md` — full stack, architecture, deploy notes
2. Read first 30 lines of `CHANGELOG.md`
3. Read this task's `SPEC.md` (same directory as this file)
4. Run `git log --oneline -5`

Your Task: Deploy & Go Live

Get the site ready for production on capapvl.pt via Hostinger static hosting.

1. Run `bun run build` and verify 8 pages build clean
2. Update the orphan `deploy` branch with the latest build output
   - Use git worktree or temp dir — do NOT switch branches on the main worktree (protects .env)
   - Copy contents of `dist/` to the deploy branch root, commit, and push
3. Verify all pages in the `dist/` output render correctly (spot-check HTML files)
4. Confirm Supabase URLs in the built JS bundles point to the right project
5. Document the deploy process in PROJECT.md if not already there
6. Remind Z: configure Hostinger, point DNS, verify CORS/allowed origins in Supabase

Key Details

- Deploy pattern: same as richkapp.com (orphan `deploy` branch with built output at root)
- Supabase project URL: `https://amkwoeepuhlnjmybbnbo.supabase.co`
- .env is gitignored — BACK IT UP before any branch operations
- Hostinger is static-only (LiteSpeed)

Constraints

- Bun runtime
- Do NOT deploy — build everything up to "ready to deploy" and hand off to Z
- Update CHANGELOG.md when done
