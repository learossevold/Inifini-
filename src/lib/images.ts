/**
 * Publisher CDNs serve the same photo at any size — the width sits in the URL
 * path or query string. Feeds advertise small thumbnails, which look fine on a
 * card but fall apart stretched across a full-screen Watch card, so ask for a
 * large one.
 *
 * Applied when stories are read as well as when they are ingested, so articles
 * already in the database benefit without a migration. The transform is
 * idempotent.
 */

const WANTED_WIDTH = 1536;

/** Signed URLs break if their parameters change, so those are left alone. */
function isSigned(url: string): boolean {
  return /[?&](s|sig|signature|hash|token)=/i.test(url);
}

export function upgradeImageUrl(url: string): string {
  if (!url) return url;

  // BBC ichef: .../news/240/cpsprodpb/... — the segment after the recipe is the
  // width, and it is not signed.
  let out = url.replace(
    /(ichef\.bbci\.co\.uk\/(?:[a-z_]+\/)?[a-z_]+)\/\d{2,4}\//i,
    `$1/${WANTED_WIDTH}/`
  );

  if (isSigned(out)) return out;

  out = out.replace(/([?&])width=\d+/i, `$1width=${WANTED_WIDTH}`);
  out = out.replace(/([?&])w=\d+/i, `$1w=${WANTED_WIDTH}`);
  // WordPress-style "resize=570,380" crops the asset down — drop it entirely.
  out = out.replace(/([?&])resize=[^&]*/i, '$1');
  out = out.replace(/[?&]$/, '');

  return out;
}
