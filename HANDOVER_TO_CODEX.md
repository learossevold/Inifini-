# Handover to Codex — Inifini

Written at the end of a Claude Code session, 2026-10-26, for continuation in
Codex. This file is the durable record; the chat session it came from will
not be available to Codex.

---

## 1. Purpose, requirements, decisions, constraints

**What Inifini is:** a mobile-first, TikTok-style news aggregation app.
Pulls headlines from public RSS feeds, writes AI summaries over them (never
scrapes or republishes full articles — title + excerpt + link only, always
credited and linked back to the original publisher), and presents them in
two registers the reader picks between: **Watch** (full-screen, one story
per swipe, narrated captions) or **News** (an ordinary scrolling list) —
plus **For You**, a personalized full-screen swipe feed built the same way
as Watch. There's a social layer (mutual friends, comments, sharing,
saves/likes) on top, backed by Supabase Auth + Postgres with row-level
security.

Stack: Next.js 14 (App Router) on Vercel, Supabase (Postgres/Auth/Storage),
Anthropic/OpenAI for summarization, optional OpenAI TTS for Watch
narration, web-push for a daily "morning brief" notification.

**Zero-key mode is load-bearing, not a toggle to remove.** With no Supabase
keys set, the whole app runs on in-memory mock data and a mock signed-in
user ("Lea") — this is how local dev and casual testing work by default.
Every data-access function in `src/lib/` branches on whether a Supabase
client exists; don't remove the mock branch when touching these.

**Key architectural decisions made and why (don't relitigate without a
reason):**

- **Ingestion is two separate endpoints, not one.** Vercel Hobby has a hard
  60-second function timeout, and its own Cron Jobs feature can't run more
  often than once a day — both constraints, not preferences.
  `/api/ingest` only fetches RSS feeds and inserts rows as `status:
  'pending'` (no AI calls, so it's fast regardless of volume).
  `/api/ingest/summarize` is a separate, small-batch (8 rows) endpoint that
  does the actual AI summarization and flips rows to `'published'`, meant
  to be called repeatedly on a short external schedule. A `'pending'` row
  is already invisible to readers for free — `getFeed()` and the anon RLS
  policy on `stories` both filter on `status = 'published'`. Full reasoning
  is in the comment block at the top of `src/lib/rss.ts`.
- **Capacitor wraps the live Vercel deployment via `server.url`, not a
  `next export` static bundle.** The app leans hard on server routes
  (`/api/*`, several `export const dynamic = 'force-dynamic'` routes) and
  Supabase magic-link auth, none of which survive static export. This was
  an explicit, reasoned choice over React Native (ruled out as
  disproportionate for a pre-launch app whose whole present value is a
  heavily-tuned custom swipe/snap feed UI that a native rewrite would
  discard) — see `capacitor.config.ts`'s own top comment and README §11.
- **Fraunces → Source Serif 4** for the app's headline typeface. Not a bug
  fix — the user found Fraunces' soft, idiosyncratic letterforms (by
  design, not a rendering issue — verified against the actual shipped font
  file at a spread of settings before concluding this) didn't read as
  "clean." Source Serif 4 was picked over Lora/Newsreader/Inter after a
  direct side-by-side comparison shown to the user.
- **Headlines/captions in Watch and For You reserve right-side clearance
  (`pr-16`)** so text never runs under the vertical like/comment/save/share
  icon column — a real, confirmed-on-screen bug, not a hypothetical.

**Known, accepted constraints — not bugs to silently fix:**
- Vercel Hobby plan: 60s function timeout, daily-only native Cron Jobs.
  External cron-job.org fills the gap (see §5).
- Image fetches in `next/image` use `unoptimized` everywhere, deliberately
  (avoids Vercel's metered image-optimization cost) — don't remove this
  without discussing it; it's a cost decision, not an oversight.
- App layout is phone-width only (`max-w-md` shell in
  `src/components/AuthGate.tsx`), not responsive for tablet/desktop.
  Capacitor's iOS target is configured iPhone-only to match.

**Instruction files:** none exist (no `CLAUDE.md`, `AGENTS.md`, or
`.cursorrules` in the repo). `README.md` is the only standing project
documentation and is kept current — read it first; it has setup, env vars,
the ingestion model, and the full App Store section (§7–11).

---

## 2. Verified code status

**Repository:** `https://github.com/learossevold/Inifini-` (origin, only
remote configured).

**Branch:** `main`. Checked out and current as of this report.

**Latest local commit = latest verified remote commit** (confirmed by
`git fetch origin --prune` immediately before writing this, then comparing
`git log -1 main` to `git log -1 origin/main` — both identical):

```
8f09202b57145c17433eafbc5e10e8a10a174c06
Give /api/ingest/summarize the same diagnostic error handling as /api/ingest
Fri Oct 2 09:14:23 2026 +0000
```

**Working tree:** clean. `git status` reports "nothing to commit, working
tree clean." Only `.next/`, `node_modules/`, and `tsconfig.tsbuildinfo` are
present and untracked, all correctly gitignored.

**Uncommitted or unpushed work:** none found. Checked directly:
- `git status` — clean.
- `git log main..origin/main` / `origin/main..main` — empty both ways, branches identical.
- `git stash list` — empty.
- `git worktree list` — only the one checkout at `/home/user/Inifini-`.

**Other branches** — all three merge cleanly and are fully contained in
`main` (confirmed with `git merge-base --is-ancestor`, not assumed):
`claude/cron-watch-appstore-prep`, `claude/for-you-page-redesign-qsmjs6`,
`claude/inifini-completion-gimubg`. None carry anything `main` doesn't
already have. Safe to delete or ignore; nothing to recover from them.

**Secrets check:** `git ls-files` shows exactly one tracked file matching
env/secret/credential patterns — `.env.example`, and it contains only
variable names with placeholder or empty values (checked its full content
directly). No `.env.local`, no keys, no tokens, no credentials are tracked
anywhere in the repo at this commit.

---

## 3. Securing the work

Everything relevant was already in `main` on GitHub before this report was
written — there was nothing uncommitted or unpushed to secure. This
handover file itself is the only new file this report adds; it will be
committed to `main` as the last step of this session (see §7 for the exact
commit this lands in).

No export or patch file was needed — there was no at-risk local-only work
to package up.

---

## 4. Implementation and quality

### What's done (shipped on `main`, built and typechecked clean at `8f09202`)
- Three-way content split: Watch (full-screen swipe, narrated captions),
  News (scrolling list), For You (full-screen swipe, personalized,
  starts on an editor's-greeting page). Watch/News is a single setting
  (Profile → Settings → "Watch or read") — not two separate tabs.
- Social layer: mutual friend requests, comments (threaded, word-filtered,
  likeable), sharing a story to a friend, saves/likes, an inbox.
- Account deletion and user-blocking, both fully wired to real UI (not
  just backend functions) — see `src/app/api/account/delete/route.ts`,
  `blockUser`/`unblockUser` in `src/lib/session.tsx`, called from
  `src/components/AccountSettings.tsx` and `src/app/inbox/[userId]/page.tsx`.
- `/privacy` and `/terms` are real, written pages with a real contact
  email, not placeholders.
- PWA: manifest, all icon sizes, `apple-touch-icon.png` — "Add to Home
  Screen" on iOS already gives a full-screen launch.
- Capacitor iOS project scaffold: `capacitor.config.ts`,
  `capacitor-shell/` (the required local webDir, doubling as a real
  offline/connection-failure fallback via `server.errorPath` — confirmed
  against `@capacitor/ios`'s own Swift source for when it actually fires,
  not assumed), `src/lib/nativeStatusBar.ts` (matches the iOS status bar
  to Watch's dark background vs. the paper background elsewhere, guarded
  so it's a no-op on the plain website). `server.url` is filled in with
  the real production domain (`https://inifini-uj2c.vercel.app`,
  confirmed directly with the user). **`appId` is still the placeholder
  `com.indrearne.inifini`** — must be replaced with whatever Bundle ID
  gets registered in the Apple Developer portal.
- Two-phase ingestion (`/api/ingest` fetch-and-queue,
  `/api/ingest/summarize` AI-batch-and-publish) — code is done, built, and
  individually verified working *for the first endpoint only* (see the
  open issue below for the second).

### What's partial / open
- **`/api/ingest/summarize` returns HTTP 500 in production — unresolved,
  highest-priority open issue.** Full detail in the dedicated subsection
  below.
- **No report mechanism for comments.** What exists: a submit-time banned-word
  filter, and a personal client-side-only "Hide" (`src/components/Comments.tsx`
  — not sent anywhere, no server record). What's missing: any way for a
  reader to report a comment *to the developer*, and any moderation queue
  in `/admin` to act on one. User-*blocking* is fully built; content-*reporting*
  is not. This is a real Apple Guideline 1.2 (user-generated content) gap,
  not a nicety — documented in README §11e.
- **Native push notifications not built.** The morning-brief push exists via
  web-push/VAPID, but that path is unreliable inside a Capacitor WKWebView
  on iOS the way it is in Safari. `@capacitor/push-notifications` (APNs)
  would be the real fix; not started.
- **`npm run lint` is non-functional as shipped** — confirmed directly this
  session: no ESLint config exists anywhere in the repo (no `.eslintrc*`,
  no `eslint.config.*`), so running it launches Next.js's interactive
  "how would you like to configure ESLint?" wizard instead of linting
  anything. Not a regression from this session's work — pre-existing.
  Nobody has been running lint in CI or locally; don't assume it's been
  gating anything.
- **`UNSPLASH_ACCESS_KEY`** is read by `src/lib/rss.ts` (optional image
  enrichment, best-effort, 3s timeout, falls back to a static Pexels
  image) but is not listed in `.env.example`. Minor documentation gap,
  confirmed by grepping every `process.env.*` reference in `src/` against
  `.env.example`'s own variable list — not fixed in this session, flagged
  here instead, since touching `.env.example` wasn't necessary for the
  verification task at hand.

### `/api/ingest/summarize` 500 — full known state (read before touching this)

Reproduced live, with the user, immediately before this handover:

- **Auth works correctly.** Visiting the endpoint with no header returns
  the expected `401 {"error":"Unauthorized..."}` — confirmed directly in
  a phone browser. With the correct `x-admin-password` header (confirmed
  correct by the user, and matching what's configured in Vercel), the
  response is `500`.
- **Not a timeout.** Vercel's own request detail view (Logs tab →
  individual request) shows Execution Duration 7.03s against a 1-minute
  maximum.
- **Reaches Supabase.** The same request detail view lists 8 outbound
  calls to the Supabase REST API (`<project-ref>.supabase.co`) — 4×GET,
  4×HEAD, paired. The code's own `Promise.all` only issues 2 calls per
  invocation (1 GET for the batch select, 1 HEAD for the pending count) —
  4 of each is 2× that, consistent with the Supabase client retrying each
  request once before whatever happens next. **Not independently
  confirmed why** — plausible but unconfirmed explanations: a transient
  network issue between Vercel's `iad1` region and the Supabase project's
  region, or the query itself returning a Postgres/PostgREST-level error
  that the client retries before surfacing.
- **Vercel's "Logs" tab for this specific request shows "No logs found for
  this request."** This likely means the function did *not* crash via an
  uncaught exception (which Vercel auto-logs) — the 500 is most likely one
  of the route's own deliberate `return NextResponse.json({ error: ... },
  { status: 500 })` calls, not a framework-level crash. Given Supabase was
  actually reached, the most likely of the three such branches in the
  route is the one returning `error.message` from the initial batch-select
  query — **but the actual response body was never retrieved**, so this is
  reasoned inference, not a confirmed cause.
- **The actual error message was never seen.** This was the exact point
  the debugging session was at when it was interrupted for this handover:
  navigating deeper into Vercel's request-detail view (past "Request
  Details" → scrolling below "Response finished in 7.2s") to find the
  actual response body/payload. That step was not completed.
- **This session's own sandbox cannot reach the production domain to test
  it directly** — confirmed via the agent network proxy returning an
  explicit 403 policy denial for `inifini-uj2c.vercel.app:443`. Whether
  Codex's environment has the same restriction is unknown; if it doesn't,
  `curl -H "x-admin-password: <value>" https://inifini-uj2c.vercel.app/api/ingest/summarize`
  and reading the actual body is the fastest possible next step.
- For context: the sibling endpoint, `/api/ingest`, **was** confirmed
  fully working — a real test run returned `200 OK` in 9.17s (confirmed by
  the user via cron-job.org's own test-run feature). This uses the exact
  same `supabaseAdmin()` credential path, which is why "wrong/expired
  service role key" or "Supabase project paused" are *not* the leading
  hypotheses — that credential path demonstrably works. The failure looks
  specific to `/api/ingest/summarize`'s own query or to something timing-
  dependent, not to broad Supabase connectivity.
- The relevant code, already defensive, already deployed at this commit:
  `src/app/api/ingest/summarize/route.ts`. It has a try/catch around the
  whole handler (added in commit `8f09202`, the session's last commit)
  specifically so the *next* failure's response body contains
  `{ error, errorType, where, commit }` instead of nothing — that fix is
  live, but a fresh test run to actually read the new body was not done
  before this handover started.

### Tests actually run this session, and their results

All run directly, on `main` at commit `8f09202`, immediately before writing
this report — not inherited from an earlier point in the session:

```
$ npm install            → clean, no missing packages
$ npx tsc --noEmit        → exit 0, no errors
$ npm run build           → succeeded; all routes compiled
                            (/api/ingest/summarize present and built, confirming
                            it's in the deployed bundle)
$ npm run lint            → non-functional, see "What's partial" above —
                            not a pass or a fail, there is nothing to lint yet
```

No test suite exists in this repo (`npm test` is not a defined script, and
no `*.test.*`/`*.spec.*` files were found). This is a pre-existing
condition, not something this session removed.

### What's mock / disabled / active / published

- **Mock mode:** fully functional, zero-key. Any `src/lib/*.ts` function
  with a `supabaseAdmin()`/`supabasePublic()` null-check falls back to
  `src/lib/mock-data.ts`. This is the default experience with no env vars
  set at all.
- **Live mode:** requires `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` set in
  Vercel. **Not independently verified this session whether the live
  Supabase project currently holds any real (non-mock) published
  stories** — the only confirmed Supabase-touching success was
  `/api/ingest`'s 200 OK, which queues rows as `pending`, not published.
  Whether any rows have actually reached `status = 'published'` depends on
  `/api/ingest/summarize` working, which is the open issue above.
- **AI summarization:** Anthropic checked first, then OpenAI, else a
  structured mock summary built from the RSS excerpt alone — see
  `src/lib/summarize.ts`. Which path is active in production depends on
  which of `ANTHROPIC_API_KEY`/`OPENAI_API_KEY` is set in Vercel; not
  independently confirmed which (if either) is set.
- **Watch-tab AI narration (TTS):** optional, gated on
  `OPENAI_API_KEY_TTS`. Not confirmed whether set in production. Without
  it, Watch runs as silent animated caption cards — fully functional, just
  no voice.
- **Push notifications (morning brief):** gated on the three `VAPID_*`
  vars. Not confirmed whether set in production.
- **iOS native app:** not built, not submitted, not distributed anywhere.
  Exists only as source config in the repo (`capacitor.config.ts`,
  `capacitor-shell/`) — no `ios/` directory has ever been generated
  (requires `npm run cap:add:ios` on a machine with Xcode, which this
  session never had access to).

---

## 5. Access and external systems

**Do not assume any of the below are already connected for Codex** — each
needs to be granted/configured for that specific environment separately.
Values are never given here, only which variables exist and where they're
consumed.

| Service | What it's for | Relevant env vars (names only) |
|---|---|---|
| **GitHub** | Source of truth — `learossevold/Inifini-`, branch `main`. | — (repo access itself) |
| **Vercel** | Hosting, deployment, cron for `/api/ingest` (daily, native). Production alias confirmed by the user: `https://inifini-uj2c.vercel.app`. Account tied to `lea@indrearne.com` per prior context in this session — not independently re-verified. | reads all vars below from its own Project → Environment Variables UI |
| **Supabase** | Postgres + Auth (magic link) + Storage (Watch narration audio bucket, auto-created on first narrate run). Project ref partially visible in a Vercel log screenshot during this session (`ynlpgbywrneeeftrbxes...`) — circumstantial, not independently confirmed as current/correct; verify directly in Vercel's env var values before relying on it. | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| **Anthropic / OpenAI** | AI summarization. Either is sufficient; Anthropic is tried first. | `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` |
| **OpenAI (TTS)** | Optional Watch-tab narration audio. Separate key from the summarization one, can be a different account/tier. | `OPENAI_API_KEY_TTS` |
| **Unsplash** | Optional best-effort image enrichment for stories with no RSS image. Not in `.env.example` — see the gap noted in §4. | `UNSPLASH_ACCESS_KEY` |
| **web-push / VAPID** | Morning-brief push notification. Generate with `npx web-push generate-vapid-keys`. | `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_CONTACT_EMAIL` |
| **cron-job.org** | External scheduler, since Vercel Hobby's own Cron Jobs can't run more than once a day. **Two jobs exist, set up live during this session:** "Inifini news update" → `/api/ingest`, confirmed working (200 OK); "Inifini summarize" → `/api/ingest/summarize`, currently failing (500, see §4). Both send `x-admin-password` as a custom header. This account is the user's own cron-job.org login — Codex has no access to it; any further debugging of the cron jobs themselves (not the endpoint) needs the user again. | `ADMIN_PASSWORD` (the shared secret both cron jobs send) |
| **Apple Developer Portal / App Store Connect** | Required for the iOS App Store path (README §11c). **Not started** — no enrollment confirmed, no Bundle ID registered. `capacitor.config.ts`'s `appId` is still a placeholder pending this. | — |
| `CRON_SECRET` | Lets Vercel's own daily cron (and optionally cron-job.org) authenticate via a bearer token instead of `ADMIN_PASSWORD`. Optional — `ADMIN_PASSWORD` alone is sufficient and is what's actually configured in cron-job.org per this session. | `CRON_SECRET` |

**Nothing was changed directly in any external system's own UI during this
session that isn't already reflected in the repo** — the cron-job.org jobs
are the one exception: their configuration (URL, header, schedule) lives
only in that external account, not in this repo, and isn't version-
controlled or exportable from here. If they need to be recreated, the
exact configuration (both URLs, the header name, the schedule) is recorded
in this file above and in `README.md` §10.

---

## 6. Continuing in Codex

**Priority order:**

1. **Diagnose and fix the `/api/ingest/summarize` 500.** This blocks real
   content from ever reaching the live feed — nothing downstream of it
   matters until this works. See §4's dedicated subsection for everything
   already known and already ruled out; don't re-walk the same dead ends
   (cron-job.org's test-run popup shows no response body for a 500 — confirmed,
   don't rely on it; Vercel's "Logs" tab for the request showed nothing —
   confirmed, the useful data is in "Request Details," further down than
   this session got). **Recommended first move:** if Codex's environment
   can reach the public internet, `curl` the endpoint directly with the
   real `x-admin-password` header and read the JSON body — the try/catch
   added in `8f09202` means that body should now explain itself.
2. **Once summarize is fixed, verify the full pipeline end-to-end**: run
   `/api/ingest`, then `/api/ingest/summarize` (or wait for both
   cron-job.org jobs), then check `/admin` for `Stories` (published count)
   actually increasing and `Pending summary` actually draining — this was
   never confirmed working in this session because of the blocker above.
3. **Decide on and close the comment-report gap** (§4) before pursuing
   App Store submission — it's a specific, named rejection risk under
   Apple's Guideline 1.2, not speculative.

**Recommended concrete first task:** #1 above.

**Starting the project / verifying baseline in Codex, without unnecessary
cost:**

```bash
git clone https://github.com/learossevold/Inifini- && cd Inifini-
npm install
npx tsc --noEmit        # should exit 0, as it did in this report
npm run build            # should succeed, as it did in this report
npm run dev               # zero-key mock mode — no env vars needed to confirm the app itself runs
```

No AI key, no Supabase key, and no paid API calls are needed to confirm
the baseline — mock mode is the whole point of that fallback design (§1).
Don't spend API credits confirming the build works; `npm run dev` in mock
mode is free and sufficient for that. Reproducing the open `/api/ingest/summarize`
issue does require real Supabase + `ADMIN_PASSWORD` env vars in Vercel (or
local `.env.local`) and a real request against the deployed endpoint — see
task #1 above for why a direct `curl` is the efficient way to do that
rather than redeploying or guessing.

---

## 7. Final report

See the end-of-session message for the single copyable status block (repo,
branch, commit, verification checklist, and the three required outcome
lines).
