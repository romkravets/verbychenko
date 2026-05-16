import { parseXmlTitles } from "@/lib/rss-parser";
import { describe, expect, it } from "vitest";

const SIMPLE_RSS = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>Channel Title</title>
    <item>
      <title>First headline about the war</title>
    </item>
    <item>
      <title>Second headline about economy</title>
    </item>
    <item>
      <title>Third headline about sports events</title>
    </item>
  </channel>
</rss>`;

const CDATA_RSS = `<?xml version="1.0"?>
<rss>
  <channel>
    <title>BBC Ukrainian</title>
    <item>
      <title><![CDATA[CDATA headline number one here]]></title>
    </item>
    <item>
      <title><![CDATA[CDATA headline number two here]]></title>
    </item>
  </channel>
</rss>`;

const ENTITIES_RSS = `<?xml version="1.0"?>
<rss>
  <channel>
    <item>
      <title>Ukraine &amp; Europe sign agreement &gt; 2025</title>
    </item>
    <item>
      <title>Price is &lt;100 UAH for all</title>
    </item>
  </channel>
</rss>`;

const EMPTY_RSS = `<?xml version="1.0"?>
<rss><channel><title>Feed</title></channel></rss>`;

const SHORT_TITLES_RSS = `<?xml version="1.0"?>
<rss>
  <channel>
    <item><title>Hi</title></item>
    <item><title>Ok</title></item>
    <item><title>This is long enough to pass the filter</title></item>
  </channel>
</rss>`;

describe("parseXmlTitles", () => {
  it("extracts plain text titles from items", () => {
    const result = parseXmlTitles(SIMPLE_RSS, 5);
    expect(result).toHaveLength(3);
    expect(result[0]).toBe("First headline about the war");
    expect(result[1]).toBe("Second headline about economy");
    expect(result[2]).toBe("Third headline about sports events");
  });

  it("extracts CDATA-wrapped titles", () => {
    const result = parseXmlTitles(CDATA_RSS, 5);
    expect(result).toHaveLength(2);
    expect(result[0]).toBe("CDATA headline number one here");
  });

  it("decodes HTML entities", () => {
    const result = parseXmlTitles(ENTITIES_RSS, 5);
    expect(result[0]).toContain("&");
    expect(result[0]).toContain(">");
    expect(result[1]).toContain("<");
  });

  it("respects the limit parameter", () => {
    const result = parseXmlTitles(SIMPLE_RSS, 2);
    expect(result).toHaveLength(2);
  });

  it("returns empty array for feed with no items", () => {
    expect(parseXmlTitles(EMPTY_RSS, 5)).toEqual([]);
  });

  it("skips titles shorter than 10 characters", () => {
    const result = parseXmlTitles(SHORT_TITLES_RSS, 5);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe("This is long enough to pass the filter");
  });

  it("defaults limit to 5", () => {
    // Build RSS with 10 items
    const items = Array.from(
      { length: 10 },
      (_, i) =>
        `<item><title>Headline number ${i + 1} long enough</title></item>`,
    ).join("");
    const xml = `<rss><channel>${items}</channel></rss>`;
    expect(parseXmlTitles(xml)).toHaveLength(5);
  });

  it("returns empty array for completely empty string", () => {
    expect(parseXmlTitles("", 5)).toEqual([]);
  });

  it("handles multiline CDATA content", () => {
    const xml = `<rss><channel><item><title><![CDATA[Line one
line two breaking news here]]></title></item></channel></rss>`;
    const result = parseXmlTitles(xml, 5);
    expect(result).toHaveLength(1);
    expect(result[0]).toContain("Line one");
  });
});
