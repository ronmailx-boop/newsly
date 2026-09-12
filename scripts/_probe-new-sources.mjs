// סקריפט זמני לאיתור כתובות RSS נכונות למקורות חדשים - יימחק אחרי אימות.
const UA = { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NewslyBot/1.0)' } };

async function probeUrl(url) {
  try {
    const res = await fetch(url, UA);
    const contentType = res.headers.get('content-type');
    const text = await res.text();
    console.log(`[probe] ${url} -> HTTP ${res.status}, content-type=${contentType}, length=${text.length}, first100=${JSON.stringify(text.slice(0, 100))}`);
    return text;
  } catch (error) {
    console.log(`[probe] ${url} -> ERROR ${error.message}`);
    return '';
  }
}

async function probeHomepageLinkTags(homepageUrl) {
  const html = await probeUrl(homepageUrl);
  const matches = [...html.matchAll(/<link[^>]+rss\+xml[^>]*>/gi)];
  console.log(`[probe] ${homepageUrl} -> ${matches.length} rss+xml <link> tags found`);
  for (const m of matches) console.log(`[probe] link tag: ${m[0]}`);
}

console.log('=== ישראל היום ===');
await probeHomepageLinkTags('https://www.israelhayom.co.il/');
await probeUrl('https://www.israelhayom.co.il/rss.xml');
await probeUrl('https://www.israelhayom.co.il/feed');
await probeUrl('https://www.israelhayom.co.il/Integration/StoryRss2.xml');

console.log('=== ביזפורטל ===');
await probeHomepageLinkTags('https://www.bizportal.co.il/');
await probeUrl('https://www.bizportal.co.il/shukhahon/rss.xml');
await probeUrl('https://www.bizportal.co.il/rss.xml');

console.log('=== דה מרקר ===');
await probeHomepageLinkTags('https://www.themarker.com/');
const rssPage = await probeUrl('https://www.themarker.com/misc/rss');
const themarkerLinks = [...rssPage.matchAll(/href="([^"]*cmlink[^"]*)"/gi)];
console.log(`[probe] themarker /misc/rss page -> ${themarkerLinks.length} cmlink hrefs found`);
for (const m of themarkerLinks.slice(0, 5)) console.log(`[probe] cmlink href: ${m[1]}`);

console.log('=== כיכר השבת (מאומת מראש) ===');
await probeUrl('https://a.kikar.co.il/v1/rss/scoop-news/latest/rss2');

console.log('=== הקול היהודי ===');
await probeHomepageLinkTags('https://www.hakolhayehudi.co.il/');
await probeUrl('https://www.hakolhayehudi.co.il/feed/');
await probeUrl('https://www.hakolhayehudi.co.il/feed');
