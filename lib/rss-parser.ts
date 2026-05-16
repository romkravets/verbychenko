/**
 * Pure RSS/XML parsing utilities — no I/O, fully unit-testable.
 */

const HTML_ENTITIES: Record<string, string> = {
  "&lt;": "<",
  "&gt;": ">",
  "&amp;": "&",
  "&quot;": '"',
  "&apos;": "'",
};

function decodeEntities(s: string): string {
  return s
    .replace(/&(?:lt|gt|amp|quot|apos);/g, (e) => HTML_ENTITIES[e] ?? e)
    .replace(/&#\d+;/g, "") // strip numeric entities (icons, emojis in HTML form)
    .trim();
}

/**
 * Extract up to `limit` headline strings from an RSS/Atom XML string.
 * Handles both plain <title> and CDATA-wrapped <title><![CDATA[...]]></title>.
 * Skips titles shorter than 10 chars (usually the channel-level <title>).
 */
export function parseXmlTitles(xml: string, limit = 5): string[] {
  const results: string[] = [];
  const items = xml.match(/<item[^>]*>[\s\S]*?<\/item>/gi) ?? [];

  for (const item of items) {
    if (results.length >= limit) break;
    const m = item.match(
      /<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i,
    );
    if (!m || !m[1]) continue;
    const title = decodeEntities(m[1]);
    if (title.length >= 10) results.push(title);
  }

  return results;
}
