# Nova Volleyball Club — Web App

The custom club application: a Next.js (App Router) + TypeScript + Tailwind front end with Supabase auth and database. This is the Phase 0 app shell — login, signup, and a protected dashboard that reads your role from the database. Features arrive in later phases per the [roadmap](../docs/04-roadmap.md).

## Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** with the Nova brand palette (`tailwind.config.ts`)
- **Supabase** for auth + Postgres (`@supabase/ssr`)

## Project layout

```
web/
├── app/
│   ├── page.tsx              Landing page
│   ├── login/page.tsx        Email/password login
│   ├── signup/page.tsx       Account creation
│   ├── dashboard/            Protected area (reads profile + role)
│   └── auth/callback/route.ts  Email-confirm / OAuth redirect handler
├── components/Logo.tsx       Placeholder star mark (swap for official logo)
├── lib/supabase/             Browser, server, and middleware clients
├── middleware.ts             Session refresh + route protection
├── supabase/migrations/      The database schema (schema + RLS)
├── tailwind.config.ts        Brand colors
└── .env.example              Copy to .env.local and fill in
```

## Getting it running locally

You need [Node.js](https://nodejs.org) 18.18+ installed.

```bash
cd web
npm install
cp .env.example .env.local      # then fill in your Supabase values
npm run dev                     # http://localhost:3000
```

The app won't authenticate until `.env.local` has real Supabase values — get those from your Supabase project (Settings → API). The full account setup is in [docs/phase-0-setup-runbook.md](../docs/phase-0-setup-runbook.md).

## Database

The schema lives in `supabase/migrations/` (mirrors [`/database`](../database)). Apply it either by pasting the files into the Supabase SQL Editor, or with the Supabase CLI:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

## Useful scripts

- `npm run dev` — local dev server
- `npm run build` — production build
- `npm run typecheck` — TypeScript check, no emit
- `npm run lint` — Next.js lint

## Deploying

Push to GitHub, import the repo in Vercel, set the root directory to `web/`, add the same env vars in Vercel's project settings, and deploy. Step-by-step in the [setup runbook](../docs/phase-0-setup-runbook.md).
