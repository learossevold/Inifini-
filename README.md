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

### The decision: Capacitor, wrapping the live site — not a rewrite

Three real options, and why the choice landed where it did:

| | Time to a submittable build | What it costs you | Ongoing maintenance |
|---|---|---|---|
| **PWA only** (already done — see §11a) | Already there | Nothing | Nothing |
| **Capacitor** (recommended) | Hours of setup, then the usual Apple process (see below) | Nothing rewritten; `/api/*`, `force-dynamic` routes, Supabase magic-link auth all keep working exactly as they do today | One `git push` to `main` ships to the app too — a new native build is only needed for a native-side change (an icon, a plugin), not ordinary content/feature work |
| **React Native migration** | Weeks to months | Every custom piece of UI in this app rewritten from scratch — the swipe-snap feed, the boundary-swipe-out-of-an-article handoff, Ken Burns, all of it, since none of it is DOM/CSS in RN's world | Two codebases forever, unless you also take on React Native Web's own tooling cost to share one |

PWA alone doesn't reach the stated goal at all — an iOS PWA isn't distributed through the App Store, doesn't show up in App Store search, and can't be found by anyone not already told to "Add to Home Screen." It's real progress (already done, see §11a) and the right way to validate with friends first, but it's a different distribution channel, not a step on the way to this one.

React Native is disproportionate for where this app is: pre-launch, not yet validated with real users, and its whole present value is a specific, heavily-tuned custom feed UI that a rewrite would throw away and rebuild from zero.

**Capacitor, configured to load the live Vercel deployment as a remote URL** (not `next export`'s static bundle) is what's actually set up now — see §11b. This is the standard, proportionate path for an existing, working web app to reach the App Store without a rewrite.

### 11a. PWA status: already done

`public/manifest.json`, all four icon sizes, and `apple-touch-icon.png` already exist and are wired up in `src/app/layout.tsx`. "Add to Home Screen" on iOS already gives a full-screen, app-like launch today — nothing left to do here. Worth using in the meantime regardless of the App Store timeline: it's the cheapest way to get real daily usage signal from friends before spending a review cycle on Apple.

### 11b. What's set up already

- `capacitor.config.ts` — the whole wrapper's configuration. Loads the app from `server.url` (a **placeholder** right now — see below), with `server.errorPath` pointed at a small local page (`capacitor-shell/index.html`) that Capacitor shows in place of a native WebView error page specifically when that URL can't be reached at all (no connection, DNS failure, the server down) — confirmed against `@capacitor/ios`'s own source (`WebViewDelegationHandler.swift`) rather than assumed, since it's easy to get this kind of Capacitor behavior wrong by guessing.
- `@capacitor/core`, `@capacitor/ios`, `@capacitor/app`, `@capacitor/splash-screen`, `@capacitor/status-bar` — installed.
- `src/lib/nativeStatusBar.ts` — switches the iOS status bar's icon color between the two feeds' backgrounds (dark icons over News/For You's paper background, light icons over Watch's night background), called from `Feed.tsx` on every tab switch. Guarded by `Capacitor.isNativePlatform()`, so it's a safe no-op on the plain website — `@capacitor/status-bar` has no web implementation at all and throws if called without that guard, confirmed against `@capacitor/core`'s `registerPlugin` source before wiring this in, not assumed.
- `npm run cap:add:ios` / `cap:sync` / `cap:open:ios` — added, but **only run on a Mac with Xcode installed** (see §11c — this session's environment is Linux and cannot run any of them, so none have been run yet).

**Two placeholders you must fill in before this builds for real**, both marked `PLACEHOLDER` in the files:
1. `capacitor.config.ts`'s `appId` (`com.indrearne.inifini` right now) — must exactly match the Bundle ID you register in the Apple Developer portal.
2. `capacitor.config.ts`'s `server.url`, **and** the matching `PRODUCTION_URL` constant in `capacitor-shell/index.html` (kept as a separate value on purpose — that page is static and has no access to the config file at runtime) — both need Inifini's real production domain. Get this wrong and the result is a blank or broken app on a real device, not a build error, so it's easy to miss until you're holding a phone.

### 11c. What you have to do yourself, on a Mac

None of this is possible from this session — iOS code signing and Xcode builds require a real Mac, regardless of what generated the project.

1. **Enroll in the Apple Developer Program** ($99/year) if you haven't. Individual enrollment can take a day or two to clear; organization enrollment (needs a D-U-N-S number) longer.
2. Fill in the two placeholders above.
3. `npm install`, then `npm run cap:add:ios` — generates the `ios/` Xcode project. Run once; after this, `npm run cap:sync` is what picks up future config/plugin changes.
4. In the **Apple Developer portal** (Certificates, IDs & Profiles → Identifiers): register an App ID matching `capacitor.config.ts`'s `appId` exactly.
5. In **Xcode** (`npm run cap:open:ios` opens `ios/App/App.xcworkspace` — always the `.xcworkspace`, never the `.xcodeproj`, since CocoaPods is involved):
   - Signing & Capabilities tab → select your Team → check "Automatically manage signing." Xcode then creates the provisioning profile itself; there's no manual profile-wrangling needed for a solo submission.
   - App icon: `npx @capacitor/assets generate --ios` generates the full icon set Xcode needs from a single source image — put `public/icon-1024.png` at `resources/icon.png` first (it's already the right size, 1024×1024, and already has no alpha channel, which the App Store icon specifically requires and a lot of source icons get wrong).
   - Splash screen: same `@capacitor/assets` command generates it from a `resources/splash.png` (recommended 2732×2732) — a simple paper-background-plus-logo image matching `src/components/Splash.tsx`'s own look is the obvious choice.
   - General tab: set supported orientation to **portrait only** — matches the app's actual design (`max-w-md`, phone-width layout throughout) and simplifies both this step and the App Store screenshot requirements below. Mark the app **iPhone only** (not iPad) for the same reason, unless you want to design and test a tablet layout first.
6. Test on a real device or the Simulator: `npx cap run ios`, or Xcode's own Run button.
7. **TestFlight first, App Store second.** Product → Archive in Xcode, then Distribute App → App Store Connect. This uploads a build you can immediately put in front of a small group of testers over TestFlight, before it's ever public — the natural next step after the friends-testing-the-PWA phase §11a's recommendation already pointed at.
8. Once ready, submit the same build for App Store review from App Store Connect.

### 11d. App Store requirements checklist

| Requirement | Status |
|---|---|
| **Privacy policy URL** | Exists (`src/app/privacy/page.tsx`) — App Store Connect needs the live URL once the production domain is set. |
| **App description, keywords, support URL** | Not written yet. |
| **Screenshots** | Not made yet. iPhone 6.7" (e.g. 1290×2796) is the one Apple currently requires at minimum; skip iPad sizes entirely if the app is marked iPhone-only per §11c step 5. |
| **Age rating questionnaire** | Not filled in yet — Apple's own form in App Store Connect (covers UGC, news content, etc.); nothing to build for it. |
| **App Privacy "nutrition label"** | Not filled in yet — the App Store Connect form disclosing what's collected (account email, reading history, comments, friend/message data per `supabase/schema.sql`) and how it's used; should mirror what `src/app/privacy/page.tsx` already states in prose. |
| **Category / pricing** | Straightforward once you're in App Store Connect — News, presumably free. |

### 11e. Guideline 4.2 ("Minimum Functionality") — the real risk for this kind of app

Apple explicitly rejects apps that are "simply a website wrapped in a WebView" with no native experience of their own — the single biggest review risk for exactly this setup. Where this app already stands:

**Already helps:** the UI itself doesn't read as a browser tab — a native-style bottom tab bar, full-screen swipe feeds (Watch, For You), native-feeling sheets for comments and sharing, none of it chrome-heavy or obviously "a website." The status bar and splash screen integration from §11b are genuine (if small) native touches, not just cosmetic — real API calls, not css.

**Worth adding before submitting, highest-leverage first:**
- **Native push notifications.** The morning-brief push already exists (`NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`, §4) via web-push/VAPID, but that path is unreliable inside a Capacitor WebView on iOS the way it is in Safari. `@capacitor/push-notifications` (APNs-based) is the natural replacement, and reviewers specifically look favorably on real native capability use — this is likely the single highest-leverage addition for review risk, and isn't done yet.
- **A real report mechanism for comments.** What exists today: a submit-time banned-word filter, and a personal "Hide" on any comment (client-side only, not sent anywhere — see `src/components/Comments.tsx`). What's missing: any way for a reader to report a comment *to the developer*, and any moderation queue in `/admin` to act on one. Blocking a *person* is already fully built (`blockUser`, wired up from the inbox) — it's specifically reporting *content* that isn't. Apple's Guideline 1.2 for user-generated content expects both a report mechanism and evidence you can act on reports quickly; this is a gap worth closing before submitting a social app, not just an App Store nicety.
- **Offline handling.** §11b's `server.errorPath` page covers the total-failure case (no connection at all) with a real retry, not a native browser error screen — done. A brief network *hiccup* mid-session (not a full failure) still surfaces however the web app itself already handles a failed fetch (see the existing "The presses jammed" retry state in `Feed.tsx`) — already reasonable, not a gap.

