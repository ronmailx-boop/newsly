(() => {
  const DATA_URL = 'data/news.json';
  const SPEED_STORAGE_KEY = 'newsly:autoplaySpeedSeconds';
  const DEFAULT_SPEED_SECONDS = 5;
  const VALID_SPEEDS = ['2', '5', '10', '20', 'off'];
  const HIDDEN_STORAGE_KEY = 'newsly:hiddenItemIds';
  const SWIPE_DELETE_THRESHOLD_PX = 100;
  const SWIPE_DIRECTION_RATIO = 1.5; // כמה שגלילה אופקית צריכה להיות דומיננטית על פני אנכית
  // API חיצוני (פרויקט נפרד, ronmailx-boop/clickbyter) שקורא כתבה במקור
  // ומחזיר את מה שכותרת הקליקבייט "מסתירה". ה-Worker כבר מוגדר לקבל
  // בקשות מ-ronmailx-boop.github.io (host בלבד, לא path) - Newsly מתארח
  // תחת אותו host אז לא נדרש שינוי בצד השרת. אין מפתח API בצד הלקוח -
  // ה-Worker הוא היחיד שמחזיק את מפתח ה-Groq.
  const CLICKBYTER_API_URL = 'https://clickbyter-api.ronmailx.workers.dev/api/decode';
  // מקורות שדפי הכתבה שלהם חסומים ע"י אנטי-בוט (נבדק בפועל - ראו
  // CLAUDE.md) - הפענוח תמיד ייכשל שם, אז אין טעם להציג את הכפתור.
  const DECODE_BLOCKED_SOURCES = new Set(['israelhayom', 'n12']);

  const reelsEl = document.getElementById('reels');
  const statusEl = document.getElementById('status-message');
  const updatedAtEl = document.getElementById('updated-at');
  const tabButtons = document.querySelectorAll('.tab');
  const settingsToggle = document.getElementById('settings-toggle');
  const settingsPanel = document.getElementById('settings-panel');
  const speedButtons = document.querySelectorAll('.speed-btn');

  const confirmDialog = document.getElementById('confirm-dialog');
  const confirmDialogDesc = document.getElementById('confirm-dialog-desc');
  const confirmDialogCancel = document.getElementById('confirm-dialog-cancel');
  const confirmDialogConfirm = document.getElementById('confirm-dialog-confirm');
  let confirmDialogResolve = null;

  let allItems = [];
  let visibleItems = [];
  let activeSource = 'all';
  let activeIndex = 0;
  let autoplayTimer = null;
  let observer = null;
  let speedSeconds = loadSpeedSetting();
  let wakeLock = null;
  let hiddenIds = loadHiddenIds();
  // תוצאות פענוח קליקבייט - זמני לסשן בלבד (לא localStorage): נמנע
  // מקריאות כפולות מיותרות ל-API בזמן שהמשתמש בפיד (למשל אחרי מעבר
  // טאבים וחזרה), בלי לצבור אחסון קבוע לתוכן שממילא יתיישן.
  const decodedAnswers = new Map();

  // מגע אופקי (swipe) למחיקת כותרת - נעקב ברמת #reels (event delegation)
  // כדי לא להוסיף 3 מאזינים לכל reel בנפרד.
  let touchStartX = 0;
  let touchStartY = 0;
  let swipingReel = null;
  let swipeDeltaX = 0;
  let isHorizontalSwipe = false;
  let suppressNextClick = false;

  function loadSpeedSetting() {
    try {
      const stored = localStorage.getItem(SPEED_STORAGE_KEY);
      return VALID_SPEEDS.includes(stored) ? stored : String(DEFAULT_SPEED_SECONDS);
    } catch {
      return String(DEFAULT_SPEED_SECONDS);
    }
  }

  function saveSpeedSetting(value) {
    try {
      localStorage.setItem(SPEED_STORAGE_KEY, value);
    } catch {
      // אחסון מקומי לא זמין (מצב פרטי וכו') - לא קריטי, פשוט לא נשמר
    }
  }

  // כותרות שהוסתרו ע"י המשתמש (swipe + אישור) - מקומי למכשיר בלבד,
  // לא נוגע ב-data/news.json המשותף. נשמר לפי item.id (מקור+קישור),
  // כך שההסתרה שורדת גם רענון עתידי של הפיד כל עוד הכתבה עדיין קיימת בו.
  function loadHiddenIds() {
    try {
      const stored = JSON.parse(localStorage.getItem(HIDDEN_STORAGE_KEY) ?? '[]');
      return new Set(Array.isArray(stored) ? stored : []);
    } catch {
      return new Set();
    }
  }

  function saveHiddenIds() {
    try {
      localStorage.setItem(HIDDEN_STORAGE_KEY, JSON.stringify([...hiddenIds]));
    } catch {
      // אחסון מקומי לא זמין - לא קריטי, פשוט לא נשמר
    }
  }

  function formatRelativeTime(isoDate) {
    const date = new Date(isoDate);
    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.round(diffMs / 60000);

    if (diffMinutes < 1) return 'עכשיו';
    if (diffMinutes < 60) return `לפני ${diffMinutes} דק'`;
    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) return `לפני ${diffHours} שע'`;
    const diffDays = Math.round(diffHours / 24);
    return `לפני ${diffDays} ימים`;
  }

  // דה-דופ/מיזוג בין מקורות שונים - מסדר כותרות ב-round-robin כדי
  // שכל reel יהיה ממקור שונה מקודמו, במקום גוש שלם מאותו אתר.
  function interleaveBySource(items) {
    const queues = new Map();
    for (const item of items) {
      if (!queues.has(item.sourceKey)) queues.set(item.sourceKey, []);
      queues.get(item.sourceKey).push(item);
    }
    const lists = [...queues.values()];
    const result = [];
    let remaining = true;
    while (remaining) {
      remaining = false;
      for (const list of lists) {
        if (list.length > 0) {
          result.push(list.shift());
          remaining = true;
        }
      }
    }
    return result;
  }

  function createReel(item, index) {
    const reel = document.createElement('div');
    reel.className = 'reel';
    reel.dataset.index = String(index);

    // הפענוח הוא אלמנט אחות (button/תוצאה) ולא מקונן בתוך <a> - כמו
    // כפתור המחיקה בעבר, כדי לא ליצור אלמנטים אינטראקטיביים מקוננים.
    if (!DECODE_BLOCKED_SOURCES.has(item.sourceKey)) {
      reel.append(buildDecodeBlock(item));
    }

    const link = document.createElement('a');
    link.className = 'reel__link';
    link.href = item.link;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';

    const meta = document.createElement('div');
    meta.className = 'reel__meta';

    const source = document.createElement('span');
    source.className = 'reel__source';
    source.textContent = item.source;

    const time = document.createElement('span');
    time.className = 'reel__time';
    time.textContent = formatRelativeTime(item.pubDate);

    meta.append(source, time);

    const title = document.createElement('h2');
    title.className = 'reel__title';
    title.textContent = item.title;

    link.append(meta, title);

    if (item.summary) {
      const summary = document.createElement('p');
      summary.className = 'reel__summary';
      summary.textContent = item.summary;
      link.append(summary);
    }

    reel.append(link);

    if (index < visibleItems.length - 1) {
      const hint = document.createElement('span');
      hint.className = 'reel__hint';
      hint.setAttribute('aria-hidden', 'true');
      hint.textContent = '▲';
      reel.append(hint);
    }

    return reel;
  }

  // "מה הכותרת מסתירה?" - קורא ל-Clickbyter (פרויקט נפרד) על פי דרישה
  // בלבד, אף פעם לא אוטומטית לכל הפיד: כל קריאה שולפת כתבה מלאה מהאתר
  // המקורי ומריצה מודל AI בצד השרת שלהם - יקר/איטי מדי לעשות לכל כותרת.
  function buildDecodeBlock(item) {
    const wrap = document.createElement('div');
    wrap.className = 'reel__decode';
    wrap.setAttribute('aria-live', 'polite');
    const cached = decodedAnswers.get(item.id);
    if (cached) {
      showDecodeResult(wrap, item, cached);
    } else {
      showDecodeButton(wrap, item);
    }
    return wrap;
  }

  function showDecodeButton(wrap, item) {
    wrap.replaceChildren();
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'reel__decode-btn';
    btn.textContent = '🔍 קליקבייט? לחץ כאן';
    btn.addEventListener('click', () => runDecode(wrap, item));
    wrap.append(btn);
  }

  function showDecodeLoading(wrap) {
    wrap.replaceChildren();
    const loading = document.createElement('p');
    loading.className = 'reel__decode-loading';
    loading.textContent = 'מפענח...';
    wrap.append(loading);
  }

  function showDecodeResult(wrap, item, result) {
    wrap.replaceChildren();
    if (result.ok) {
      const answer = document.createElement('p');
      answer.className = 'reel__decode-answer';
      answer.textContent = result.text;
      wrap.append(answer);
      return;
    }
    const errorWrap = document.createElement('div');
    errorWrap.className = 'reel__decode-error';
    const msg = document.createElement('span');
    msg.textContent = result.text;
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'reel__decode-retry';
    retry.textContent = 'נסה שוב';
    retry.addEventListener('click', () => {
      decodedAnswers.delete(item.id);
      showDecodeButton(wrap, item);
    });
    errorWrap.append(msg, retry);
    wrap.append(errorWrap);
  }

  function decodeErrorMessage(code) {
    switch (code) {
      case 'FETCH_FAILED':
        return 'לא הצלחנו לגשת לכתבה המקורית.';
      case 'EXTRACTION_FAILED':
        return 'לא הצלחנו לחלץ טקסט קריא מהכתבה הזו.';
      case 'RATE_LIMITED':
        return 'יותר מדי בקשות כרגע - נסו שוב בעוד רגע.';
      case 'LLM_TIMEOUT':
        return 'הפענוח ארך יותר מדי זמן - נסו שוב.';
      case 'SERVER_MISCONFIGURED':
        return 'שירות הפענוח לא זמין כרגע.';
      default:
        return 'לא הצלחנו לפענח את הכתבה הזו.';
    }
  }

  async function runDecode(wrap, item) {
    showDecodeLoading(wrap);
    let result;
    try {
      const response = await fetch(CLICKBYTER_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: item.link }),
      });
      const data = await response.json();
      result = data.error
        ? { ok: false, text: decodeErrorMessage(data.error) }
        : { ok: true, text: data.answer };
    } catch {
      result = { ok: false, text: 'שגיאת רשת - נסו שוב.' };
    }
    decodedAnswers.set(item.id, result);
    showDecodeResult(wrap, item, result);
  }

  // מסך אישור מעוצב (במקום window.confirm הדפדפני) - מחזיר Promise<boolean>.
  function askConfirmDelete(title) {
    return new Promise((resolve) => {
      confirmDialogResolve = resolve;
      confirmDialogDesc.textContent = `"${title}" - היא לא תוצג יותר בפיד שלך במכשיר הזה.`;
      confirmDialog.hidden = false;
      document.addEventListener('keydown', handleConfirmDialogKeydown);
      confirmDialogCancel.focus();
    });
  }

  function closeConfirmDialog(result) {
    confirmDialog.hidden = true;
    document.removeEventListener('keydown', handleConfirmDialogKeydown);
    confirmDialogResolve?.(result);
    confirmDialogResolve = null;
  }

  function handleConfirmDialogKeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeConfirmDialog(false);
      return;
    }
    if (event.key === 'Tab') {
      // רק שני כפתורים ניתנים לפוקוס במסך הזה - לכידת פוקוס פשוטה
      const first = confirmDialogCancel;
      const last = confirmDialogConfirm;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  confirmDialogCancel.addEventListener('click', () => closeConfirmDialog(false));
  confirmDialogConfirm.addEventListener('click', () => closeConfirmDialog(true));
  confirmDialog.querySelector('.confirm-dialog__backdrop').addEventListener('click', () => closeConfirmDialog(false));

  // מבקש אישור ומסתיר כותרת לצמיתות (במכשיר הזה) אחרי swipe אופקי.
  async function confirmAndDeleteReel(item, reelEl) {
    stopAutoplay();
    const confirmed = await askConfirmDelete(item.title);
    if (!confirmed) {
      reelEl.style.transform = '';
      scheduleAutoplay();
      return;
    }
    hiddenIds.add(item.id);
    saveHiddenIds();
    allItems = allItems.filter((existing) => existing.id !== item.id);
    render();
  }

  reelsEl.addEventListener(
    'touchstart',
    (event) => {
      const reel = event.target.closest('.reel');
      if (!reel) return;
      touchStartX = event.touches[0].clientX;
      touchStartY = event.touches[0].clientY;
      swipingReel = reel;
      swipeDeltaX = 0;
      isHorizontalSwipe = false;
    },
    { passive: true }
  );

  reelsEl.addEventListener(
    'touchmove',
    (event) => {
      if (!swipingReel) return;
      const dx = event.touches[0].clientX - touchStartX;
      const dy = event.touches[0].clientY - touchStartY;
      if (!isHorizontalSwipe && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * SWIPE_DIRECTION_RATIO) {
        isHorizontalSwipe = true;
        swipingReel.classList.add('is-swiping');
      }
      if (isHorizontalSwipe) {
        swipeDeltaX = dx;
        swipingReel.style.transform = `translateX(${dx}px)`;
        swipingReel.style.opacity = String(Math.max(0.3, 1 - Math.abs(dx) / 300));
      }
    },
    { passive: true }
  );

  reelsEl.addEventListener(
    'touchend',
    () => {
      if (swipingReel && isHorizontalSwipe) {
        const reel = swipingReel;
        reel.classList.remove('is-swiping');
        reel.style.opacity = '';
        suppressNextClick = true;
        if (Math.abs(swipeDeltaX) > SWIPE_DELETE_THRESHOLD_PX) {
          const index = Number(reel.dataset.index);
          confirmAndDeleteReel(visibleItems[index], reel);
        } else {
          reel.style.transform = '';
        }
      }
      swipingReel = null;
      isHorizontalSwipe = false;
      swipeDeltaX = 0;
    },
    { passive: true }
  );

  // מונע פתיחת הקישור המקורי כשמה שקרה בפועל היה swipe (לא הקשה).
  reelsEl.addEventListener('click', (event) => {
    if (suppressNextClick) {
      event.preventDefault();
      suppressNextClick = false;
    }
  });

  function stopAutoplay() {
    if (autoplayTimer) {
      clearTimeout(autoplayTimer);
      autoplayTimer = null;
    }
  }

  // מונע כיבוי מסך אוטומטי בזמן גלילה אוטומטית (Screen Wake Lock API) -
  // נתמך ברוב הדפדפנים המודרניים; אם לא נתמך, פשוט לא עושה כלום
  // (הגלילה האוטומטית עצמה ממשיכה לעבוד כרגיל).
  async function requestWakeLock() {
    if (wakeLock || !('wakeLock' in navigator)) return;
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => {
        wakeLock = null;
      });
    } catch {
      // נכשל (למשל הדפדפן דורש שהדף יהיה גלוי/בפוקוס) - לא קריטי
    }
  }

  function releaseWakeLock() {
    wakeLock?.release();
    wakeLock = null;
  }

  function syncWakeLock() {
    if (speedSeconds === 'off' || visibleItems.length <= 1) {
      releaseWakeLock();
    } else {
      requestWakeLock();
    }
  }

  // המערכת משחררת את ה-wake lock אוטומטית כשהדף לא גלוי (למשל מעבר
  // אפליקציה) - צריך לבקש אותו מחדש כשחוזרים אליו.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      syncWakeLock();
    }
  });

  function scheduleAutoplay() {
    stopAutoplay();
    syncWakeLock();
    if (speedSeconds === 'off') return;
    if (visibleItems.length <= 1) return;
    autoplayTimer = setTimeout(() => {
      const nextIndex = (activeIndex + 1) % visibleItems.length;
      const nextEl = reelsEl.querySelector(`.reel[data-index="${nextIndex}"]`);
      nextEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, Number(speedSeconds) * 1000);
  }

  function setupObserver() {
    observer?.disconnect();
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            const index = Number(entry.target.dataset.index);
            if (index !== activeIndex) {
              activeIndex = index;
            }
            scheduleAutoplay();
          }
        }
      },
      { root: reelsEl, threshold: 0.6 }
    );
    reelsEl.querySelectorAll('.reel').forEach((el) => observer.observe(el));
  }

  function render() {
    stopAutoplay();
    observer?.disconnect();
    reelsEl.innerHTML = '';
    activeIndex = 0;

    visibleItems = activeSource === 'all'
      ? interleaveBySource(allItems)
      : allItems.filter((item) => item.sourceKey === activeSource);

    if (visibleItems.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'status-message';
      empty.textContent = 'אין כותרות להצגה כרגע.';
      reelsEl.append(empty);
      return;
    }

    const fragment = document.createDocumentFragment();
    visibleItems.forEach((item, index) => {
      fragment.append(createReel(item, index));
    });
    reelsEl.append(fragment);
    reelsEl.scrollTop = 0;

    setupObserver();
    scheduleAutoplay();
  }

  function setActiveTab(sourceKey) {
    activeSource = sourceKey;
    tabButtons.forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.source === sourceKey);
    });
    render();
  }

  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => setActiveTab(btn.dataset.source));
  });

  function setSpeed(value) {
    speedSeconds = value;
    saveSpeedSetting(value);
    speedButtons.forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.speed === value);
    });
    scheduleAutoplay();
  }

  speedButtons.forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.speed === speedSeconds);
    btn.addEventListener('click', () => setSpeed(btn.dataset.speed));
  });

  settingsToggle.addEventListener('click', () => {
    const isOpen = !settingsPanel.hidden;
    settingsPanel.hidden = isOpen;
    settingsToggle.setAttribute('aria-expanded', String(!isOpen));
  });

  // עצירת הטיימר תוך כדי מגע - כדי לא "לקפוץ" reel באמצע גלילה ידנית.
  // ה-IntersectionObserver יתזמן מחדש ברגע שהגלילה מתייצבת על reel כלשהו.
  reelsEl.addEventListener('touchstart', stopAutoplay, { passive: true });

  async function loadNews() {
    try {
      const response = await fetch(`${DATA_URL}?t=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      const fetchedItems = data.items ?? [];

      // גיזום מזהים מוסתרים שכבר לא קיימים בפיד (אף פעם לא יופיעו שוב) -
      // כדי שה-localStorage לא יגדל בלי גבול עם הזמן.
      const fetchedIds = new Set(fetchedItems.map((item) => item.id));
      const prunedHidden = new Set([...hiddenIds].filter((id) => fetchedIds.has(id)));
      if (prunedHidden.size !== hiddenIds.size) {
        hiddenIds = prunedHidden;
        saveHiddenIds();
      }

      allItems = fetchedItems.filter((item) => !hiddenIds.has(item.id));

      if (data.updatedAt) {
        updatedAtEl.textContent = `עודכן לאחרונה: ${new Date(data.updatedAt).toLocaleString('he-IL')}`;
      }

      render();
    } catch (error) {
      console.error('שגיאה בטעינת החדשות:', error);
      reelsEl.innerHTML = '';

      const wrapper = document.createElement('div');
      wrapper.className = 'status-message';
      wrapper.style.flexDirection = 'column';
      wrapper.style.gap = '12px';

      const message = document.createElement('p');
      message.style.margin = '0';
      message.textContent = 'לא ניתן לטעון את החדשות כרגע. בדוק/י את החיבור לאינטרנט ונסה/י שוב מאוחר יותר.';

      const detail = document.createElement('p');
      detail.style.margin = '0';
      detail.style.fontSize = '0.75rem';
      detail.style.color = 'var(--color-text-muted)';
      detail.textContent = `פרטים טכניים: ${error.name}: ${error.message}`;

      const retryBtn = document.createElement('button');
      retryBtn.type = 'button';
      retryBtn.className = 'tab';
      retryBtn.textContent = 'נסה שוב';
      retryBtn.addEventListener('click', () => {
        reelsEl.innerHTML = '';
        reelsEl.append(statusEl);
        statusEl.textContent = 'טוען כותרות...';
        loadNews();
      });

      wrapper.append(message, detail, retryBtn);
      reelsEl.append(wrapper);
    }
  }

  loadNews();

  // רישום Service Worker - נדרש כדי שכרום יציע התקנת האפליקציה (PWA).
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch((error) => {
      console.warn('רישום Service Worker נכשל:', error);
    });
  }
})();
