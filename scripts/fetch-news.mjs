// שולף RSS ממקורות חדשות ישראליים, ממזג, מנקה ושומר כ-data/news.json סטטי.
// רץ מתוך GitHub Action (ראו .github/workflows/fetch-news.yml).
import { XMLParser } from 'fast-xml-parser';
import { writeFile, readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { sources } from './sources.mjs';

const OUTPUT_PATH = path.join(process.cwd(), 'data', 'news.json');
const KEEP_DAYS = 5; // כמה ימים אחורה לשמור ב-JSON, כדי שהקובץ לא יתנפח
const FETCH_TIMEOUT_MS = 15000;
const MAX_SUMMARY_LENGTH = 220;

const parser = new XMLParser({ ignoreAttributes: false, trimValues: true });

function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(text, maxLength) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}…`;
}

function toItemArray(maybeArray) {
  if (!maybeArray) return [];
  return Array.isArray(maybeArray) ? maybeArray : [maybeArray];
}

function parsePubDate(rawDate) {
  const parsed = new Date(rawDate);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function fetchRssSource(source) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(source.url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NewslyBot/1.0)' },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const xml = await response.text();
    const parsed = parser.parse(xml);
    const rawItems = toItemArray(parsed?.rss?.channel?.item);

    // אם אין <item> תחת rss.channel בכלל, ייתכן שהעץ שונה (Atom
    // <feed><entry>, namespace, redirect וכו') - מדפיס את תחילת ה-XML
    // הגולמי כדי לאבחן את המבנה האמיתי מה-Action logs.
    if (rawItems.length === 0) {
      console.warn(`[fetch-news] [${source.key}] 0 <item> תחת rss.channel. תחילת XML: ${xml.slice(0, 300)}`);
    }

    const items = rawItems
      .map((item) => {
        const title = stripHtml(item.title);
        const link = typeof item.link === 'string' ? item.link.trim() : '';
        const summary = truncate(stripHtml(item.description), MAX_SUMMARY_LENGTH);
        const pubDate = parsePubDate(item.pubDate);
        if (!title || !link || !pubDate) return null;
        return {
          id: `${source.key}:${link}`,
          title,
          summary,
          link,
          source: source.name,
          sourceKey: source.key,
          pubDate: pubDate.toISOString(),
        };
      })
      .filter(Boolean);

    // דיאגנוסטיקה: אם הפרסור החזיר 0 פריטים אחרי סינון למרות שה-XML
    // עצמו הכיל <item> - כנראה שדה (למשל pubDate) לא בפורמט צפוי. מדפיס
    // את הפריט הגולמי הראשון כדי לאבחן מה-Action logs בלי גישת רשת מקומית.
    if (items.length === 0 && rawItems.length > 0) {
      console.warn(
        `[fetch-news] [${source.key}] ${rawItems.length} <item> נמצאו ב-XML אך 0 עברו סינון. דוגמה: ${JSON.stringify(rawItems[0]).slice(0, 500)}`
      );
    } else if (rawItems.length > 0) {
      // בדיקת תקינות קלה: מה-Action logs אפשר לראות אם מקור מסוים מחזיר
      // תאריכים ישנים באופן עקבי (למשל feed לא-כרונולוגי) - כל הפריטים
      // שלו ייגזמו בשקט על ידי pruneOldItems בלי שזה ייראה כשגיאה.
      console.log(
        `[fetch-news] [${source.key}] ${items.length}/${rawItems.length} עברו סינון. pubDate ראשון: ${items[0]?.pubDate}`
      );
    }

    return items;
  } catch (error) {
    console.error(`[fetch-news] נכשל שליפת מקור ${source.name}: ${error.message}`);
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchAllSources() {
  const fetchers = sources.map((source) => {
    if (source.type === 'rss') return fetchRssSource(source);
    console.warn(`[fetch-news] סוג מקור לא נתמך עדיין: ${source.type} (${source.key})`);
    return Promise.resolve([]);
  });
  const results = await Promise.all(fetchers);
  return results.flat();
}

// דה-דופליקציה בסיסית לפי כותרת מנורמלת - שומר על ההופעה המוקדמת ביותר בזמן.
function dedupeByNormalizedTitle(items) {
  const seen = new Map();
  for (const item of items) {
    const key = item.title.toLowerCase().replace(/[^֐-׿a-z0-9]+/g, '');
    const existing = seen.get(key);
    if (!existing || new Date(item.pubDate) < new Date(existing.pubDate)) {
      seen.set(key, item);
    }
  }
  return [...seen.values()];
}

function pruneOldItems(items, keepDays) {
  const cutoff = Date.now() - keepDays * 24 * 60 * 60 * 1000;
  return items.filter((item) => new Date(item.pubDate).getTime() >= cutoff);
}

async function loadPreviousData() {
  try {
    const raw = await readFile(OUTPUT_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { items: [] };
  }
}

async function main() {
  const fetchedItems = await fetchAllSources();
  const previousData = await loadPreviousData();

  const merged = dedupeByNormalizedTitle([...fetchedItems, ...(previousData.items ?? [])]);
  const pruned = pruneOldItems(merged, KEEP_DAYS);
  pruned.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

  const output = {
    updatedAt: new Date().toISOString(),
    sources: sources.map(({ key, name }) => ({ key, name })),
    items: pruned,
  };

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, 'utf-8');
  console.log(`[fetch-news] נשמרו ${pruned.length} כותרות (${fetchedItems.length} נשלפו כעת).`);
}

main().catch((error) => {
  console.error('[fetch-news] שגיאה כללית:', error);
  process.exit(1);
});
