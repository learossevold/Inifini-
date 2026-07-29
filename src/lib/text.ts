/**
 * Em dashes read as a tell that a machine wrote the text, so Inifini does not
 * use them. Ordinary hyphens in compound words are untouched: "anti-government"
 * and "sign-in" are normal spelling, not a stylistic tic.
 *
 * Applied to AI output when it is generated and again when stories are read,
 * so articles already in the database are cleaned up without a re-import.
 */
export function stripEmDashes(text: string): string {
  if (!text) return text;
  return text
    // Number ranges keep a plain hyphen: "300–450" -> "300-450".
    .replace(/(\d)\s*[—–]\s*(\d)/g, '$1-$2')
    // A spaced em or en dash stands in for a comma.
    .replace(/\s+[—–]\s+/g, ', ')
    // An unspaced one between words: "word—word" -> "word, word".
    .replace(/([^\s])[—–]([^\s])/g, '$1, $2')
    // Anything left over (leading or trailing) simply goes.
    .replace(/[—–]/g, '')
    // Tidy up the punctuation the substitutions can leave behind.
    .replace(/,\s*,/g, ',')
    .replace(/\s+,/g, ',')
    .replace(/,(\s*[.!?])/g, '$1')
    .replace(/ {2,}/g, ' ')
    .trim();
}
