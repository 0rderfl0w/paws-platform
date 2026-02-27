# 🐾 Paws Platform

**Open-source animal shelter website template.** Fork it, customize it, deploy it for a shelter or rescue in your community.

Built with [Astro](https://astro.build) + [React](https://react.dev) + [Tailwind CSS](https://tailwindcss.com) + [Supabase](https://supabase.com). No coding experience required.

> This is the starter template for [Build to Own Club](https://buildtoown.club) **Module 3: Launch an Animal Shelter Website**. The module walks you through every step, from zero to a live, deployed website.

---

## What You Get

A fully functional shelter website with:

- 🏠 **Homepage** with hero section, shelter stats, featured dogs, and calls to action
- 🐕 **Dog listings page** with filters (size, sex) and search
- 🐶 **Individual dog profiles** with photo galleries and descriptions
- 📋 **Adoption info page** explaining the adoption process
- 💛 **Help/donate page** with ways to support the shelter
- ℹ️ **About page** with the shelter's story
- 🔧 **Admin panel** for managing dog listings
- 📱 **Fully responsive** on mobile, tablet, and desktop
- ⚡ **Fast** because Astro builds static pages by default

---

## Quick Start

```bash
# 1. Fork this repo on GitHub (click the "Fork" button above)

# 2. Clone YOUR fork
git clone https://github.com/YOUR-USERNAME/paws-platform.git
cd paws-platform

# 3. Install dependencies
bun install

# 4. Set up your environment variables
cp .env.example .env
# Add your Supabase URL and anon key to .env

# 5. Start the dev server
bun dev
```

Your site will be running at `http://localhost:4321`.

---

## Step-by-Step Lessons

**Don't know where to start?** The full guided course is free at [buildtoown.club/learn/module-3](https://buildtoown.club/learn/module-3). It covers everything from setting up your tools to deploying a live site. No coding experience needed.

| # | Lesson | What You'll Do |
|---|--------|---------------|
| 1 | What You Are Building | See the finished site, understand every feature |
| 2 | Set Up Your AI Assistant | Get your AI coding tool ready (free options available) |
| 3 | The Terminal: Your New Superpower | Learn to use the terminal for the first time |
| 4 | Install the Tools | Install Bun, Git, and your code editor |
| 5 | Fork the Repo | Create your own copy of this template |
| 6 | Install and Run the Project | Get the site running on your computer |
| 7 | Protect Your Secret Keys | Set up environment variables securely |
| 8 | Set Up Supabase | Create your database and connect it |
| 9 | Upload Your Data | Add your shelter's dogs and photos |
| 10 | Make It Yours | Change the name, colors, content, and branding |
| 11 | Local Testing | Test everything before going live |
| 12 | Deploy to Hosting | Put your site on the internet |
| 13 | Custom Domain & Next Steps | Connect your domain and plan what's next |

---

## Build Challenge

This repo is part of the **Build to Own Club Build Challenge**: find a real shelter or social project in your community, customize this template for them, and deploy it. Learn AI and web development by building something that matters.

👉 [Join the challenge](https://buildtoown.club/events/build-challenge-001) (free, no account needed to start)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Astro 5](https://astro.build) |
| UI Components | [React 19](https://react.dev) (interactive islands) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com) |
| Database & Storage | [Supabase](https://supabase.com) (free tier) |
| Runtime | [Bun](https://bun.sh) |

---

## Project Structure

```
paws-platform/
├── public/              # Static assets (images, icons)
├── src/
│   ├── components/      # UI components
│   │   ├── Hero.astro          # Homepage hero section
│   │   ├── Nav.astro           # Navigation bar
│   │   ├── Footer.astro        # Site footer
│   │   ├── FeaturedDogs.tsx    # Featured dogs (React)
│   │   ├── DogListings.tsx     # Dog listings with filters (React)
│   │   ├── DogProfile.tsx      # Individual dog profile (React)
│   │   ├── AdminPanel.tsx      # Admin panel (React)
│   │   ├── Stats.astro         # Shelter statistics
│   │   ├── AboutBlurb.astro    # About section
│   │   ├── WhyAdopt.astro      # Why adopt section
│   │   └── HelpCta.astro       # Help/donate call to action
│   ├── data/
│   │   └── seedDogs.ts         # Sample dog data for getting started
│   ├── layouts/
│   │   └── Layout.astro        # Base page layout
│   ├── lib/
│   │   └── supabase.ts         # Supabase client setup
│   ├── pages/                   # Each file = a page on your site
│   │   ├── index.astro         # Homepage
│   │   ├── caes.astro          # Dog listings
│   │   ├── cao.astro           # Individual dog profile
│   │   ├── adocao.astro        # Adoption info
│   │   ├── ajudar.astro        # Help/donate
│   │   ├── sobre-nos.astro     # About
│   │   ├── admin.astro         # Admin panel
│   │   └── 404.astro           # Not found page
│   └── styles/
│       └── global.css          # Global styles and Tailwind config
├── supabase/                    # Database setup files
├── scripts/                     # Helper scripts
└── package.json
```

---

## Commands

All commands are run from the root of the project:

| Command | Action |
|---------|--------|
| `bun install` | Install dependencies |
| `bun dev` | Start dev server at `localhost:4321` |
| `bun build` | Build production site to `./dist/` |
| `bun preview` | Preview production build locally |

---

## Customizing

The lessons walk you through all of this, but here's a quick overview:

- **Shelter name and branding** → Edit the components in `src/components/`
- **Colors** → Update the theme in `src/styles/global.css`
- **Pages** → Rename or add pages in `src/pages/`
- **Content** → Edit the Astro components directly (they're just HTML with superpowers)
- **Dog data** → Managed through Supabase (database + photo storage)

---

## About Build to Own Club

[Build to Own Club](https://buildtoown.club) is a community where people learn AI by building real software. No coding background needed. We replace the tools we pay for with tools we own, control, and keep forever.

**Modules 1 and 3 are completely free.** No account needed to start learning.

---

## License

MIT — fork it, customize it, ship it. Give a shelter a website. 🐾
