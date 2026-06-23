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
| `ADMIN_PASSWORD` | for /admin in production | Protects `/admin` and `/api/ingest`. Open in dev if unset. |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | optional | Database + auth. Without them, the app runs on mock data. |
| `SUPABASE_SERVICE_ROLE_KEY` | optional | Server-only write key for ingestion. |
| `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` | optional | Real AI summaries. Checked Anthropic-first. |
| `OPENAI_API_KEY_TTS` | optional | Reserved for Watch-tab narration audio. Without it, Watch uses silent caption cards. |

## 5. Set up Supabase

1. Create a project at supabase.com.
2. SQL editor → paste `supabase/schema.sql` → run. This creates all content + social tables, an auth-linked `profiles` table with an auto-create trigger, and row-level-security policies.
3. Put the URL + anon key + service role key in `.env.local`.
4. Restart `npm run dev`.

## 6. Ingest real news

With Supabase configured: open `/admin`, enter `ADMIN_PASSWORD`, click **Run ingestion now**. It pulls the RSS feeds in `src/config/sources.ts` (titles/excerpts/links only — never full articles, all credited and linked), dedupes, generates AI (or mock) summaries, scores them, and stores them. Edit that one file to add/remove sources.

## 7. Deploy to Vercel

Push to GitHub → import at vercel.com/new → add the environment variables under Settings → redeploy. Vercel-ready, no extra config.

## 8. What's working / what needs improvement

**Working:** all three feed tabs, infinite scroll, inline article view (feed continues below), saving/liking, threaded comments with word-filter, mutual friend requests, sharing to a friend, notifications inbox, search, profile with editable interests, onboarding, admin ingestion, full mock mode.

**Needs improvement / next:**
- The social layer runs in-memory in demo mode. Wiring the `session` methods to real Supabase calls is the main step to make friends/comments/shares persist across users.
- Watch-tab narration audio is stubbed (caption cards). Add a TTS step in ingestion to populate `video_url`.
- Magic-link auth UI is described but uses the mock user until Supabase Auth is connected.
- Real-time comment updates would need Supabase subscriptions.

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

Right now the feed shows realistic demo stories. To switch to live news from NRK, BBC, Guardian, E24, TechCrunch and Ars Technica:

1. **Create a Supabase project** (free) and run `supabase/schema.sql` in its SQL editor.
2. Add the three Supabase keys + `ADMIN_PASSWORD` to your Vercel environment variables.
3. (Optional but recommended) add `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` so summaries are real AI summaries instead of excerpt-based fallbacks.
4. Open `/admin`, enter the password, click **Run ingestion now**. Real stories appear in the feed.
5. **Keep it fresh automatically:** add a Vercel Cron Job hitting `/api/ingest` every 15–30 minutes (Project → Settings → Cron Jobs). On the Hobby plan, use an external scheduler like cron-job.org that can send the `x-admin-password` header.

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

