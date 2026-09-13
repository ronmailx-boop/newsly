(() => {
  const DATA_URL = 'data/news.json';
  const SPEED_STORAGE_KEY = 'newsly:autoplaySpeedSeconds';
  const DEFAULT_SPEED_SECONDS = 5;
  const VALID_SPEEDS = ['2', '5', '10', '20', 'off'];

  const reelsEl = document.getElementById('reels');
  const statusEl = document.getElementById('status-message');
  const updatedAtEl = document.getElementById('updated-at');
  const tabButtons = document.querySelectorAll('.tab');
  const settingsToggle = document.getElementById('settings-toggle');
  const settingsPanel = document.getElementById('settings-panel');
  const speedButtons = document.querySelectorAll('.speed-btn');

  const textModal = document.getElementById('text-modal');
  const textModalClose = document.getElementById('text-modal-close');
  const textModalSource = document.getElementById('text-modal-source');
  const textModalTime = document.getElementById('text-modal-time');
  const textModalTitle = document.getElementById('text-modal-title');
  const textModalBody = document.getElementById('text-modal-body');
  const textModalOriginalLink = document.getElementById('text-modal-original-link');
  let modalTriggerEl = null;

  let allItems = [];
  let visibleItems = [];
  let activeSource = 'all';
  let activeIndex = 0;
  let autoplayTimer = null;
  let observer = null;
  let speedSeconds = loadSpeedSetting();
  let wakeLock = null;

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

    // הכתבה עצמה (מטא-נתונים + כותרת + תקציר) היא קישור אחד שנפתח באתר
    // המקור - כפתור "טקסט מלא" הוא אלמנט אחות נפרד ולא מקונן בתוכו,
    // כדי לא ליצור אלמנטים אינטראקטיביים מקוננים (בעיית תקינות/נגישות).
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

    if (item.summary) {
      const expandBtn = document.createElement('button');
      expandBtn.type = 'button';
      expandBtn.className = 'reel__expand-btn';
      expandBtn.textContent = 'הצג טקסט מלא';
      expandBtn.setAttribute('aria-haspopup', 'dialog');
      expandBtn.addEventListener('click', () => openFullText(item, expandBtn));
      reel.append(expandBtn);
    }

    if (index < visibleItems.length - 1) {
      const hint = document.createElement('span');
      hint.className = 'reel__hint';
      hint.setAttribute('aria-hidden', 'true');
      hint.textContent = '▲';
      reel.append(hint);
    }

    return reel;
  }

  // מסך "טקסט מלא" - מציג את תקציר ה-RSS במלואו (כפי שהמקור עצמו סיפק
  // אותו ל-syndication) בתוך האפליקציה, בלי לצאת לכתבה המקורית. זה לא
  // "הכתבה המלאה" במובן גירוד תוכן מוגן מהאתר - רק התקציר שה-RSS כבר
  // חושף, לא חתוך יותר לתצוגה מקדימה קצרה. קישור לכתבה המקורית עדיין
  // זמין במסך הזה למי שרוצה להמשיך לאתר.
  function openFullText(item, triggerEl) {
    modalTriggerEl = triggerEl;
    textModalSource.textContent = item.source;
    textModalTime.textContent = formatRelativeTime(item.pubDate);
    textModalTitle.textContent = item.title;
    textModalBody.textContent = item.summary;
    textModalOriginalLink.href = item.link;
    textModal.hidden = false;
    stopAutoplay();
    document.addEventListener('keydown', handleModalKeydown);
    textModalClose.focus();
  }

  function closeFullText() {
    textModal.hidden = true;
    document.removeEventListener('keydown', handleModalKeydown);
    modalTriggerEl?.focus();
    modalTriggerEl = null;
    scheduleAutoplay();
  }

  function handleModalKeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeFullText();
      return;
    }
    if (event.key === 'Tab') {
      // רק שני אלמנטים ניתנים לפוקוס במודל הזה - לכידת פוקוס פשוטה
      // בלי ספרייה, כדי שטאב לא יברח מהמודל אל הפיד שמאחוריו.
      const first = textModalClose;
      const last = textModalOriginalLink;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  textModalClose.addEventListener('click', closeFullText);
  textModal.querySelector('.text-modal__backdrop').addEventListener('click', closeFullText);

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
    if (!textModal.hidden) closeFullText();
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
      allItems = data.items ?? [];

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
