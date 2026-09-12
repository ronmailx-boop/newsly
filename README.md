# Newsly

מרכז חדשות ישראלי - מאגד כותרות ממספר מקורות RSS למקום אחד, עם קישור
לכתבה המקורית באתר המקור.

## מקורות פעילים

- [ynet](https://www.ynet.co.il/Integration/StoryRss2.xml)
- [וואלה](https://rss.walla.co.il/feed/1?type=main) (חדשות ראשי)
- [מעריב](https://www.maariv.co.il/rss/rssfeedschadashot) (חדשות מהארץ והעולם)

## איך זה עובד

1. GitHub Action (`.github/workflows/fetch-news.yml`) רץ כל 15 דקות,
   שולף את שלושת פידי ה-RSS במקביל.
2. `scripts/fetch-news.mjs` מנקה HTML מהתקצירים, ממזג ומדדפל כפילויות
   בסיסיות, שומר רק חדשות מ-5 הימים האחרונים, וכותב ל-`data/news.json`.
3. אם יש שינוי, ה-Action עושה commit-back ישירות לריפו.
4. הפרונט הסטטי (`index.html`, `css/style.css`, `js/app.js`) קורא את
   ה-JSON ומציג פיד עם טאבים לסינון לפי מקור.

## פיתוח מקומי

```bash
npm install
npm run fetch-news   # שולף עדכני מהמקורות ומעדכן data/news.json
```

לפתיחת הפרונט - להגיש את תיקיית השורש בכל שרת סטטי (למשל
`python3 -m http.server`) ולפתוח את `index.html`.

## מסמכים נוספים

- [`PROJECT_STATE.md`](./PROJECT_STATE.md) - סטטוס פרויקט שוטף
- [`CLAUDE.md`](./CLAUDE.md) - קונבנציות פיתוח
- [`docs/legal/`](./docs/legal/) - מסמכים משפטיים (פרטיות, תנאי שימוש,
  עוגיות, נגישות)
