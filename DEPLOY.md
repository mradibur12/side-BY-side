# Side by Side — Deployment Guide

## Prerequisites

- Node.js 18+
- npm
- Supabase account (free tier)
- Vercel account (free tier)

---

## 1. Supabase Setup

### Create project

1. Go to https://supabase.com and create a new project
2. Note your **Project URL** and **anon public key** from Project Settings → API

### Run migrations

In the Supabase dashboard, go to **SQL Editor** and run:

1. Paste and run `sql/001_schema.sql`
2. Paste and run `sql/002_rls.sql`

Both must succeed without errors before deploying.

### Configure Auth

1. Go to Authentication → Settings
2. Set **Site URL** to your Vercel deployment URL (e.g. `https://side-by-side.vercel.app`)
3. Add the same URL to **Redirect URLs**
4. For local dev, add `http://localhost:3000`

---

## 2. Local Development

```bash
# Clone / unzip the project
cd side-by-side

# Install dependencies
npm install

# Create environment file
cp .env.local.example .env.local

# Fill in your Supabase credentials in .env.local:
# NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...

# Run dev server
npm run dev
```

Open http://localhost:3000

---

## 3. Deploy to Vercel

### Via Vercel CLI

```bash
npm install -g vercel
vercel
```

### Via Vercel dashboard

1. Push your project to GitHub
2. Go to https://vercel.com/new
3. Import the repository
4. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Deploy

---

## 4. Post-deployment

After first deploy:

1. Copy your Vercel URL (e.g. `https://side-by-side-xxx.vercel.app`)
2. In Supabase → Authentication → Settings, update the Site URL to match
3. Test signup flow end-to-end

---

## 5. Feature notes

### Household flow
- First user signs up → creates household → becomes owner
- Owner generates invite link from dashboard
- Partner opens `/join/[token]` → signs up → auto-joins household
- Invite links expire after 7 days

### Data safety
- All deletes are soft deletes (`deleted_at`)
- All major changes are logged to `activity_logs`
- No data ever lives only in localStorage

### Free tier limits
- Supabase free: 500MB database, 2GB transfer, 50MB file storage
- Vercel free: unlimited deployments, 100GB bandwidth
- Both are sufficient for a two-person household app indefinitely

---

## Troubleshooting

**"Failed to create household"** after signup
→ Check that `001_schema.sql` ran successfully and the `handle_new_user` trigger is active.

**RLS errors / empty data**
→ Confirm `002_rls.sql` ran. Check that the user is in `household_members`.

**Invite link not working**
→ Check `invitations` table for the token. Confirm it's not expired (`expires_at`).
