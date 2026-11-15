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

  // Scroll-led technique story used by the original Preview homepage.
  const story = document.querySelector('[data-home-cine]');
  if (story) {
    const slides = Array.from(story.querySelectorAll('.tp-home-technique'));
    const bar = story.querySelector('.tp-home-cine-progress span');
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
        if (bar) bar.style.width = '100%';
        return;
      }

      const rect = story.getBoundingClientRect();
      const travel = Math.max(1, story.offsetHeight - window.innerHeight);
      const lastIndex = Math.max(0, slides.length - 1);
      const progress = clamp((-rect.top / travel) * lastIndex, 0, lastIndex);

      slides.forEach((slide, index) => {
        const distance = progress - index;
        const opacity = Math.max(0, 1 - Math.abs(distance) * 1.6);
        slide.style.opacity = String(opacity);
        slide.style.transform = 'translateY(' + (distance * -44) + 'px) scale(' + (0.94 + opacity * 0.06) + ')';
        slide.style.pointerEvents = opacity > 0.5 ? 'auto' : 'none';
      });

      if (bar) bar.style.width = (lastIndex ? (progress / lastIndex) * 100 : 100) + '%';
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