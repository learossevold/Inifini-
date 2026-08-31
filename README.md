# Inifini

A calm, mobile-first **social** news app. The reading quality of a newspaper, the endless rhythm of TikTok, and a lightweight friends layer — without public follower counts or influencer dynamics.

**Works immediately with zero keys** (mock data, mock summaries, a mock logged-in user). Upgrades automatically when you connect Supabase and an AI key.

---

## 1. Run locally (no keys needed)

```bash
npm install
npm run dev
```

Open http://localhost:3000 in your browser's mobile view (DevTools → device toolbar → iPhone), or on your phone over the same wifi. It boots straight into demo mode: a logged-in user "Lea", 12 demo stories that cycle infinitely, mock friends, comments, and a shared-story inbox.

## 2. The three feed tabs

- **News** — every story, ranked by recency + importance + source trust + category priority.
- **Following** — only your chosen interest categories, but urgent breaking news still surfaces so you never miss it.
- **Watch** — full-screen vertical "AI narration" cards: the story image with a slow Ken Burns zoom and animated captions of the summary. With a text-to-speech key it can add real narration; without one it runs as silent caption cards. It is always labelled as an AI narration of the publisher's reporting — never fabricated footage.

## 3. The social layer

- **Accounts** — demo mode uses an in-memory user. With Supabase Auth connected, sign-in becomes a magic link emailed to the user (no passwords).
- **Friends** — mutual only (request → accept). No one-directional following of people. Friend lists and counts are private.
- **Sharing** — send any story to a friend; it lands in their Notifications inbox.
- **Comments** — threaded, likeable, with a basic word-filter and report/hide.
- **Saves / likes** — personal bookmarking; the displayed count is just a total, never "who liked it".

## 4. Environment variables

Copy `.env.example` to `.env.local` and fill in what you have:

| Variable | Required? | Purpose |
|---|---|---|
| `ADMIN_PASSWORD` | for /admin in production | Protects `/admin`, `/api/ingest` and `/api/ingest/summarize`. Open in dev if unset. |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | optional | Database + auth. Without them, the app runs on mock data. |
| `SUPABASE_SERVICE_ROLE_KEY` | optional | Server-only write key for ingestion. |
| `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` | optional | Real AI summaries, used by `/api/ingest/summarize`. Checked Anthropic-first. |
| `CRON_SECRET` | recommended in production | Lets Vercel Cron's daily `/api/ingest` request (and, if you point cron-job.org at it too, `/api/ingest/summarize`) authenticate with a bearer token instead of `ADMIN_PASSWORD`. See §10 for why `/api/ingest/summarize` needs its own, more frequent external schedule. |
| `OPENAI_API_KEY_TTS` | optional | Powers Watch-tab AI narration audio. Without it, Watch uses silent caption cards. Needs a Supabase Storage bucket, which `/api/ingest/narrate` creates automatically on first run. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_CONTACT_EMAIL` | optional | The daily morning-brief push notification. Generate a pair with `npx web-push generate-vapid-keys`. Without them the toggle stays hidden and nothing is sent. |

## 5. Set up Supabase

1. Create a project at supabase.com.
2. SQL editor → paste `supabase/schema.sql` → run. This creates all content + social tables, an auth-linked `profiles` table with an auto-create trigger, and row-level-security policies.
3. Put the URL + anon key + service role key in `.env.local`.
4. Restart `npm run dev`.

## 6. Ingest real news

Ingestion is two steps, not one — this is what keeps it inside Vercel's function time limit (see §10 for why):

1. **Fetch + queue.** With Supabase configured: open `/admin`, enter `ADMIN_PASSWORD`, click **Run ingestion now**. It pulls the RSS feeds in `src/config/sources.ts` (titles/excerpts/links only — never full articles, all credited and linked), dedupes, scores them, and stores them with `status: 'pending'`. Edit that one file to add/remove sources. This step does **not** call the AI — it's fast on purpose.
2. **Summarize.** Click **Summarize pending** (same page) to turn a batch of those pending rows into real published stories with AI (or mock) summaries. A pending row is invisible to readers — it isn't in the feed and isn't reachable through the API — until this step publishes it.

In production, both are meant to run on their own schedule rather than by hand — see §10.

With `OPENAI_API_KEY_TTS` also set, click **Generate Watch narration** on the same page (or wait for its daily cron) to read the newest stories' summaries aloud for the Watch tab — a real voice over the story's own photo, never fabricated video.

## 7. Deploy to Vercel

Push to GitHub → import at vercel.com/new → add the environment variables under Settings → redeploy. Vercel-ready, no extra config.

## 8. What's working / what needs improvement

**Working:** all three feed tabs, infinite scroll, inline article view (feed continues below), saving/liking, threaded comments with word-filter, mutual friend requests, sharing to a friend, notifications inbox, search, profile with editable interests and followed sources, onboarding, admin ingestion, real magic-link auth + a fully Supabase-backed social layer (friends/comments/shares/saves/likes), Watch-tab AI narration audio (with `OPENAI_API_KEY_TTS` set), full mock mode with zero keys.

**Needs improvement / next:**
- Real-time comment updates would need Supabase subscriptions (currently loads once per story open).
- Ranking is fixed rather than learned — it does not adapt to what a reader actually opens.
- On iOS, push notifications only work once the app is added to the Home Screen (an Apple restriction, surfaced in the UI).
- Watch narration currently runs once daily via cron, or on demand from `/admin` — a paid Vercel plan lets you tighten `vercel.json`'s `/api/ingest/narrate` schedule to run more often.

## 9. Test checklist (do these on a phone)

- [ ] App opens on the **Watch** tab by default
- [ ] Logo sits to the left of Watch / News / Following
- [ ] Onboarding: pick username → pick interests → land in feed
- [ ] News vs Following tabs show different ordering; urgent news still appears in Following
- [ ] Infinite scroll keeps loading with "Page 2 / 3" dividers
- [ ] Tap a story → it expands inline, feed continues below, "The paper continues ↓"
- [ ] Like and save a story; counts update
- [ ] Post a comment, reply to one, like a comment; try a banned word (gets blocked)
- [ ] Watch tab: swipe between full-screen cards, captions animate, attribution label shows
- [ ] Friends: send a request, accept an incoming request
- [ ] Share a story to a friend (Send button)
- [ ] Notifications: see shared stories + requests, badge count on the bell
- [ ] /admin shows stats and runs ingestion (with Supabase)
- [ ] Works fully with zero env vars

---

## 10. Going live with REAL news (the important next step)

Right now the feed shows realistic demo stories. To switch to live news from BBC, Al Jazeera, Sky News, DW, The Guardian, TechCrunch and Ars Technica (edit `src/config/sources.ts` to add Norwegian or other outlets):

1. **Create a Supabase project** (free) and run `supabase/schema.sql` in its SQL editor.
2. Add the three Supabase keys + `ADMIN_PASSWORD` to your Vercel environment variables.
3. (Optional but recommended) add `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` so summaries are real AI summaries instead of excerpt-based fallbacks.
4. Open `/admin`, enter the password, click **Run ingestion now**, then **Summarize pending**. Real stories appear in the feed.
5. **Keep it fresh automatically, on two schedules:**
   - `vercel.json` already defines a daily cron hitting `/api/ingest` at 04:00 UTC (≈06:00 Norwegian time) — Vercel picks this up automatically on deploy, no dashboard clicking needed.
   - `/api/ingest/summarize` needs its **own, more frequent** trigger — every 1–5 minutes is plenty — to drain whatever `/api/ingest` just queued. Vercel's own Cron Jobs can't do that on the Hobby plan (capped at once a day), so use an external scheduler: [cron-job.org](https://cron-job.org) (free) hitting `https://<your-domain>/api/ingest/summarize` every few minutes with the `x-admin-password` header set to your `ADMIN_PASSWORD`. Point a second cron-job.org job at `/api/ingest` too if you'd rather not rely on Vercel's daily one, or want it more often.
   - Either way, add a `CRON_SECRET` environment variable in Vercel (any random string) so Vercel Cron's own request to `/api/ingest` authenticates automatically (it signs its requests with this as a bearer token) — `/api/ingest/summarize` accepts the same bearer token too, if you'd rather use `CRON_SECRET` than `ADMIN_PASSWORD` for cron-job.org's requests.
6. **Why two steps at all:** `/api/ingest` only fetches feeds and inserts rows — no AI calls — so it finishes in a few seconds even on a completely empty database. All the AI summarization (the part that can run long, or hit a provider rate limit under a burst of new articles) happens in small, bounded batches in `/api/ingest/summarize` instead, each one safely inside the 60-second Hobby limit regardless of how many new articles just came in. A `pending` row is invisible to readers (feed queries and the anon RLS policy both filter on `status = 'published'`) until summarization publishes it, so nothing half-finished is ever shown.

That's the whole path from demo to a live, self-updating news app.

## 11. Getting onto the App Store

Inifini is a web app, so there are two realistic routes:

**A) Ship as a PWA first (days, ~free).** Add a web app manifest and icons so users can "Add to Home Screen" on iPhone — it then opens full-screen like an app, no App Store needed. This is the fastest way to get it onto phones and is the right first step while you test with friends.

**B) Wrap it for the real App Store (weeks, costs money).** To appear in Apple's App Store you need:
- An **Apple Developer account** ($99/year).
- A **native wrapper** around the web app — the common tools are **Capacitor** (recommended for a Next.js app) or a service like **PWABuilder**. This packages the site as an installable iOS app.
- A **Mac with Xcode** to build and submit (or a cloud build service).
- App Store assets: icon, screenshots, privacy policy, description, age rating.
- To pass **Apple review**, which is stricter for news/social apps: you'll likely need real accounts, a way to **report/block** content and users (the comment word-filter + hide is a start, but Apple usually wants block-user and report-to-moderator flows), and clear sourcing/attribution (already built in).

**Honest recommendation:** do **A** now — get it on friends' home screens as a PWA and see if they actually open it every morning. Only invest in **B** once you have real usage proving people want it. The App Store is a distribution step, not a validation step.

