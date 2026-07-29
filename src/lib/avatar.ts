import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Profile pictures.
 *
 * Phone cameras produce several megabytes per shot, so the image is squared
 * off and scaled down in the browser before upload. The file is stored under a
 * folder named for the owner's id, which is what the storage policies check.
 */

const SIZE = 512;
const MAX_INPUT_BYTES = 12 * 1024 * 1024;

/** Centre-crop to a square and scale to SIZE, returning a JPEG blob. */
function squareResize(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const side = Math.min(img.width, img.height);
      const sx = (img.width - side) / 2;
      const sy = (img.height - side) / 2;

      const canvas = document.createElement('canvas');
      canvas.width = SIZE;
      canvas.height = SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('no canvas')); return; }
      ctx.drawImage(img, sx, sy, side, side, 0, 0, SIZE, SIZE);

      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('encode failed'))),
        'image/jpeg',
        0.85
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('not an image')); };
    img.src = url;
  });
}

export async function uploadAvatar(
  db: SupabaseClient, userId: string, file: File
): Promise<{ url?: string; error?: string }> {
  if (!file.type.startsWith('image/')) return { error: 'Choose an image file.' };
  if (file.size > MAX_INPUT_BYTES) return { error: 'That image is too large. Try one under 12 MB.' };

  let blob: Blob;
  try {
    blob = await squareResize(file);
  } catch {
    return { error: 'That image could not be read. Try another one.' };
  }

  // A fixed name per user keeps one picture each; the query string busts caches.
  const path = `${userId}/avatar.jpg`;
  const { error } = await db.storage.from('avatars').upload(path, blob, {
    contentType: 'image/jpeg',
    upsert: true,
  });
  if (error) return { error: 'Could not upload the picture. Try again.' };

  const { data } = db.storage.from('avatars').getPublicUrl(path);
  return { url: `${data.publicUrl}?v=${Date.now()}` };
}

export async function removeAvatar(db: SupabaseClient, userId: string): Promise<void> {
  await db.storage.from('avatars').remove([`${userId}/avatar.jpg`]);
}
