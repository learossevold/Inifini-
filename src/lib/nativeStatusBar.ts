import { Capacitor } from '@capacitor/core';

/**
 * Matches the iOS status bar's icon color to which tab is on screen: dark
 * icons over the paper background everywhere, light icons while Watch's
 * dark full-screen feed is open. Only meaningful inside the native wrapper
 * (see capacitor.config.ts) — @capacitor/status-bar has no web
 * implementation at all, so calling it on the plain website (capacitor.io's
 * own registerPlugin throws "plugin is not implemented on web" for any
 * plugin with none) rather than quietly doing nothing. isNativePlatform()
 * is what keeps this a no-op there instead of a thrown exception on every
 * tab switch.
 *
 * Dynamically imported, not imported at module scope: @capacitor/status-bar
 * pulls in @capacitor/core's native bridge machinery, which has no reason to
 * be in the bundle a plain browser downloads at all when it's going straight
 * to be skipped by the isNativePlatform() check below.
 */
export async function setNativeStatusBarStyle(style: 'light' | 'dark'): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    // Capacitor's Style enum names the icon color it produces, not the
    // background it suits — Style.Light means dark icons (for a light
    // background), Style.Dark means light icons (for a dark one). See the
    // definitions.d.ts doc comments; easy to get backwards.
    await StatusBar.setStyle({ style: style === 'dark' ? Style.Dark : Style.Light });
  } catch {
    // Best-effort polish — never worth breaking a tab switch over.
  }
}
