---
priority: "1st"
category: "operations"
tags: ["deploy", "hostinger", "dns", "production"]
created: "2026-02-25"
---

# Deploy & Go Live — capapvl.pt

## Goal
Get the site live on capapvl.pt via Hostinger static hosting.

## TODO

### Agent Work
- [ ] Update orphan `deploy` branch with latest build output
- [ ] Test production build: verify Supabase connectivity works from static files (not just dev server)
- [ ] Verify all 8 pages render correctly from `dist/` output
- [ ] Document deploy process in PROJECT.md (build → copy to deploy branch → push)

### Z Actions
- [ ] Configure Hostinger static hosting for capapvl.pt
- [ ] DNS: point capapvl.pt to Hostinger (A record)
- [ ] Verify site loads on capapvl.pt after DNS propagation
- [ ] Test Supabase connectivity from production domain (CORS/allowed origins)

## Notes
- Orphan `deploy` branch already exists with an initial build
- Same deploy pattern as richkapp.com: `bun run build`, copy `dist/*` to deploy branch, commit, push
- Use git worktree or temp dir for deploy branch work (avoid .env loss from branch switching)
- Supabase project URL: `https://amkwoeepuhlnjmybbnbo.supabase.co`
