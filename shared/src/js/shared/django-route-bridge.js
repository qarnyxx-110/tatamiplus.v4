/* Django route bridge for the existing Tatami Plus Preview.
 * This file is bundled by shared/build.js into the generated Preview.
 * It uses real same-origin Django pages and native Django forms only.
 */
(() => {
  'use strict';

  const livePreviewHosts = new Set(['tatamiplus.ir', 'www.tatamiplus.ir']);
  const livePreviewHost = livePreviewHosts.has(location.hostname.toLowerCase());
  if (!livePreviewHost || (location.pathname !== '/preview/' && location.pathname !== '/preview')) return;

  let requestVersion = 0;

  const normalize = (value) => String(value || '')
    .normalize('NFKC')
    .replace(/[\u200c\u200e\u200f\sـ،؛,.!؟:()\[\]{}"'’‘`~_\-/]+/g, '')
    .toLocaleLowerCase('fa');

  async function fetchDjangoPage(path) {
    const response = await fetch(path, {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Accept: 'text/html' }
    });

    const finalUrl = new URL(response.url, location.origin);
    if (finalUrl.origin !== location.origin || !response.ok) {
      throw new Error('Django page is unavailable');
    }

    return new DOMParser().parseFromString(await response.text(), 'text/html');
  }

  function realProductPath(href) {
    try {
      const url = new URL(href, location.origin);
      if (url.origin !== location.origin) return '';
      if (!/^\/store\/(?!cart(?:\/|$))[^/]+\/?$/.test(url.pathname)) return '';
      return url.pathname + url.search;
    } catch {
      return '';
    }
  }

  async function resolveStoreFilters(params) {
    const query = new URLSearchParams();

    const textQuery = (params.get('query') || '').trim();
    if (textQuery) query.set('query', textQuery);

    ['min_price', 'max_price', 'page'].forEach((key) => {
      const value = (params.get(key) || '').trim();
      if (value && /^\d+$/.test(value)) query.set(key, value);
    });

    const keys = ['category', 'size', 'color', 'training_level', 'sort'];
    if (keys.some((key) => (params.get(key) || '').trim())) {
      try {
        const djangoStore = await fetchDjangoPage('/store/');
        keys.forEach((key) => {
          const value = (params.get(key) || '').trim();
          if (!value) return;

          const select = djangoStore.querySelector('select[name="' + key + '"]');
          if (!select) return;

          const option = Array.from(select.options).find((item) =>
            item.value === value ||
            normalize(item.textContent) === normalize(value)
          );
          if (option && option.value) query.set(key, option.value);
        });
      } catch {
        // Invalid or unavailable server-side choices are not sent to Django.
      }
    }

    const suffix = query.toString();
    return '/store/' + (suffix ? '?' + suffix : '');
  }

  async function resolveRealCourse(rawSlug) {
    let courseTitle = '';
    try {
      if (typeof TP_DEMO_COURSES !== 'undefined' && Array.isArray(TP_DEMO_COURSES)) {
        const course = TP_DEMO_COURSES.find((item) => item.slug === rawSlug);
        if (course && course.title) courseTitle = String(course.title);
      }
    } catch {
      courseTitle = '';
    }

    if (!courseTitle) return '/club/';

    try {
      const directory = await fetchDjangoPage('/club/');
      const matches = [];

      directory.querySelectorAll('.tp-course-grid > .tp-course-card').forEach((card) => {
        const title = card.querySelector('h1, h2, h3')?.textContent || '';
        if (normalize(title) !== normalize(courseTitle)) return;

        const link = card.querySelector('a[href*="/club/course/"]');
        if (!link) return;

        try {
          const url = new URL(link.getAttribute('href') || link.href, location.origin);
          if (url.origin === location.origin && /^\/club\/course\/[^/]+\/?$/.test(url.pathname)) {
            matches.push(url.pathname);
          }
        } catch {
          // Ignore malformed links; never invent a course slug.
        }
      });

      const uniqueMatches = Array.from(new Set(matches));
      if (uniqueMatches.length === 1) return uniqueMatches[0];
    } catch {
      // Keep the user on the real published course list if lookup is unavailable.
    }

    return '/club/?q=' + encodeURIComponent(courseTitle);
  }

  async function resolveRealCoach(rawId) {
    let coachName = '';
    try {
      if (typeof COACHES !== 'undefined' && Array.isArray(COACHES)) {
        const bySlug = COACHES.find((coach) => coach.slug === rawId);
        const numericId = /^\d+$/.test(rawId) ? Number(rawId) : -1;
        const coach = bySlug || COACHES[numericId];
        if (coach) coachName = [coach.firstName, coach.lastName].filter(Boolean).join(' ');
      }
    } catch {
      coachName = '';
    }

    if (!coachName) return '/coaches/';

    try {
      const directory = await fetchDjangoPage('/coaches/');
      const matches = [];

      directory.querySelectorAll('.tp-coaches > li').forEach((item) => {
        const name = item.querySelector('.tp-coach-card-copy b')?.textContent || '';
        if (normalize(name) !== normalize(coachName)) return;

        const href = item.querySelector('a[href]')?.getAttribute('href') || '';
        try {
          const url = new URL(href, location.origin);
          if (url.origin === location.origin && /^\/coaches\/\d+\/?$/.test(url.pathname)) {
            matches.push(url.pathname);
          }
        } catch {
          // Ignore a malformed directory link.
        }
      });

      const uniqueMatches = Array.from(new Set(matches));
      if (uniqueMatches.length === 1) return uniqueMatches[0];
    } catch {
      // The public directory is still the safe destination when no exact profile match exists.
    }

    return '/coaches/';
  }

  async function resolveRealProduct(rawId) {
    const id = Number(rawId);
    if (!Number.isInteger(id) || id < 0) return '/store/';

    let productName = '';
    try {
      if (typeof P !== 'undefined' && P[id] && P[id].n) {
        productName = String(P[id].n);
      }
    } catch {
      productName = '';
    }

    if (!productName) return '/store/';

    try {
      const djangoStore = await fetchDjangoPage('/store/');
      const matches = [];

      djangoStore.querySelectorAll('.tp-product-card').forEach((card) => {
        const title = card.querySelector('h1, h2, h3')?.textContent || '';
        if (normalize(title) !== normalize(productName)) return;

        const link = card.querySelector('a[href*="/store/"]');
        const path = link && realProductPath(link.getAttribute('href') || link.href);
        if (path) matches.push(path);
      });

      const uniqueMatches = Array.from(new Set(matches));
      if (uniqueMatches.length === 1) return uniqueMatches[0];
    } catch {
      // A failed lookup must not fall back to local demo product details.
    }

    return '/store/?query=' + encodeURIComponent(productName);
  }

  function nextPathFromHash(value) {
    const raw = String(value || '');
    if (!raw.startsWith('#/')) return '';

    const route = raw.slice(2).split('?')[0].split('/').filter(Boolean);
    switch (route[0]) {
      case 'cart': return '/store/cart/';
      case 'checkout': return '/checkout/address/';
      case 'store': return '/store/';
      case 'coaches': return '/coaches/';
      case 'courses':
      case 'club':
      case 'episode': return '/club/';
      case 'gems': return '/account/gems/';
      case 'profile':
      case 'my-profile': return '/account/';
      case 'orders': return '/orders/';
      default: return '';
    }
  }

  function resolveKnownRoute(route, parts, params) {
    if (route === 'cart') return '/store/cart/';
    if (route === 'checkout') return '/checkout/address/';
    if (route === 'store') return resolveStoreFilters(params);

    if (route === 'product') return resolveRealProduct(parts[1] || params.get('id') || '');

    if (route === 'login' || route === 'register' || route === 'role') {
      const query = new URLSearchParams();
      const role = params.get('role');
      if (role && role !== 'coach' && role !== 'student') return '';
      if (role) query.set('role', role);

      const next = nextPathFromHash(params.get('next') || params.get('next_url'));
      if (next) query.set('next', next);

      const suffix = query.toString();
      return '/auth/login/' + (suffix ? '?' + suffix : '');
    }

    if (route === 'coaches') {
      return parts[1] ? resolveRealCoach(parts[1]) : '/coaches/';
    }
    if (route === 'instructor') {
      return parts[1] ? resolveRealCoach(parts[1]) : '/coaches/';
    }
    if (route === 'coach-apply') return '/coaches/apply/';
    if (route === 'coach-application') return '/coaches/application/';
    if (route === 'courses') {
      return parts[1] ? resolveRealCourse(parts[1]) : '/club/';
    }
    if (route === 'episode') {
      const lesson = /^([a-z0-9-]+)-lesson-\d+$/.exec(parts[1] || '');
      return lesson ? resolveRealCourse(lesson[1]) : '/club/';
    }
    if (route === 'club') return '/club/';
    if (route === 'gems') return '/account/gems/';
    if (route === 'profile' || route === 'my-profile') return '/account/';
    if (route === 'orders') return '/orders/';

    // Maps, dashboards, live coach, AI and other unsupported modules remain in Preview.
    return '';
  }

  async function handlePreviewRoute() {
    const hash = location.hash;
    if (!hash.startsWith('#/')) return;

    const version = ++requestVersion;
    const routeText = hash.slice(2);
    const separator = routeText.indexOf('?');
    const routePath = separator < 0 ? routeText : routeText.slice(0, separator);
    const queryText = separator < 0 ? '' : routeText.slice(separator + 1);
    const parts = routePath.split('/').filter(Boolean).map((part) => {
      try { return decodeURIComponent(part); } catch { return part; }
    });
    const route = parts[0] || '';
    const params = new URLSearchParams(queryText);

    let target = resolveKnownRoute(route, parts, params);
    if (target && typeof target.then === 'function') target = await target;

    if (!target || version !== requestVersion || hash !== location.hash) return;
    location.replace(target);
  }

  window.addEventListener('hashchange', handlePreviewRoute);
  handlePreviewRoute();
})();
