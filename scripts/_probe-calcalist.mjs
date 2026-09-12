// סקריפט זמני לאבחון כתובת RSS נכונה לכלכליסט - יימחק אחרי שהכתובת תאומת.
const candidates = [
  'https://www.calcalist.co.il/GeneralRSS/0,7340,L-3695,00.xml',
  'https://www.calcalist.co.il/GeneralRSS/0,7340,L-8,00.xml',
  'https://www.calcalist.co.il/integration/StoryRss2.xml',
  'https://www.calcalist.co.il/Integration/StoryRss2.xml',
  'https://www.calcalist.co.il/rss/0,7340,L-8,00.xml',
];

for (const url of candidates) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NewslyBot/1.0)' } });
    const contentType = res.headers.get('content-type');
    const text = await res.text();
    console.log(`[probe] ${url} -> HTTP ${res.status}, content-type=${contentType}, first120=${JSON.stringify(text.slice(0, 120))}`);
  } catch (error) {
    console.log(`[probe] ${url} -> ERROR ${error.message}`);
  }
}

// חיפוש תג <link rel="alternate" type="application/rss+xml"> בעמוד הבית -
// זו הדרך התקנית שבה אתרים מכריזים על כתובת ה-RSS שלהם, אמינה יותר
// מניחוש דפוסי URL.
try {
  const homepageUrl = 'https://www.calcalist.co.il/';
  const res = await fetch(homepageUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NewslyBot/1.0)' } });
  const html = await res.text();
  const matches = [...html.matchAll(/<link[^>]+rss\+xml[^>]*>/gi)];
  console.log(`[probe] ${homepageUrl} -> HTTP ${res.status}, ${matches.length} rss+xml <link> tags found`);
  for (const m of matches) console.log(`[probe] link tag: ${m[0]}`);
} catch (error) {
  console.log(`[probe] homepage rss+xml search -> ERROR ${error.message}`);
}
