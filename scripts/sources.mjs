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
    key: 'israelhayom',
    name: 'ישראל היום',
    type: 'rss',
    url: 'https://www.israelhayom.co.il/rss.xml',
  },
  {
    key: 'kikar',
    name: 'כיכר השבת',
    type: 'rss',
    url: 'https://a.kikar.co.il/v1/rss/scoop-news/latest/rss2',
  },
  {
    key: 'hakolhayehudi',
    name: 'הקול היהודי',
    type: 'rss',
    // הפיד הזה כבד (כ-8MB, כנראה ארכיון גדול לא רק חדשות אחרונות) -
    // הפרסור/גיזום שלנו מטפלים בזה כרגיל, רק לוקח קצת יותר זמן בריצה.
    url: 'https://www.hakolhayehudi.co.il/rss/news',
  },
];

// מקורות שנבדקו ונדחו בכוונה - ראו PROJECT_STATE.md לפרטים המלאים:
// - גלובס: iID=942 (שהיה מאונדקס כ-"Front - Globes") מחזיר XML תקין
//   אבל עם כותרות שלא מתעדכנות בזמן אמת - הריצות השונות החזירו תאריכים
//   ישנים ומשתנים (3 בספטמבר, ואז 31 באוגוסט בריצה מאוחרת יותר) - נראה
//   שזה לא הפיד הכרונולוגי הנכון. לא הצלחתי לאתר את ה-iID הנכון
//   אוטומטית מתוך https://www.globes.co.il/news/RSS.tag (בלי גישת רשת
//   ישירה מסביבת הפיתוח, וניתוח ה-HTML האוטומטי לא היה חד-משמעי).
// - כלכליסט: אין RSS ציבורי (5 כתובות מנוחשות החזירו 404, ואין תג
//   <link rel="alternate" type="application/rss+xml"> בעמוד הבית).
// - N12: מוגן בפועל ע"י Radware Bot Manager - השליפה נחסמה ברמת
//   התשתית (עמוד "not a bot" עם IP/trace ID), לא בעיית סלקטור. אין
//   לנסות לעקוף מנגנון אנטי-בוט מוצהר של אתר.
// - ביזפורטל: 403 על כל נתיב שנוסה, כולל דף הבית הרגיל - נראה כמו
//   הגנת WAF/אנטי-בוט (תבנית עמוד חסימה טיפוסית ל-Incapsula/Imperva).
//   לא ניסיתי לעקוף.
// - דה מרקר: 403 על כל נתיב, כולל דף הבית - אותה תבנית חסימה כמו
//   ביזפורטל. לא ניסיתי לעקוף.
