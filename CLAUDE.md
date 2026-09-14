# Project Instructions for Claude Code

אנחנו עובדים דרך Claude Code. כל השינויים נכתבים ונשמרים ישירות ב-Repository.

## חוקי זיכרון והמשכיות בין שיחות (חובה)

- ניהול הזיכרון מתבצע דרך קובץ בשם `PROJECT_STATE.md` בשורש ה-Repository.
- בתחילת כל שיחה חדשה, קרא את `PROJECT_STATE.md` כדי לדעת איפה הפסקנו ומה הסטטוס הנוכחי.
- עדכון בזמן אמת: בכל פעם שאתה משלים משימה או כותב קוד, עדכן מיד את `PROJECT_STATE.md` וסמן `[x]` על המשימה שהושלמה.
- סיום שיחה: אם אגיד "ביי", "נמשיך מחר" או "תסכם" — עדכן את הסעיף "Current Focus" בקובץ עם הנקודה המדויקת שבה הפסקנו והצעד הבא לביצוע.
- ניהול Context: בסיום שלב/פיצ'ר משמעותי (ולא רק כשה-context מתמלא אוטומטית), עדכן קודם את `PROJECT_STATE.md` ואז הצע להריץ `/compact` עם הנחיה ממוקדת (למשל: שמור על רשימת הקבצים ששונו, המשימות הפתוחות וההחלטות האחרונות). אל תמתין ל-compact האוטומטי (95%) כברירת מחדל.

## כללי פיתוח, עיצוב וביצועים

- כל הקוד חייב להיות מותאם לנייד (Mobile-First).
- תמיכה מלאה בעברית ו-RTL.
- כשמבקשים ממך ליצור תוכנית עבודה (Plan), הצג רק תוכנית מפורטת ואל תבצע שינויי קוד גדולים עד לקבלת אישור מפורש.
- **עיצוב וקוד נקי:** שמור על HTML נקי וקריא. אל תוסיף ARIA attributes "כברירת מחדל" או בלי סיבה פונקציונלית ברורה — אבל כן הוסף אותם במקומות שבהם הם נדרשים בפועל לנגישות אמיתית (טפסים, כפתורי אייקון ללא טקסט, הודעות שגיאה דינמיות, מודלים, ניווט מקלדת). המטרה היא לא "לנפח" קוד סתם — לא להתעלם מנגישות אמיתית, במיוחד לאור דרישת ה-IS 5568 למטה.
- **ביצועים וניהול שגיאות:** שמור על קוד קל משקל, ותפוס שגיאות רשת/שרת עם הודעה ברורה למשתמש בעברית.
- **הודעות Commit:** תאר הודעות Commit קצרות באנגלית (למשל `feat:...`, `fix:...`).

## כללי אבטחה וסודות (Security Rules)

**חשוב: ההתייחסות שונה בין Backend לבין אפליקציות סטטיות — אל תערבב בין השניים.**

### Backend / GitHub Actions (Render, סקרייפרים, פונקציות שרת)
- לעולם אל תשתול מפתחות אבטחה, סיסמאות או API Keys בקוד הגלוי.
- השתמש במשתני סביבה: `.env` מקומי (עם `.env` ב-`.gitignore`) ו-GitHub Secrets / Render Environment Variables בפריסה.
- צור קובץ `.env.example` שמעלים ל-GitHub עם שמות המשתנים בלבד, ללא ערכים אמיתיים (למשל `FIREBASE_API_KEY=your_key_here`).

### אפליקציות סטטיות בצד-לקוח (GitHub Pages + Firebase Web SDK)
- מפתחות ה-Firebase Web SDK (`apiKey`, `authDomain` וכו') **חשופים מטבעם** בקוד הצד-לקוח — זו התנהגות תקנית של Firebase ולא פגם אבטחה.
- ההגנה האמיתית היא **Firestore/Storage Security Rules**, לא הסתרת המפתחות. אל תציע להעביר אותם ל-`.env` או ל-build step בפרויקט סטטי — זה לא רלוונטי ל-GitHub Pages.
- אם משהו כן צריך להישאר סודי אמת (מפתח API של שירות צד-שלישי בתשלום, טוקן עם הרשאות כתיבה רחבות) — הוא לא שייך לקוד קליינט בכלל, גם לא ב-`.env`; הוא צריך לעבור דרך Cloud Function / Backend.

### סניטציה ואבטחת קלט
- בצע ניקוי וסניטציה לכל קלט שמגיע מהמשתמש לפני שמירתו ב-Firebase / LocalStorage או הצגתו במסך (מניעת XSS).

## Legal & Compliance Documents

- **Location:** All legal documents must be stored in `docs/legal/`.
- **Required Files:**
  - `docs/legal/privacy-policy.md` (Privacy Policy - Israeli Law & GDPR compliant)
  - `docs/legal/terms-of-service.md` (Terms of Use)
  - `docs/legal/cookie-policy.md` (Cookie Policy)
  - `docs/legal/accessibility-statement.md` (Accessibility Statement - IS 5568 / WCAG 2.1 AA)
- **Language & Formatting:** Written in formal Hebrew, formatted in clean Markdown with placeholders like `[PLACEHOLDER]` where specific dynamic context is needed.

## Newsly - קונבנציות ספציפיות לפרויקט

- **ארכיטקטורה:** סטטי - GitHub Pages + GitHub Action שכותב
  `data/news.json` + commit-back. אין build step, אין Firebase בפרונט
  כרגע. **PWA-lite לבקשת המשתמש:** יש `manifest.json` + אייקונים +
  `sw.js` מינימלי כדי שאפשר יהיה להתקין את האתר כאפליקציה מ-Chrome/
  Android. ה-Service Worker **בכוונה לא עושה caching** ל-`data/news.json`
  (רק `fetch(event.request)` ישיר) - הנתונים חייבים תמיד להיות טריים,
  אין תמיכה באופליין. פרטים מלאים ב-`PROJECT_STATE.md`.
- **עדכון אייקון:** אם ה-לוגו/אייקון צריך להשתנות, לעדכן את
  `icons/icon-192.png` ו-`icons/icon-512.png` (אותו קובץ משמש גם
  ל-`purpose: maskable` ב-`manifest.json`, אז חשוב לשמור את התוכן בתוך
  "safe zone" מרכזי - כ-80% מהרוחב/גובה - כדי שלא ייחתך במסכות עגולות
  של אנדרואיד).
- **פריסה (Deploy):** GitHub Pages מוגדר עם Source = **GitHub Actions**
  (לא "Deploy from a branch" - זה גרם לבנייה ישנה שנתקעת ולא מתעדכנת
  אוטומטית). הפריסה עצמה קורית דרך `.github/workflows/deploy-pages.yml`,
  שרץ גם על `push` ל-`main` וגם דרך `workflow_run` אחרי שה-`Fetch news`
  workflow מסיים (כי commit-ים שנעשים עם ה-`GITHUB_TOKEN` הפנימי לא
  מפעילים workflows אחרים ב-`on: push` - הגנת GitHub מפני לולאות). **אל
  תשנה את Source חזרה ל-"Deploy from a branch"** בלי לעדכן גם את
  ה-workflow הזה.
- **אמינות ה-cron של `fetch-news.yml`:** GitHub Actions `schedule`
  triggers הם **best-effort בלבד** - GitHub מודה שתחת עומס (במיוחד סביב
  תחילת כל שעה) ריצה יכולה להתעכב בעשרות דקות או **לדלג לגמרי בלי
  הודעה**, במיוחד ב-repo עם פעילות נמוכה. נבדק בפועל ב-2026-09-13:
  במקום כל 15 דק' כמוגדר, הפערים האמיתיים בין ריצות היו 1.7-5.75 שעות.
  ה-cron הוזז ל-`7,22,37,52 * * * *` (לא על השעה/רבעי השעה העגולים -
  שם העומס הכי גבוה) כמו שממליץ GitHub - זה נשאר כגיבוי. **הפתרון
  האמיתי כבר מוקם ופעיל:** cron-job.org (חשבון חינמי של המשתמש) עם
  cronjob בשם "Newsly fetch-news trigger" שקורא כל 15 דק' (POST) ל-
  `https://api.github.com/repos/ronmailx-boop/newsly/actions/workflows/
  fetch-news.yml/dispatches` עם body `{"ref":"main"}` ו-Fine-grained
  PAT מצומצם (הרשאת "Actions: Read and write" רק על ה-repo הזה) ב-
  header `Authorization: Bearer ...`. אומת מקצה לקצה - test run החזיר
  204 ומול GitHub נראתה ריצה אמיתית (`event: workflow_dispatch`).
  הטוקן **לא** נמצא ב-repo או ב-GitHub Secrets - רק בהגדרות ה-Headers
  של הג'וב ב-cron-job.org (כי הוא מפעיל workflow מבחוץ, לא נקרא מתוכו).
  אם ה-trigger החיצוני מפסיק לעבוד מתישהו - ה-`schedule` הפנימי עדיין
  ירוץ כגיבוי (עם עיכובים אפשריים, כמתואר למעלה).
- **מקורות RSS:** מוגדרים במקום אחד - `scripts/sources.mjs`. הוספת מקור
  RSS חדש = הוספת אובייקט אחד למערך + כפתור טאב ב-`index.html`, בלי
  לגעת בלוגיקת השליפה/מיזוג.
- **`scripts/fetch-news.mjs`:** אחראי על שליפה מקבילית, ניקוי HTML
  מתקצירים, דה-דופליקציה בסיסית, גיזום לפי `KEEP_DAYS`, ומיזוג עם
  הנתונים הקיימים. אל תריץ שליפה טורית (sequential) - תמיד `Promise.all`.
  אל תוסיף תלות (dependency) כבדה לפרסור XML - `fast-xml-parser` מספיק.
- **`data/news.json`:** מקור האמת היחיד לפרונט. סכימה: `{ updatedAt,
  sources, items: [{ id, title, summary, link, source, sourceKey,
  pubDate }] }`. אל תשנה סכימה בלי לעדכן גם את `js/app.js`. `summary`
  הוא תקציר ה-RSS **במלואו** (עד תקרת בטיחות של `MAX_SUMMARY_LENGTH`
  ב-`fetch-news.mjs`, לא חתוך ל-220 תווים כפי שהיה בעבר) - זה מה שמוצג
  במסך "טקסט מלא". **בכוונה לא** גירוד (scraping) של הכתבה המלאה מהאתר
  - רק מה שהמקור עצמו חושף ב-RSS ל-syndication (ראו סעיף Reels למטה
  ולמה בפרויקט הזה).
- **פרונט:** Vanilla HTML/CSS/JS בלבד, בלי framework/bundler. תמיד
  `textContent` (לא `innerHTML`) כשמציגים תוכן שמגיע מ-JSON חיצוני, כדי
  למנוע XSS מתוכן RSS לא נקי.
- **תצוגת Reels:** הפיד הוא גלילה אנכית במסך מלא (scroll-snap), כותרת
  אחת בכל reel, עם interleaving בין מקורות ב"הכל" (כדי שה-reel הבא
  תמיד יהיה ממקור שונה - `interleaveBySource` ב-`js/app.js`). גלילה
  אוטומטית מבוססת `IntersectionObserver` (לא `scroll` events) - ה-reel
  ה"פעיל" נקבע לפי מי שנראה ב-60% מהמסך, וזה גם מה שמאפס את טיימר
  ה-autoplay (כך שגלילה ידנית וגלילה אוטומטית עוברות באותו נתיב קוד).
  מהירות ה-autoplay נשמרת ב-`localStorage` (העדפת תצוגה בלבד, לא מידע
  רגיש - תואם את כללי האבטחה למעלה). כשה-autoplay פעיל, `syncWakeLock`
  מבקש Screen Wake Lock (מונע כיבוי מסך) ומשחרר אותו כשה-autoplay כבוי
  או כשנשאר reel יחיד - progressive enhancement, לא נכשל אם לא נתמך.
- **"טקסט מלא" בתוך ה-reel:** `.reel__summary` מציג את `item.summary`
  **במלואו**, ישירות בתוך ה-reel - בלי כפתור/מודל נפרד. נבדק בפועל
  (גם עם טקסט ארוך מלאכותית לצורך בדיקה) שהתקציר המלא נכנס בנוחות בתוך
  מסך אחד; ל-`.reel` יש בכל זאת `overflow-y: auto` כרשת ביטחון למקרה
  קיצון של תקציר ארוך במיוחד שלא ייכנס. בכוונה **לא** מציג את הכתבה
  המלאה מהאתר עצמו (ראו הסבר תחת `data/news.json` למעלה) - רק את תקציר
  ה-RSS, שעכשיו לא חתוך ל-220 תווים כמו קודם.
- **מחיקת כותרת (swipe):** גלילה אופקית (ימינה או שמאלה, שתיהן - אותה
  פעולה) על reel מעבירה `translateX` ומקטינה opacity תוך כדי המגע; אם
  המרחק עובר `SWIPE_DELETE_THRESHOLD_PX` (100) נפתח `window.confirm`
  לפני שמסתירים בפועל (לא מחיקה שקטה) - ביטול = חוזר למקום. ההסתרה
  **מקומית למכשיר בלבד** (`localStorage`, מפתח `newsly:hiddenItemIds`,
  לפי `item.id`) - **לא** נוגעת ב-`data/news.json` המשותף לכולם. בכל
  טעינת נתונים, מזהים מוסתרים שכבר לא קיימים בפיד (יצאו מ-`KEEP_DAYS`)
  נגזמים מה-set כדי שהאחסון לא יגדל בלי גבול. הבחנה בין swipe אופקי
  לגלילה אנכית רגילה: `Math.abs(dx) > Math.abs(dy) * 1.5`; `touch-action:
  pan-y` על `.reel` מונע התנגשות עם מנגנון ה-scroll-snap. אחרי swipe
  אמיתי (לא הקשה) מונעים גם את פתיחת הקישור המקורי (`click` עם
  `preventDefault`, כי `.reel` הוא `<a>`). זו כוונה מוצהרת - אין UI
  נגיש-מקלדת חלופי למחיקה (המשתמש ביקש ספציפית swipe, לא כפתור).
- **בדיקות ל-Action:** אי אפשר לבדוק מול פידי ה-RSS/אתרים האמיתיים
  מסביבת הפיתוח (רשת חסומה לאתרים חיצוניים חוץ מ-npm) - יש לבדוק לוגיקה
  מול שרת HTTP מקומי מדומה, והבדיקה האמיתית מול המקורות היא הרצת
  ה-Action בפרודקשן (`workflow_dispatch`) + קריאת הלוגים שלו.
- **N12 - לא לנסות שוב עם scraping:** נבדק בפועל, מוגן ע"י Radware Bot
  Manager (חוסם headless browsers ברמת התשתית). אם ירצו N12 בעתיד, זה
  ידרוש שיתוף פעולה עם האתר (API רשמי) - לא עקיפת אנטי-בוט.
  ראו PROJECT_STATE.md לפרטים המלאים על מה שנבדק ונדחה (N12/כלכליסט/גלובס).
- **הוספת מקור שאינו RSS בעתיד:** אם יימצא מקור מתאים (בלי הגנת אנטי-בוט),
  אפשר להוסיף `type` חדש ב-`sources.mjs` + פונקציית fetch תואמת
  ב-`fetch-news.mjs` שמחזירה את אותה צורת אובייקט כמו `fetchRssSource`,
  בלי לשנות את שאר הצינור (מיזוג/דה-דופ/גיזום/מיון עובדים על כל source
  type באותה צורה).
