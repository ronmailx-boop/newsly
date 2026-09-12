# Project State - Newsly

## תיאור הפרויקט

מרכז חדשות ישראלי המאגד כותרות מכמה מקורות RSS למקום אחד, עם קישור לכתבה
המקורית. סטאק: GitHub Pages (פרונט סטטי) + GitHub Actions (סקרייפינג
מתוזמן) + JSON סטטי בריפו. Firebase/Render יתווספו רק כשיהיה צורך אמיתי
בבקאנד (למשל תכונות משתמש עתידיות).

## החלטות ארכיטקטורה

- **סטטי טהור בשלב זה, לא PWA.** אין Service Worker/manifest - זה מוסיף
  מורכבות (ניהול cache, גרסאות) בלי צורך אמיתי בעבודה אופליין לפיד
  חדשות. המבנה (JSON + פרונט וניל JS ללא build step) מאפשר להוסיף PWA
  בעתיד כשכבה נוספת, לא כשינוי ארכיטקטוני.
- **בלי build step בפרונט** - HTML/CSS/JS וניל ישירות ב-GitHub Pages, כדי
  שיהיה קל לערוך ולבדוק ישירות מהמובייל בלי צורך במחשב/bundler.
- **GitHub Action כותב JSON וה-commit-back ל-`data/news.json`** - בדיוק
  כמו הסקרייפר הקודם (Wizzair) שכבר קיים אצל המשתמש.

## סטטוס משימות

- [x] מבנה פרויקט (package.json, .gitignore, .env.example)
- [x] `scripts/sources.mjs` - הגדרת מקורות RSS (ynet, וואלה, מעריב),
      מובנה כך שקל להוסיף מקור RSS נוסף או מקור מסוג `playwright`
- [x] `scripts/fetch-news.mjs` - שליפה מקבילית, ניקוי HTML מתקצירים,
      דה-דופליקציה בסיסית לפי כותרת מנורמלת, גיזום לפי `KEEP_DAYS` (5
      ימים כברירת מחדל), מיזוג עם הקובץ הקודם, מיון לפי `pubDate`
- [x] נבדק מקומית מול שרת RSS מדומה (localhost) - הלוגיקה עובדת: ניקוי
      HTML, דה-דופ, גיזום, מיון. **לא נבדק מול המקורות האמיתיים** כי
      לסביבת הפיתוח הנוכחית אין גישת רשת אליהם - הריצה הראשונה בפרודקשן
      (GitHub Actions) היא הבדיקה האמיתית מול ynet/וואלה/מעריב.
- [x] `.github/workflows/fetch-news.yml` - רץ כל 15 דקות + `workflow_dispatch`
      להרצה ידנית, מבצע commit-back רק אם יש שינוי בפועל
- [x] `index.html` + `css/style.css` + `js/app.js` - פיד מובייל-first,
      RTL, ערכת נושא סגולה (#7367f0 / #7c4ddb), טאבים לסינון לפי מקור,
      טיפול בשגיאות רשת עם הודעה בעברית, כרטיסים נגישים עם `aria-live`
- [x] נבדק ויזואלית עם Playwright (מובייל 390px) - תצוגה, RTL, וסינון
      טאבים עובדים כמצופה
- [x] מסמכי `docs/legal/*` (4 קבצים) עם placeholders
- [x] `PROJECT_STATE.md` (קובץ זה)
- [ ] **פעולה נדרשת מהמשתמש:** להפעיל GitHub Pages בהגדרות הריפו (Settings
      → Pages → Deploy from branch → לבחור את הענף הרלוונטי ותיקיית
      השורש `/`)
- [ ] לוודא שה-Action הראשון רץ בהצלחה ומעדכן את `data/news.json` עם
      נתונים אמיתיים (workflow_dispatch ידני או המתנה ל-cron)

## איך מוסיפים מקור RSS חדש

1. להוסיף אובייקט חדש למערך `sources` ב-`scripts/sources.mjs`:
   `{ key, name, type: 'rss', url }`.
2. להוסיף כפתור טאב תואם ב-`index.html` (`data-source` = ה-`key`).
3. זהו - אין צורך בשינוי לוגיקה נוספת.

## איך מוסיפים מקור עתידי שדורש Playwright (למשל N12/מאקו)

1. להוסיף מקור עם `type: 'playwright'` ב-`sources.mjs`.
2. לכתוב פונקציית `fetchPlaywrightSource(source)` ב-`fetch-news.mjs`
   שמחזירה אותה צורת אובייקט (`title`, `link`, `summary`, `source`,
   `sourceKey`, `pubDate`) כמו `fetchRssSource`.
3. להוסיף את הענף המתאים ב-`fetchAllSources()`.
4. להוסיף את חבילת Playwright כ-dependency ולוודא שה-workflow מתקין
   דפדפנים (`npx playwright install --with-deps chromium`).

## דברים שלא נכנסו לגרסה הראשונה (בכוונה)

- N12/מאקו - אין RSS זמין, ידרוש Playwright (ראו הוראות למעלה).
- רוטר - פורום גולשים, לא מתאים למודל "כותרת+קישור".
- PWA (manifest + Service Worker) - לא נדרש כרגע, ראו "החלטות ארכיטקטורה".
- דה-דופליקציה מתקדמת (fuzzy matching בין ניסוחים שונים לאותו אירוע) -
  יש רק דה-דופ בסיסי לפי כותרת מנורמלת. קל להרחיב בעתיד (למשל בדיקת
  דמיון בין תקצירים) אם יתגלו הרבה כפילויות בפועל.

## Current Focus

הבנייה הראשונית של הפרויקט הושלמה (סקרייפר + Action + פרונט + מסמכים
משפטיים + ניהול פרויקט). הצעד הבא: המשתמש צריך להפעיל GitHub Pages
בהגדרות הריפו, ואז לוודא שה-Action הראשון רץ בהצלחה מול המקורות
האמיתיים (מומלץ להריץ ידנית דרך `workflow_dispatch` ולא לחכות ל-cron).
