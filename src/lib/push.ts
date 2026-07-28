/**
 * Web Push helpers (client-side).
 *
 * Notifications are opt-in and work for signed-out readers too. On iOS the
 * browser only allows push once the app has been added to the Home Screen —
 * `pushSupported()` reflects that, so the UI can explain rather than fail.
 */

export type PushState = 'unsupported' | 'needs-install' | 'default' | 'granted' | 'denied';

// Backed by an explicit ArrayBuffer so the result satisfies BufferSource,
// which is what pushManager.subscribe expects for applicationServerKey.
function urlBase64ToUint8Array(base64: string): BufferSource {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(normalized);
  const buffer = new ArrayBuffer(raw.length);
  const out = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** iOS exposes PushManager only inside an installed (standalone) PWA. */
function isIos(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
}

export function pushState(): PushState {
  if (typeof window === 'undefined') return 'unsupported';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return isIos() && !isStandalone() ? 'needs-install' : 'unsupported';
  }
  const permission = Notification.permission;
  if (permission === 'granted') return 'granted';
  if (permission === 'denied') return 'denied';
  return 'default';
}

export function pushConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
}

/** Ask permission, subscribe, and store the subscription. Returns an error message on failure. */
export async function enablePush(): Promise<{ error?: string }> {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) return { error: 'Notifications are not configured yet.' };

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { error: permission === 'denied' ? 'Notifications are blocked in your browser settings.' : 'Notifications were not enabled.' };
    }

    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    const existing = await registration.pushManager.getSubscription();
    const subscription = existing ?? (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }));

    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(subscription.toJSON()),
    });
    if (!res.ok) return { error: 'Could not save your notification settings — try again.' };
    return {};
  } catch {
    return { error: 'Could not turn on notifications on this device.' };
  }
}

export async function disablePush(): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return;
    await fetch('/api/push/subscribe', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });
    await subscription.unsubscribe();
  } catch {
    /* already gone — nothing to undo */
  }
}

/** True when this device currently holds a push subscription. */
export async function isSubscribed(): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator)) return false;
    const registration = await navigator.serviceWorker.getRegistration();
    return Boolean(await registration?.pushManager.getSubscription());
  } catch {
    return false;
  }
}
