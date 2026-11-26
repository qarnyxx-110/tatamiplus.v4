/* Live Django-backed feeds for the Preview homepage.
 * Only published coach profiles and real Django store cards are rendered.
 * Reference-market items are explicitly non-purchasable and come from the
 * existing Django reference catalog; no demo products or coach records are made.
 */
(() => {
  'use strict';

  // Django-backed homepage feeds belong only to the Preview shell. Standalone role PWAs do not expose Django /store or /coaches routes.
  const isPreviewArtifact = window.__ARTIFACT__ === true;
  const feeds = Array.from(document.querySelectorAll('[data-tp-home-feed]'));
  if (!feeds.length) return;

  if (!isPreviewArtifact) {
    feeds.forEach((feed) => {
      showMessage(feed, 'فهرست زنده در این نسخه در دسترس نیست',
        'برای مشاهدهٔ مربیان و محصولات منتشرشده، از پیش‌نمایش وب متصل به سامانه استفاده کنید.');
      feed.setAttribute('aria-busy', 'false');
    });
    return;
  }

  const numberFa = (value) => Number(value || 0).toLocaleString('fa-IR');
  const make = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = String(text);
    return node;
  };

  function showMessage(feed, title, copy, isError = false) {
    const box = make('div', 'tp-home-live-feed-empty' + (isError ? ' is-error' : ''));
    if (isError) box.setAttribute('role', 'status');
    box.append(make('strong', '', title), make('p', '', copy));
    if (isError) {
      const retry = make('button', 'btn o s', 'تلاش دوباره');
      retry.type = 'button';
      retry.addEventListener('click', () => loadFeed(feed));
      box.append(retry);
    }
    feed.replaceChildren(box);
    feed.dataset.state = isError ? 'error' : 'empty';
  }

  function serverHash(pathname, search) {
    return '#/server/' + encodeURIComponent(pathname + (search || ''));
  }

  function routeCardLinks(card, sourceUrl, layout) {
    card.querySelectorAll('a[href]').forEach((link) => {
      const raw = link.getAttribute('href');
      if (!raw) return;
      try {
        const url = new URL(raw, sourceUrl);
        if (url.origin !== window.location.origin) return;
        const isCoachProfile = layout === 'coaches' && /^\/coaches\/\d+\/?$/.test(url.pathname);
        const isStoreProduct = layout === 'products' && /^\/store\/(?!cart(?:\/|$))[^/]+\/?$/.test(url.pathname);
        if (isCoachProfile || isStoreProduct) {
          link.setAttribute('href', serverHash(url.pathname, url.search));
        }
      } catch {
        // Leave malformed or non-local links unchanged; never invent a destination.
      }
    });
    card.querySelectorAll('img').forEach((image) => {
      image.loading = 'lazy';
      image.decoding = 'async';
    });
  }

  async function renderReferenceProducts(feed, limit) {
    const catalogUrl = feed.dataset.referenceCatalogUrl;
    if (!catalogUrl) return false;

    const url = new URL(catalogUrl, window.location.origin);
    if (url.origin !== window.location.origin) return false;
    const response = await fetch(url.href, {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Accept: 'application/json' }
    });
    if (!response.ok) throw new Error('Reference catalogue unavailable');

    const payload = await response.json();
    const products = Array.isArray(payload.products) ? payload.products.slice(0, limit) : [];
    if (!products.length) return false;

    const list = make('div', 'pg tp-product-grid tp-reference-grid');
    list.setAttribute('aria-label', 'کاتالوگ مرجع بازار');

    products.forEach((product) => {
      const card = make('article', 'card pcd tp-product-card tp-reference-product-card');
      const media = make('div', 'ph r43 tp-reference-media-placeholder');
      media.append(make('span', '', 'تصویر پس از تأیید مجوز منتشر می‌شود'));

      const body = make('div', 'b');
      body.append(make('div', 'mu sm', product.category || 'تجهیزات جودو'));
      body.append(make('h3', '', product.name || 'محصول بدون نام'));
      body.append(make('span', 'tag m', 'قیمت مرجع بازار · غیرقابل خرید'));
      body.append(make('div', 'tp-price', numberFa(product.reference_price) + ' تومان'));
      if (product.group) body.append(make('p', 'mu sm', product.group));
      if (product.level) body.append(make('p', 'mu sm', 'سطح پیشنهادی ثبت‌شده: ' + product.level));
      if (product.price_date) body.append(make('p', 'mu sm', 'تاریخ مرجع قیمت: ' + product.price_date));
      card.append(media, body);
      list.append(card);
    });

    feed.replaceChildren(list);
    feed.dataset.state = 'reference';
    return true;
  }

  async function loadFeed(feed) {
    const source = feed.dataset.source;
    const selector = feed.dataset.selector;
    const layout = feed.dataset.layout;
    const limit = Math.max(1, Math.min(6, Number.parseInt(feed.dataset.limit || '3', 10) || 3));
    feed.setAttribute('aria-busy', 'true');
    feed.dataset.state = 'loading';

    try {
      if (!source || !selector || !['coaches', 'products'].includes(layout)) {
        throw new Error('Invalid live feed configuration');
      }
      const url = new URL(source, window.location.origin);
      if (url.origin !== window.location.origin) throw new Error('Cross-origin feed blocked');

      const response = await fetch(url.href, {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { Accept: 'text/html' }
      });
      if (!response.ok) throw new Error('Django feed returned HTTP ' + response.status);

      const finalUrl = new URL(response.url, window.location.href);
      const expectedPath = layout === 'coaches' ? /^\/coaches\/?$/ : /^\/store\/?$/;
      if (finalUrl.origin !== window.location.origin || !expectedPath.test(finalUrl.pathname)) {
        throw new Error('Unexpected Django feed destination');
      }

      const parsed = new DOMParser().parseFromString(await response.text(), 'text/html');
      const sourceItems = Array.from(parsed.querySelectorAll(selector)).slice(0, limit);
      if (sourceItems.length) {
        const list = make(layout === 'coaches' ? 'ul' : 'div',
          layout === 'coaches' ? 'tp-coaches tp-coach-grid' : 'pg tp-product-grid');
        list.setAttribute('aria-label', layout === 'coaches' ? 'مربیان تأییدشده تاتامی پلاس' : 'محصولات فروشگاه تاتامی پلاس');
        sourceItems.forEach((sourceItem) => {
          const item = sourceItem.cloneNode(true);
          routeCardLinks(item, finalUrl, layout);
          list.append(item);
        });
        feed.replaceChildren(list);
        feed.dataset.state = 'ready';
      } else if (layout === 'products' && await renderReferenceProducts(feed, limit)) {
        // Keep market-reference products visibly non-purchasable when the live shop has no active stock.
      } else {
        const empty = parsed.querySelector('.tp-state');
        const title = empty?.querySelector('h2, b, strong')?.textContent?.trim();
        const copy = empty?.querySelector('p')?.textContent?.trim();
        showMessage(feed,
          title || feed.dataset.emptyTitle || 'موردی برای نمایش وجود ندارد',
          copy || feed.dataset.emptyCopy || 'برای مشاهدهٔ اطلاعات بیشتر، صفحهٔ این بخش را باز کنید.');
      }
    } catch (error) {
      // A reference catalogue is shown only after a successful live-store response
      // with no purchasable products. It must never mask a server/network failure.
      showMessage(feed,
        feed.dataset.errorTitle || 'محتوا فعلاً در دسترس نیست',
        feed.dataset.errorCopy || 'برای دریافت اطلاعات واقعی، اتصال به سرور را بررسی کنید.',
        true);
      console.error('[Tatami home live feed]', layout, error);
    } finally {
      feed.setAttribute('aria-busy', 'false');
    }
  }

  function scanFeeds(root) {
    const candidates = [];
    if (root && root.nodeType === 1 && root.matches?.('[data-tp-home-feed]')) candidates.push(root);
    if (root && root.querySelectorAll) candidates.push(...root.querySelectorAll('[data-tp-home-feed]'));
    candidates.forEach((feed) => {
      if (feed.dataset.tpFeedStarted === 'true') return;
      feed.dataset.tpFeedStarted = 'true';
      loadFeed(feed);
    });
  }

  scanFeeds(document);
  const appRoot = document.querySelector('#app');
  if (appRoot && typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver((records) => {
      records.forEach((record) => record.addedNodes.forEach((node) => scanFeeds(node)));
    });
    observer.observe(appRoot, { childList: true, subtree: true });
  }
})();
