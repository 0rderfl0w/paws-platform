---
priority: "2nd"
category: "engineering"
tags: ["admin", "supabase", "data", "testing"]
created: "2026-02-25"
---

# Admin Testing & Data Cleanup

## Goal
Verify the admin panel works end-to-end and clean up remaining data gaps.

## TODO

### Z Actions
- [ ] Create admin user in Supabase Auth dashboard (email/password)

### Agent Work (after Z creates admin user)
- [ ] Test admin login flow
- [ ] Test add new dog (with photo upload)
- [ ] Test edit existing dog
- [ ] Test toggle adopted status
- [ ] Test delete dog
- [ ] Fill in sex values for 5 dogs: Bella, Bolt, Channel, Rastas, Bailey (check photos or ask Z)
- [ ] Replace favicon with CAPA logo (once Z provides it)

## Notes
- Admin panel is at `/admin` — React island behind Supabase email/password auth
- Current favicon is Astro default (rocket icon) — needs CAPA logo SVG from Z
- 5 dogs have null sex values: couldn't determine from original scrape
- Unique constraint on `dogs.name` is now live
