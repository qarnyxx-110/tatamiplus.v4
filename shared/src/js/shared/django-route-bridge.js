/* Django route bridge for the existing Tatami Plus Preview.
 * This file is bundled by shared/build.js into the generated Preview.
 * It uses real same-origin Django pages and native Django forms only.
 */
(() => {
  'use strict';

  const livePreviewHost = location.hostname === 'tatamiplus.ir';
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

    ['query', 'size', 'color', 'training_level', 'min_price', 'max_price', 'sort', 'page']
      .forEach((key) => {
        const value = (params.get(key) || '').trim();
        if (value) query.set(key, value);
      });

    const category = (params.get('category') || '').trim();
    if (category) {
      if (/^\d+$/.test(category)) {
        query.set('category', category);
      } else {
        try {
          const djangoStore = await fetchDjangoPage('/store/');
          const select = djangoStore.querySelector('select[name="category"]');
          const option = select && Array.from(select.options).find((item) =>
            normalize(item.textContent) === normalize(category)
          );
          if (option && option.value) query.set('category', option.value);
        } catch {
          // Keep the server as the only source of product/category data.
        }
      }
    }

    const suffix = query.toString();
    return '/store/' + (suffix ? '?' + suffix : '');
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
      if (role === 'coach' || role === 'student') query.set('role', role);

      const next = nextPathFromHash(params.get('next') || params.get('next_url'));
      if (next) query.set('next', next);

      const suffix = query.toString();
      return '/auth/login/' + (suffix ? '?' + suffix : '');
    }

    if (route === 'coaches') return '/coaches/';
    if (route === 'coach-apply') return '/coaches/apply/';
    if (route === 'coach-application') return '/coaches/application/';
    if (route === 'courses' || route === 'club' || route === 'episode') return '/club/';
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
