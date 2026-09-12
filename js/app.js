(() => {
  const DATA_URL = 'data/news.json';

  const feedEl = document.getElementById('feed');
  const statusEl = document.getElementById('status-message');
  const updatedAtEl = document.getElementById('updated-at');
  const tabButtons = document.querySelectorAll('.tab');

  let allItems = [];
  let activeSource = 'all';

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

  function createNewsCard(item) {
    const card = document.createElement('a');
    card.className = 'news-card';
    card.href = item.link;
    card.target = '_blank';
    card.rel = 'noopener noreferrer';

    const meta = document.createElement('div');
    meta.className = 'news-card__meta';

    const source = document.createElement('span');
    source.className = 'news-card__source';
    source.textContent = item.source;

    const time = document.createElement('span');
    time.className = 'news-card__time';
    time.textContent = formatRelativeTime(item.pubDate);

    meta.append(source, time);

    const title = document.createElement('h2');
    title.className = 'news-card__title';
    title.textContent = item.title;

    card.append(meta, title);

    if (item.summary) {
      const summary = document.createElement('p');
      summary.className = 'news-card__summary';
      summary.textContent = item.summary;
      card.append(summary);
    }

    return card;
  }

  function render() {
    feedEl.innerHTML = '';

    const items = activeSource === 'all'
      ? allItems
      : allItems.filter((item) => item.sourceKey === activeSource);

    if (items.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'status-message';
      empty.textContent = 'אין כותרות להצגה כרגע.';
      feedEl.append(empty);
      return;
    }

    const fragment = document.createDocumentFragment();
    for (const item of items) {
      fragment.append(createNewsCard(item));
    }
    feedEl.append(fragment);
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
      statusEl.textContent = 'לא ניתן לטעון את החדשות כרגע. בדוק/י את החיבור לאינטרנט ונסה/י שוב מאוחר יותר.';
      feedEl.innerHTML = '';
      feedEl.append(statusEl);
    }
  }

  loadNews();
})();
