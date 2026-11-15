// Progressive enhancement for the Django-backed homepage feeds.
(() => {
  'use strict';

  const feeds = Array.from(document.querySelectorAll('[data-home-feed]'));
  if (!feeds.length) return;

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
        const list = document.createElement('div');
        list.className = layout === 'products' ? 'product-grid' : 'coach-list';
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
      } else {
        const emptySelector = feed.dataset.emptySelector || '.empty-state';
        const sourceEmpty = parsed.querySelector(emptySelector);
        const sourceTitle = sourceEmpty?.querySelector('h2')?.textContent?.trim();
        const sourceCopy = sourceEmpty?.querySelector('p')?.textContent?.trim();
        renderMessage(
          feed,
          sourceTitle || feed.dataset.emptyTitle || 'موردی برای نمایش وجود ندارد',
          sourceCopy || feed.dataset.emptyCopy || 'برای مشاهده اطلاعات بیشتر، صفحه این بخش را باز کنید.'
        );
        feed.dataset.state = 'empty';
      }
    } catch (error) {
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
})();