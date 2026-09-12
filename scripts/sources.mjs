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
  {
    key: 'globes',
    name: 'גלובס',
    type: 'rss',
    url: 'https://www.globes.co.il/WebService/Rss/RssFeeder.asmx/FeederNode?iID=942',
  },
  {
    key: 'calcalist',
    name: 'כלכליסט',
    type: 'rss',
    // כתובת לא מאומתת ידנית (אין גישת רשת לבדיקה בסביבת הפיתוח) - נבדקת
    // מול ריצת ה-GitHub Action בפועל. אם מחזירה 0 פריטים/שגיאה, לתקן כאן.
    url: 'https://www.calcalist.co.il/GeneralRSS/0,7340,L-3695,00.xml',
  },
  {
    key: 'n12',
    name: 'N12',
    type: 'playwright',
    url: 'https://www.n12.co.il/',
    // אין RSS זמין ל-N12 - נשלף מהעמוד הראשי דרך דפדפן headless.
    // הסלקטור ב-fetch-news.mjs (fetchPlaywrightSource) הוא ניחוש מיטבי
    // ראשוני שנבדק ומתוקן מול ריצות אמיתיות של ה-Action (יש לו גישת רשת
    // אמיתית, בניגוד לסביבת הפיתוח).
  },
];
