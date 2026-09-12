// הגדרת מקורות החדשות. כדי להוסיף מקור RSS חדש - פשוט מוסיפים אובייקט לרשימה.
// מקור עתידי שדורש גישה שאינה RSS (למשל scraping עם Playwright, למקור בלי
// RSS ציבורי ושלא חוסם בוטים) יכול לקבל type משלו + פונקציית fetch תואמת
// ב-fetch-news.mjs, בלי לשנות את שאר הצינור (ראו PROJECT_STATE.md).
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
];

// מקורות שנבדקו ונדחו בכוונה - ראו PROJECT_STATE.md לפרטים המלאים:
// - כלכליסט: אין RSS ציבורי (5 כתובות מנוחשות החזירו 404, ואין תג
//   <link rel="alternate" type="application/rss+xml"> בעמוד הבית).
// - N12: מוגן בפועל ע"י Radware Bot Manager - השליפה נחסמה ברמת
//   התשתית (עמוד "not a bot" עם IP/trace ID), לא בעיית סלקטור. אין
//   לנסות לעקוף מנגנון אנטי-בוט מוצהר של אתר.
