// סקריפט זמני לאיתור ה-iID הנכון של פיד "כל החדשות" בגלובס - יימחק אחרי אימות.
const url = 'https://www.globes.co.il/news/RSS.tag';
const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NewslyBot/1.0)' } });
const html = await res.text();
console.log(`[probe] ${url} -> HTTP ${res.status}, length=${html.length}`);
const matches = [...html.matchAll(/iID=(\d+)[^"']*["'][^>]*>([^<]{0,60})/gi)];
for (const m of matches.slice(0, 20)) {
  console.log(`[probe] iID=${m[1]} label="${m[2].trim()}"`);
}
if (matches.length === 0) {
  console.log(`[probe] no iID matches, first 500 chars: ${html.slice(0, 500)}`);
}
