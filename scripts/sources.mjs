// הגדרת מקורות החדשות. כדי להוסיף מקור RSS חדש - פשוט מוסיפים אובייקט לרשימה.
// מקורות עתידיים שדורשים גישה שאינה RSS (למשל N12/מאקו עם Playwright) יקבלו
// type: 'playwright' ופונקציית fetch משלהם ב-fetch-news.mjs, בלי לשנות את שאר הצינור.
export const sources = [
  {
    key: 'ynet',
    name: 'ynet',
    type: 'rss',
    url: 'https://www.ynet.co.il/Integration/StoryRss2.xml',
  },
  {
    key: 'walla',
    name: 'וואלה',
    type: 'rss',
    url: 'https://rss.walla.co.il/feed/1?type=main',
  },
  {
    key: 'maariv',
    name: 'מעריב',
    type: 'rss',
    url: 'https://www.maariv.co.il/rss/rssfeedschadashot',
  },
];
