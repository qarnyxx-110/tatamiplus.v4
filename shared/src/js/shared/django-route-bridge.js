/* Django route bridge for the existing Tatami Plus Preview.
 * This file is bundled by shared/build.js into the generated Preview.
 * It uses real same-origin Django pages and native Django forms only.
 */
(() => {
  'use strict';

  const livePreviewHosts = new Set(['tatamiplus.ir', 'www.tatamiplus.ir']);
  const livePreviewHost = livePreviewHosts.has(location.hostname.toLowerCase());
  if (!livePreviewHost || (location.pathname !== '/preview/' && location.pathname !== '/preview')) return;

  // Remove legacy Preview-only identities; production authentication is Django Session only.
  try {
    localStorage.removeItem('tp:users');
    localStorage.removeItem('tp:me');
    localStorage.removeItem('tp:coachapps');
    if (typeof ME !== 'undefined') ME = null;
    if (typeof authUI === 'function') authUI();
  } catch {
    // Storage may be unavailable; route navigation must still work.
  }


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
      if (next) query.set('next_url', next);

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

  let activeDjangoView = false;
  let currentServerUrl = new URL('/', location.origin);

  function isAllowedDjangoUrl(value) {
    let url;
    try { url = value instanceof URL ? value : new URL(value, location.origin); } catch { return false; }
    if (url.origin !== location.origin) return false;
    return url.pathname === '/' ||
      /^\/(store|checkout|payment|orders|auth|accounts|account|club|coach|coaches)(\/|$)/.test(url.pathname);
  }

  function serverHashForUrl(value) {
    const url = value instanceof URL ? value : new URL(value, location.origin);
    return '#/server/' + encodeURIComponent(url.pathname + url.search);
  }

  function ensureDjangoStyles() {
    [
      '/static/css/tatami.css',
      '/static/css/backend-templates.css',
      '/static/css/module-pages.css',
      '/static/css/reference-store.css'
    ].forEach((href) => {
      if (document.querySelector('link[data-tp-django-style="' + href + '"]')) return;
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.dataset.tpDjangoStyle = href;
      document.head.append(link);
    });
  }

  function showBridgeMessage(title, detail) {
    const root = document.querySelector('#app');
    if (!root) return;
    const box = document.createElement('section');
    box.className = 'w tp-state';
    const heading = document.createElement('b');
    heading.textContent = title;
    const paragraph = document.createElement('p');
    paragraph.textContent = detail;
    box.append(heading, paragraph);
    root.replaceChildren(box);
  }

  function enhanceDjangoPage(root) {
    root.querySelectorAll('[data-gallery-select]').forEach((button) => {
      if (button.dataset.tpBound === 'true') return;
      button.dataset.tpBound = 'true';
      button.addEventListener('click', () => {
        const gallery = button.closest('[data-product-gallery]');
        const image = gallery && gallery.querySelector('[data-gallery-main-image]');
        const figure = gallery && gallery.querySelector('[data-gallery-main]');
        if (!image || !figure || !button.dataset.src) return;
        image.src = button.dataset.src;
        image.alt = button.dataset.alt || '';
        figure.classList.add('ok');
        gallery.querySelectorAll('[data-gallery-select]').forEach((item) => {
          const active = item === button;
          item.classList.toggle('is-active', active);
          item.setAttribute('aria-pressed', String(active));
        });
      });
    });

    root.querySelectorAll('[data-toggle]').forEach((button) => {
      if (button.dataset.tpBound === 'true') return;
      button.dataset.tpBound = 'true';
      button.addEventListener('click', () => {
        const panel = document.getElementById(button.dataset.toggle);
        if (!panel) return;
        const open = panel.classList.toggle('open');
        button.setAttribute('aria-expanded', String(open));
        if (open) panel.querySelector('select,input,button')?.focus();
      });
    });

    root.querySelectorAll('select[name="sort"]').forEach((select) => {
      if (select.dataset.tpBound === 'true') return;
      select.dataset.tpBound = 'true';
      select.addEventListener('change', () => {
        if (select.form && typeof select.form.requestSubmit === 'function') select.form.requestSubmit();
      });
    });

    root.querySelectorAll('form[data-quantity-form]').forEach((form) => {
      if (form.dataset.tpBound === 'true') return;
      form.dataset.tpBound = 'true';
      const input = form.querySelector('input[name="quantity"]');
      if (!input) return;
      form.querySelectorAll('[data-qty-step]').forEach((button) => {
        button.hidden = false;
        button.addEventListener('click', () => {
          const min = Number(input.min || 1);
          const max = input.max ? Number(input.max) : Infinity;
          const current = Number(input.value || min);
          const step = Number(button.dataset.qtyStep || 0);
          input.value = String(Math.max(min, Math.min(max, current + step)));
        });
      });
    });

    const otp = root.querySelector('#id_code');
    if (otp) {
      otp.inputMode = 'numeric';
      otp.autocomplete = 'one-time-code';
      otp.maxLength = 5;
      otp.pattern = '[0-9۰-۹٠-٩]{5}';
    }
    const phone = root.querySelector('#id_phone');
    if (phone) {
      phone.type = 'tel';
      phone.inputMode = 'tel';
      phone.autocomplete = 'tel';
      phone.dir = 'ltr';
    }
  }

  function renderDjangoDocument(markup, finalUrl, expectedHash) {
    const documentFromServer = new DOMParser().parseFromString(markup, 'text/html');
    const remoteApp = documentFromServer.querySelector('#app');
    const localApp = document.querySelector('#app');
    if (!remoteApp || !localApp) {
      throw new Error('The server response did not contain a Django content area.');
    }

    const clonedApp = remoteApp.cloneNode(true);
    const messages = documentFromServer.querySelector('.tp-msgs');
    if (messages) clonedApp.insertBefore(messages.cloneNode(true), clonedApp.firstChild);
    localApp.replaceWith(clonedApp);

    currentServerUrl = finalUrl instanceof URL ? finalUrl : new URL(finalUrl, location.origin);
    activeDjangoView = true;
    clonedApp.dataset.djangoView = currentServerUrl.pathname;
    document.title = documentFromServer.title || 'تاتامی پلاس';
    const description = documentFromServer.querySelector('meta[name="description"]');
    const localDescription = document.querySelector('meta[name="description"]');
    if (description && localDescription) localDescription.content = description.content;

    ensureDjangoStyles();
    enhanceDjangoPage(clonedApp);
    if (clonedApp.querySelector('[data-reference-store]')) {
      const script = document.createElement('script');
      script.src = '/static/js/reference-store.js';
      script.async = false;
      document.head.append(script);
    }
    if (clonedApp.querySelector('[data-home-feed]')) {
      const script = document.createElement('script');
      script.src = '/static/js/home-restored.js';
      script.async = false;
      document.head.append(script);
    }
    clonedApp.setAttribute('aria-busy', 'false');
  }

  async function loadDjangoPath(path, version, expectedHash) {
    let target;
    try { target = new URL(path, location.origin); } catch { return; }
    if (!isAllowedDjangoUrl(target)) return;

    const app = document.querySelector('#app');
    if (app) {
      app.setAttribute('aria-busy', 'true');
      app.dataset.loading = 'true';
    }

    try {
      const response = await fetch(target.href, {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { Accept: 'text/html' }
      });
      const finalUrl = new URL(response.url, target.href);
      if (finalUrl.origin !== location.origin || !isAllowedDjangoUrl(finalUrl)) {
        throw new Error('The server redirected to an unsupported address.');
      }
      const markup = await response.text();
      if (version !== requestVersion || expectedHash !== location.hash) return;
      renderDjangoDocument(markup, finalUrl, expectedHash);
      if (app) delete app.dataset.loading;
    } catch {
      if (version !== requestVersion || expectedHash !== location.hash) return;
      activeDjangoView = true;
      if (app) delete app.dataset.loading;
      showBridgeMessage(
        'این بخش فعلاً از سرور دریافت نشد',
        'ارتباط با صفحهٔ واقعی Django برقرار نشد. اتصال را بررسی کنید و دوباره همین بخش را باز کنید.'
      );
    }
  }

  function navigateToDjangoUrl(value) {
    let url;
    try { url = value instanceof URL ? value : new URL(value, currentServerUrl); } catch { return false; }
    if (!isAllowedDjangoUrl(url)) return false;
    const nextHash = serverHashForUrl(url);
    if (location.hash === nextHash) {
      const version = ++requestVersion;
      loadDjangoPath(url.href, version, nextHash);
    } else {
      location.hash = nextHash;
    }
    return true;
  }

  async function handlePreviewRoute() {
    const hash = location.hash;
    if (!hash.startsWith('#/')) {
      activeDjangoView = false;
      return;
    }

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

    if (route === 'server') {
      const serverPath = parts[1] || '/';
      await loadDjangoPath(serverPath, version, hash);
      return;
    }

    let target = resolveKnownRoute(route, parts, params);
    if (target && typeof target.then === 'function') target = await target;

    if (!target || version !== requestVersion || hash !== location.hash) {
      if (!target) activeDjangoView = false;
      return;
    }
    await loadDjangoPath(target, version, hash);
  }

  // Keep the Preview shell and its original navigation visible. Django supplies
  // the real page content, forms, session, CSRF and business data in-place.
  document.addEventListener('click', (event) => {
    if (!activeDjangoView || event.defaultPrevented || event.button !== 0 ||
        event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const source = event.target;
    const element = source && source.nodeType === 1 ? source : source && source.parentElement;
    const link = element && typeof element.closest === 'function' ? element.closest('#app a[href]') : null;
    if (!link || link.hasAttribute('download') || (link.target && link.target.toLowerCase() !== '_self')) return;

    const rawHref = link.getAttribute('href') || '';
    if (!rawHref || rawHref.startsWith('#/')) return;
    let target;
    try { target = new URL(rawHref, currentServerUrl); } catch { return; }
    if (target.pathname === currentServerUrl.pathname && target.search === currentServerUrl.search &&
        target.hash) {
      event.preventDefault();
      const anchorId = decodeURIComponent(target.hash.slice(1));
      const anchor = anchorId ? document.getElementById(anchorId) : null;
      if (anchor) anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
      else if (!anchorId) window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!isAllowedDjangoUrl(target)) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    navigateToDjangoUrl(target);
  }, true);

  document.addEventListener('submit', (event) => {
    const form = event.target;
    if (!form || form.tagName !== 'FORM') return;

    if (!activeDjangoView && (form.id === 'rg-f' || form.id === 'lg-f')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      location.hash = '#/login';
      return;
    }
    if (!activeDjangoView || !document.querySelector('#app')?.contains(form) ||
        (form.target && form.target.toLowerCase() !== '_self')) return;

    const method = String(form.method || 'get').toUpperCase();
    let action;
    try {
      action = new URL(form.getAttribute('action') || currentServerUrl.href, currentServerUrl);
    } catch { return; }
    if (!isAllowedDjangoUrl(action)) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    if (method === 'GET') {
      const query = new URLSearchParams(action.search);
      const formData = new FormData(form);
      for (const [key, value] of formData.entries()) {
        if (typeof value === 'string') query.append(key, value);
      }
      action.search = query.toString();
      navigateToDjangoUrl(action);
      return;
    }
    if (method !== 'POST') return;

    let formData;
    try { formData = event.submitter ? new FormData(form, event.submitter) : new FormData(form); }
    catch { formData = new FormData(form); }

    const submitButtons = Array.from(form.querySelectorAll('button[type="submit"],input[type="submit"]'));
    submitButtons.forEach((button) => { button.disabled = true; button.classList.add('is-loading'); });
    const status = document.createElement('p');
    status.className = 'tp-hint';
    status.setAttribute('role', 'status');
    status.textContent = 'در حال ارسال اطلاعات به سامانه...';
    form.append(status);

    const request = new XMLHttpRequest();
    request.open('POST', action.href, true);
    request.withCredentials = true;
    request.setRequestHeader('Accept', 'text/html');
    const csrf = form.querySelector('input[name="csrfmiddlewaretoken"]');
    if (csrf && csrf.value) request.setRequestHeader('X-CSRFToken', csrf.value);
    const uploadProgress = form.querySelector('[data-video-upload-form]') ? null : status;
    request.upload.addEventListener('progress', (progress) => {
      if (uploadProgress && progress.lengthComputable && progress.total > 0) {
        const percent = Math.round((progress.loaded / progress.total) * 100);
        uploadProgress.textContent = 'بارگذاری فایل: ' + percent.toLocaleString('fa-IR') + '٪';
      }
    });
    request.addEventListener('load', () => {
      const finalUrl = new URL(request.responseURL || action.href, action.href);
      if (finalUrl.origin !== location.origin || !isAllowedDjangoUrl(finalUrl)) {
        showBridgeMessage('پاسخ سرور قابل نمایش نیست', 'سرور درخواست را به نشانی پشتیبانی‌نشده هدایت کرد.');
        return;
      }

      const finalHash = serverHashForUrl(finalUrl);
      const samePath = finalUrl.pathname === action.pathname && finalUrl.search === action.search;
      if (!samePath && location.hash !== finalHash) {
        location.hash = finalHash;
        return;
      }

      try {
        renderDjangoDocument(request.responseText || '', finalUrl, location.hash);
      } catch {
        showBridgeMessage('پاسخ سرور قابل نمایش نیست', 'پاسخ دریافت شد، اما قالب HTML قابل شناسایی نبود.');
      }
    });
    request.addEventListener('error', () => {
      showBridgeMessage('ارسال اطلاعات ناموفق بود', 'ارتباط با سرور قطع شد. صفحه را تازه کنید و دوباره تلاش کنید.');
    });
    request.send(formData);
  }, true);

  window.addEventListener('hashchange', handlePreviewRoute);
  handlePreviewRoute();
})();