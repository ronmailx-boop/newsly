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

  let allItems = [];
  let visibleItems = [];
  let activeSource = 'all';
  let activeIndex = 0;
  let autoplayTimer = null;
  let observer = null;
  let speedSeconds = loadSpeedSetting();

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
    const reel = document.createElement('a');
    reel.className = 'reel';
    reel.href = item.link;
    reel.target = '_blank';
    reel.rel = 'noopener noreferrer';
    reel.dataset.index = String(index);

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

    reel.append(meta, title);

    if (item.summary) {
      const summary = document.createElement('p');
      summary.className = 'reel__summary';
      summary.textContent = item.summary;
      reel.append(summary);
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

  function stopAutoplay() {
    if (autoplayTimer) {
      clearTimeout(autoplayTimer);
      autoplayTimer = null;
    }
  }

  function scheduleAutoplay() {
    stopAutoplay();
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
      allItems = data.items ?? [];

      if (data.updatedAt) {
        updatedAtEl.textContent = `עודכן לאחרונה: ${new Date(data.updatedAt).toLocaleString('he-IL')}`;
      }

      render();
    } catch (error) {
      console.error('שגיאה בטעינת החדשות:', error);
      reelsEl.innerHTML = '';
      statusEl.textContent = 'לא ניתן לטעון את החדשות כרגע. בדוק/י את החיבור לאינטרנט ונסה/י שוב מאוחר יותר.';
      reelsEl.append(statusEl);
    }
  }

  loadNews();
})();
