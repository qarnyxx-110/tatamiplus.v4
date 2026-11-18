// Progressive enhancement for the Django-backed homepage.
// Data is read from existing same-origin Django pages; no demo records are generated.
(() => {
  'use strict';

  const feeds = Array.from(document.querySelectorAll('[data-home-feed]'));

  function renderMessage(feed, title, copy, isError = false) {
    const box = document.createElement('div');
    box.className = 'tp-home-feed-empty' + (isError ? ' is-error' : '');
    if (isError) box.setAttribute('role', 'status');
    const heading = document.createElement('strong');
    heading.textContent = title;
    const paragraph = document.createElement('p');
    paragraph.textContent = copy;
    box.append(heading, paragraph);
    feed.replaceChildren(box);
  }


  async function renderReferenceProducts(feed, limit) {
    const catalogUrl = feed.dataset.referenceCatalogUrl;
    if (!catalogUrl) return false;
    const response = await fetch(catalogUrl, {
      method: 'GET',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' }
    });
    if (!response.ok) throw new Error('Reference catalogue unavailable');
    const payload = await response.json();
    const products = Array.isArray(payload.products) ? payload.products.slice(0, limit) : [];
    if (!products.length) return false;

    const list = document.createElement('div');
    list.className = 'pg tp-product-grid tp-reference-grid';
    list.setAttribute('aria-label', 'کاتالوگ مرجع بازار');

    products.forEach((product) => {
      const card = document.createElement('article');
      card.className = 'card pcd tp-product-card tp-reference-product-card';
      const media = document.createElement('div');
      media.className = 'ph r43 tp-reference-media-placeholder';
      const placeholder = document.createElement('span');
      placeholder.textContent = 'تصویر پس از تأیید مجوز منتشر می‌شود';
      media.append(placeholder);

      const body = document.createElement('div');
      body.className = 'b';
      const category = document.createElement('div');
      category.className = 'mu sm';
      category.textContent = product.category || 'تجهیزات جودو';
      const title = document.createElement('h3');
      title.textContent = product.name || 'محصول بدون نام';
      const status = document.createElement('span');
      status.className = 'tag m';
      status.textContent = 'قیمت مرجع · غیرقابل خرید';
      const price = document.createElement('div');
      price.className = 'tp-price';
      price.textContent = Number(product.reference_price || 0).toLocaleString('fa-IR') + ' تومان';
      const group = document.createElement('p');
      group.className = 'mu sm';
      group.textContent = product.group || '';
      body.append(category, title, status, price, group);
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

    try {
      if (!source || !selector) throw new Error('Missing feed configuration');
      const url = new URL(source, window.location.href);
      if (url.origin !== window.location.origin) throw new Error('Cross-origin feed blocked');

      const response = await fetch(url.href, {
        method: 'GET',
        credentials: 'same-origin',
        headers: { Accept: 'text/html' }
      });
      if (!response.ok) throw new Error('Feed request failed');

      const finalUrl = new URL(response.url, window.location.href);
      if (finalUrl.origin !== window.location.origin) throw new Error('Unexpected feed origin');

      const markup = await response.text();
      const parsed = new DOMParser().parseFromString(markup, 'text/html');
      const sourceItems = Array.from(parsed.querySelectorAll(selector)).slice(0, limit);

      if (sourceItems.length) {
        const list = document.createElement(layout === 'coaches' ? 'ul' : 'div');
        list.className = layout === 'products'
          ? 'pg tp-product-grid'
          : layout === 'courses'
            ? 'pg tp-course-grid'
            : 'tp-coaches';
        list.setAttribute('aria-label', feed.closest('section')?.querySelector('h2')?.textContent || 'محتوای تاتامی پلاس');

        sourceItems.forEach((sourceItem) => {
          const item = sourceItem.cloneNode(true);
          item.querySelectorAll('img').forEach((image) => {
            image.loading = 'lazy';
            image.decoding = 'async';
          });
          list.append(item);
        });

        feed.replaceChildren(list);
        feed.dataset.state = 'ready';
      } else if (layout === 'products' && await renderReferenceProducts(feed, limit)) {
        // The reference-only catalogue is a non-purchasable fallback when the live store has no stock.
      } else {
        const emptySelector = feed.dataset.emptySelector || '.tp-state';
        const sourceEmpty = parsed.querySelector(emptySelector);
        const sourceTitle = sourceEmpty?.querySelector('h2, b, strong')?.textContent?.trim();
        const sourceCopy = sourceEmpty?.querySelector('p')?.textContent?.trim();

        renderMessage(
          feed,
          sourceTitle || feed.dataset.emptyTitle || 'موردی برای نمایش وجود ندارد',
          sourceCopy || feed.dataset.emptyCopy || 'برای مشاهده اطلاعات بیشتر، صفحه این بخش را باز کنید.'
        );
        feed.dataset.state = 'empty';
      }
    } catch (error) {
      if (layout === 'products') {
        try {
          if (await renderReferenceProducts(feed, limit)) {
            feed.dataset.state = 'reference';
            feed.setAttribute('aria-busy', 'false');
            return;
          }
        } catch {}
      }
      renderMessage(
        feed,
        feed.dataset.errorTitle || 'محتوا فعلاً در دسترس نیست',
        feed.dataset.errorCopy || 'برای مشاهده اطلاعات، صفحه این بخش را باز کنید.',
        true
      );
      feed.dataset.state = 'error';
    } finally {
      feed.setAttribute('aria-busy', 'false');
    }
  }

  feeds.forEach(loadFeed);

  // Mirror the scroll-led .cine/.sc stack used by the original Preview shell.
  const story = document.querySelector('[data-home-cine]');
  if (story) {
    const slides = Array.from(story.querySelectorAll('.sc'));
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

    function updateStory() {
      frame = 0;
      if (reducedMotion.matches) {
        slides.forEach((slide) => {
          slide.style.opacity = '1';
          slide.style.transform = 'none';
          slide.style.pointerEvents = 'auto';
        });
        return;
      }

      const rect = story.getBoundingClientRect();
      const travel = Math.max(1, story.offsetHeight - window.innerHeight);
      const progress = clamp((-rect.top / travel) * 3, 0, 3);
      slides.forEach((slide, index) => {
        const distance = progress - (index + 0.5);
        const opacity = Math.max(0, 1 - Math.abs(distance) * 1.7);
        slide.style.opacity = String(opacity);
        slide.style.transform = 'translateY(' + (distance * -50) + 'px) scale(' + (0.92 + opacity * 0.08) + ')';
        slide.style.pointerEvents = opacity > 0.5 ? 'auto' : 'none';
      });
    }

    function scheduleStory() {
      if (!frame) frame = window.requestAnimationFrame(updateStory);
    }

    if (slides.length) {
      window.addEventListener('scroll', scheduleStory, { passive: true });
      window.addEventListener('resize', scheduleStory, { passive: true });
      reducedMotion.addEventListener?.('change', scheduleStory);
      updateStory();
    }
  }
})();