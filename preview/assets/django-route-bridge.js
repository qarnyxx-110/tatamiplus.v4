/* Django route bridge for the existing Tatami Plus Preview.
 * Uses the real same-origin Django pages and their HTML forms.
 * No JSON API, demo fallback, pricing logic, or backend code is introduced.
 */
(() => {
  'use strict';

  if (location.pathname !== '/preview/' && location.pathname !== '/preview') return;

  let generation = 0;

  const normalize = (value) => String(value || '')
    .normalize('NFKC')
    .replace(/[\u200c\u200e\u200f\sـ،؛,.!؟:()\[\]{}"'’‘`~_\-/]+/g, '')
    .toLocaleLowerCase('fa');

  async function getHtml(path) {
    const response = await fetch(path, {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Accept: 'text/html' }
    });

    const finalUrl = new URL(response.url, location.origin);
    if (finalUrl.origin !== location.origin) throw new Error('Unexpected response origin');
    if (!response.ok) throw new Error('Django page request failed');

    return new DOMParser().parseFromString(await response.text(), 'text/html');
  }

  function safeStorePath(href) {
    try {
      const url = new URL(href, location.origin);
      if (url.origin !== location.origin) return '';
      if (!/^\/store\/(?!cart(?:\/|$)|cart\/items\/)[^/]+\/?$/.test(url.pathname)) return '';
      return url.pathname + url.search;
    } catch {
      return '';
    }
  }

  async function buildStoreUrl(params) {
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
          const source = await getHtml('/store/');
          const select = source.querySelector('select[name="category"]');
          const option = select && Array.from(select.options).find((item) =>
            normalize(item.textContent) === normalize(category)
          );
          if (option && option.value) query.set('category', option.value);
        } catch {
          // A category that cannot be resolved is omitted; the server remains authoritative.
        }
      }
    }

    const suffix = query.toString();
    return '/store/' + (suffix ? '?' + suffix : '');
  }

  async function buildProductUrl(rawId) {
    const id = Number(rawId);
    if (!Number.isInteger(id) || id < 0) return '/store/';

    let productName = '';
    try {
      if (typeof P !== 'undefined' && P[id] && P[id].n) productName = String(P[id].n);
    } catch {
      productName = '';
    }

    if (!productName) return '/store/';

    try {
      const source = await getHtml('/store/');
      const links = Array.from(source.querySelectorAll('a[href]'));
      const candidates = [];

      links.forEach((link) => {
        const path = safeStorePath(link.getAttribute('href') || link.href);
        if (!path) return;

        const card = link.closest('.tp-product-card, .pcd, .product-item, article, li');
        const title = card?.querySelector('h1, h2, h3, .product-name')?.textContent
          || link.textContent;
        if (normalize(title) === normalize(productName)) candidates.push(path);
      });

      const unique = Array.from(new Set(candidates));
      if (unique.length === 1) return unique[0];
    } catch {
      // Fall through to a real server-side search; never show the local demo product.
    }

    return '/store/?query=' + encodeURIComponent(productName);
  }

  function resolveSimpleRoute(route, parts, params) {
    if (route === 'cart') return '/store/cart/';
    if (route === 'checkout') return '/checkout/address/';

    if (route === 'login' || route === 'register' || route === 'role') {
      const role = params.get('role');
      return '/auth/login/' + (role === 'coach' || role === 'student'
        ? '?role=' + encodeURIComponent(role)
        : '');
    }

    if (route === 'coaches') return '/coaches/';
    if (route === 'coach-apply' || route === 'coach-application') return '/coaches/apply/';
    if (route === 'courses') return '/club/';

    if (route === 'episode' && /^\d+$/.test(parts[1] || '')) {
      return '/club/episode/' + parts[1] + '/';
    }

    if (route === 'gems') return '/account/gems/';
    if (route === 'profile' || route === 'my-profile') return '/account/';
    if (route === 'orders') return '/orders/';

    return '';
  }

  async function handleCurrentHash() {
    const currentHash = location.hash;
    if (!currentHash || !currentHash.startsWith('#/')) return;

    const token = ++generation;
    const routeText = currentHash.slice(2);
    const queryIndex = routeText.indexOf('?');
    const routePath = queryIndex === -1 ? routeText : routeText.slice(0, queryIndex);
    const queryText = queryIndex === -1 ? '' : routeText.slice(queryIndex + 1);
    const parts = routePath.split('/').filter(Boolean).map((part) => {
      try { return decodeURIComponent(part); } catch { return part; }
    });
    const route = parts[0] || '';
    const params = new URLSearchParams(queryText);

    let target = '';
    if (route === 'store') {
      target = await buildStoreUrl(params);
    } else if (route === 'product') {
      target = await buildProductUrl(parts[1] || '');
    } else {
      target = resolveSimpleRoute(route, parts, params);
    }

    if (!target || token !== generation || currentHash !== location.hash) return;
    location.replace(target);
  }

  window.addEventListener('hashchange', handleCurrentHash);
  handleCurrentHash();
})();
