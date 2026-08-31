import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Wraps the EXISTING, already-deployed Next.js app (server.url below) rather
 * than bundling a static export inside the app binary. That choice is what
 * makes this setup possible without touching a single line of the app
 * itself: Inifini's server routes (/api/stories, /api/ingest*, /api/push/*,
 * /api/account/delete), its `export const dynamic = 'force-dynamic'` routes,
 * and Supabase magic-link auth all depend on running against a real server —
 * none of that survives `next export`'s static-only output. The trade-off is
 * an internet connection is required to open the app (true of the web app
 * today anyway), in exchange for zero app-side rewrite and every future
 * `git push` to main shipping to the native app too, with no separate native
 * release for ordinary content/feature changes — only capacitor.config.ts
 * itself or a native plugin change ever needs a new App Store build.
 *
 * webDir points at a tiny local page, not the app itself — Capacitor's own
 * CLI refuses to build without a webDir containing an index.html, even in
 * remote-URL mode, so something has to live there regardless. What it's
 * actually FOR: server.errorPath below makes it Capacitor's fallback for
 * exactly one situation — the WebView failing to load or navigate to
 * server.url at all (no connection, DNS failure, the server being down).
 * Confirmed directly against @capacitor/ios's own source
 * (WebViewDelegationHandler.swift's didFail/didFailProvisionalNavigation,
 * which is where errorPathURL gets loaded) rather than assumed: it is NOT
 * shown as a pre-load splash — with server.url set, the WebView navigates
 * straight to it, no local page in between. That gap is the native splash
 * screen's job instead (see the SplashScreen plugin config below). See
 * capacitor-shell/index.html for what the error page actually does.
 *
 * REQUIRED before this can build for real, both marked below:
 *  1. `appId` — must match the Bundle ID you register for this app in the
 *     Apple Developer portal. The value here is a placeholder.
 *  2. `server.url` — must be Inifini's real production domain. The value
 *     here is a placeholder pointed at nothing.
 */
const config: CapacitorConfig = {
  // PLACEHOLDER — replace with the Bundle ID you register in the Apple
  // Developer portal (Certificates, IDs & Profiles → Identifiers). Reverse-DNS,
  // must exactly match on both sides or Xcode code signing fails.
  appId: 'com.indrearne.inifini',
  appName: 'Inifini',
  webDir: 'capacitor-shell',
  server: {
    // PLACEHOLDER — replace with the real production URL (the domain the
    // Vercel deployment actually serves from). Everything the app does reads
    // from here at runtime; getting this wrong means a blank or broken app,
    // not a build error, so it is easy to miss until you're holding a phone.
    url: 'https://your-production-domain.example',
    // HTTPS only — Apple's App Transport Security blocks plain HTTP by
    // default anyway, and there's no reason to weaken that here.
    cleartext: false,
    // Shown in place of a native WKWebView error page (which would read as
    // "this app is broken", not "you're offline") whenever the WebView can't
    // load or navigate to server.url at all — see the webDir comment above
    // for how this was actually confirmed, not assumed. Relative to webDir.
    errorPath: 'index.html',
  },
  ios: {
    // The WebView's own background while `server.url` is loading, so the
    // instant between the native splash screen and the site painting
    // reads as a continuation of it rather than a flash of white — matches
    // the paper background the app boots into everywhere else.
    backgroundColor: '#FCFCFD',
    // Card cards touch the physical screen edges by design (Watch, For You);
    // letting the app draw under the status bar/notch itself, rather than
    // Capacitor reserving a native bar for it, keeps that intact instead of
    // adding a second, redundant safe-area inset the web CSS already handles.
    contentInset: 'never',
  },
  plugins: {
    SplashScreen: {
      // The web app's own Splash component already fades in on load (see
      // src/components/Splash.tsx) — this native one only needs to cover the
      // gap before the WebView has anything to paint at all, so it hands off
      // quickly rather than holding the screen and effectively double-
      // splashing the reader.
      launchShowDuration: 400,
      launchAutoHide: true,
      backgroundColor: '#FCFCFD',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    StatusBar: {
      // Matches the paper background every screen boots into. Capacitor's
      // Style enum names the icon color scheme it produces, not the
      // background it's meant for — Style.Light genuinely means "dark
      // icons", which is what a light background needs, and it is easy to
      // get this backwards (confirmed against @capacitor/status-bar's own
      // type definitions before setting this). Watch is the one screen with
      // a dark background instead, and switches this itself at runtime —
      // see src/lib/nativeStatusBar.ts and its call site in Feed.tsx, since
      // a value set here once at launch can't follow the reader between tabs.
      style: 'LIGHT', // dark icons, for this light paper background
      backgroundColor: '#FCFCFD',
    },
  },
};

export default config;
