/**
 * Lesson body text, safe to render.
 *
 * The console writes this field with a rich-text editor, so it arrives as HTML.
 * It is authored by an administrator, not by the public — but "the author is
 * trusted" is a policy, not a guarantee, and this string is injected into every
 * student's page. So it passes an allowlist first: the tags the editor can
 * actually produce, no attributes at all except a vetted `href`.
 *
 * Older lessons (and the seed) store plain text with newlines. `isHtml` tells
 * the caller which of the two it is holding, so plain text keeps its line breaks
 * instead of collapsing into one paragraph.
 */
const ALLOWED = new Set([
  'p', 'br', 'hr',
  'strong', 'b', 'em', 'i', 's', 'del', 'u', 'mark', 'code', 'pre',
  'blockquote', 'ul', 'ol', 'li',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'a',
]);

/** Whole elements whose CONTENT must go too, not just their tags. */
const STRIP_WITH_BODY = /<(script|style|iframe|object|embed|noscript|template|svg|math)\b[\s\S]*?<\/\1\s*>/gi;
const TAG = /<\/?([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^'">])*)>/g;
const HREF = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i;

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function sanitizeLessonHtml(input: string): string {
  return input
    .replace(STRIP_WITH_BODY, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(TAG, (whole, rawTag: string, attrs: string) => {
      const tag = rawTag.toLowerCase();
      if (!ALLOWED.has(tag)) return '';
      if (whole.startsWith('</')) return `</${tag}>`;
      if (tag === 'a') {
        const m = HREF.exec(attrs);
        const url = (m?.[1] ?? m?.[2] ?? m?.[3] ?? '').trim();
        // Only absolute web links and mail. No javascript:, no data:.
        return /^(https?:\/\/|mailto:)/i.test(url)
          ? `<a href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer nofollow">`
          : '<a>';
      }
      return `<${tag}>`;
    });
}

/** True when the value looks like markup rather than typed-in plain text. */
export function isHtml(value: string): boolean {
  return /<(p|br|ul|ol|li|h[1-6]|strong|em|blockquote|pre|code|hr|a)\b[^>]*>/i.test(value);
}
