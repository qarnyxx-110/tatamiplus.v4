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
  let activePostRequest = null;

  function abortActivePostRequest() {
    if (activePostRequest && activePostRequest.readyState !== XMLHttpRequest.DONE) {
      try { activePostRequest.abort(); } catch { /* Request may have completed between the check and abort. */ }
    }
  }

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

    if (route === 'password-reset' || route === 'set-password') return '/auth/login/';
    if (route === 'coach-invite') return '/coaches/join/';

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
    const files = [
      '/static/css/django-bridge.css',
      '/static/css/backend-templates.css',
      '/static/css/module-pages.css',
      '/static/css/reference-store.css'
    ];

    return Promise.all(files.map((href) => new Promise((resolve) => {
      let link = document.querySelector('link[data-tp-django-style="' + href + '"]');
      if (link && link.sheet) {
        resolve(true);
        return;
      }
      if (link && !link.sheet) {
        link.remove();
        link = null;
      }
      if (!link) {
        link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.dataset.tpDjangoStyle = href;
      }
      let settled = false;
      const finish = (ok) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        resolve(ok);
      };
      const timer = window.setTimeout(() => finish(false), 7000);
      link.addEventListener('load', () => finish(true), { once: true });
      link.addEventListener('error', () => finish(false), { once: true });
      document.head.append(link);
    })));
  }

  function clearDjangoStyles() {
    document.querySelectorAll('link[data-tp-django-style]').forEach((link) => link.remove());
  }

  function setPreviewNavigation(route) {
    ['#nv a', '#nvd a'].forEach((selector) => {
      document.querySelectorAll(selector).forEach((link) => {
        const href = link.getAttribute('href') || '';
        const itemRoute = href.startsWith('#/') ? href.slice(2).split(/[/?]/)[0] : '';
        const active = Boolean(route) && itemRoute === route;
        link.classList.toggle('on', active);
        if (active) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      });
    });
  }

  function previewRouteForServerPath(path) {
    if (/^\/store(?:\/|$)/.test(path)) return 'store';
    if (/^\/(?:club|checkout)(?:\/|$)/.test(path)) return 'courses';
    if (/^\/coaches(?:\/|$)/.test(path)) return 'coaches';
    if (/^\/account\/gems(?:\/|$)/.test(path)) return 'gems';
    return '';
  }

  function syncPreviewAccountState(remoteDocument) {
    if (!remoteDocument) return;
    const remoteHeader = remoteDocument.querySelector('body>header');
    if (!remoteHeader) return;

    const syncIcon = (local, remote) => {
      const remoteIcon = remote && remote.querySelector('svg.tp-ico');
      const localIcon = local && local.querySelector('svg.tp-ico');
      if (!local) return;
      if (remoteIcon && localIcon) localIcon.replaceWith(remoteIcon.cloneNode(true));
      else if (remoteIcon) local.insertBefore(remoteIcon.cloneNode(true), local.firstChild);
      else if (localIcon) localIcon.remove();
    };
    const syncLabel = (local, remote) => {
      if (!local || !remote) return;
      const remoteLabel = remote.querySelector('.hb-t');
      const localLabel = local.querySelector('.hb-t');
      const value = (remoteLabel ? remoteLabel.textContent : remote.textContent).trim();
      if (localLabel) localLabel.textContent = value;
      else {
        const label = document.createElement('span');
        label.className = 'hb-t';
        label.textContent = value;
        local.append(label);
      }
      if (remote.hasAttribute('aria-label')) local.setAttribute('aria-label', remote.getAttribute('aria-label'));
    };

    const remoteAccount = remoteHeader.querySelector('#hbu');
    const localAccount = document.getElementById('hbu');
    if (remoteAccount && localAccount) {
      syncIcon(localAccount, remoteAccount);
      syncLabel(localAccount, remoteAccount);
      const accountPath = remoteAccount.getAttribute('href') || '';
      localAccount.href = /\/account(?:\/|$)/.test(accountPath) ? '#/profile' : '#/login';
    }

    const remoteCart = remoteHeader.querySelector('#hcart');
    const localCart = document.getElementById('hcart');
    if (remoteCart && localCart) {
      syncIcon(localCart, remoteCart);
      syncLabel(localCart, remoteCart);
      localCart.href = '#/cart';
      const count = localCart.querySelector('#cc');
      if (count && activeDjangoView) {
        count.textContent = '';
        count.hidden = true;
      } else if (count) {
        count.hidden = false;
      }
    }

    const remoteGems = remoteHeader.querySelector('#hgem');
    const localGems = document.getElementById('hgem');
    if (localGems) {
      localGems.hidden = !remoteGems;
      if (remoteGems) {
        syncIcon(localGems, remoteGems);
        syncLabel(localGems, remoteGems);
        localGems.href = '#/gems';
        const value = remoteGems.querySelector('.tp-gem-header-value');
        const localValue = localGems.querySelector('.tp-gem-header-value');
        if (value && localValue) localValue.textContent = value.textContent.trim();
        const demo = localGems.querySelector('.tp-gem-demo');
        if (demo) demo.hidden = true;
        if (remoteGems.hasAttribute('aria-label')) localGems.setAttribute('aria-label', remoteGems.getAttribute('aria-label'));
      }
    }

    const remoteDrawerFooter = remoteDocument.querySelector('#mnd .tp-drawer-f');
    const localDrawerFooter = document.getElementById('mndf');
    if (remoteDrawerFooter && localDrawerFooter) {
      localDrawerFooter.replaceChildren(...Array.from(remoteDrawerFooter.childNodes).map(node => node.cloneNode(true)));
      localDrawerFooter.querySelectorAll('a[href]').forEach((link) => {
        const href = link.getAttribute('href') || '';
        if (/^\/auth\/login\//.test(href)) link.setAttribute('href', '#/login');
        else if (/^\/account\//.test(href)) link.setAttribute('href', '#/profile');
      });
    }
  }

  let lastServerDocument = null;

  function resetPreviewBridgeState() {
    activeDjangoView = false;
    currentServerUrl = new URL('/', location.origin);
    abortActivePostRequest();
    clearDjangoStyles();

    document.querySelectorAll('script[data-tp-django-page-script]').forEach((script) => script.remove());
    document.querySelectorAll('.tp-msgs[data-tp-server-messages]').forEach((message) => message.remove());

    const app = document.querySelector('#app');
    if (app) {
      app.className = '';
      app.removeAttribute('aria-label');
      app.removeAttribute('aria-labelledby');
      app.removeAttribute('style');
      app.removeAttribute('data-django-view');
      app.removeAttribute('aria-busy');
      app.removeAttribute('data-loading');
      app.setAttribute('role', 'main');
    }
  }

  function syncPageNavigation(path) {
    setPreviewNavigation(previewRouteForServerPath(path));
  }

  function hydratePreviewAccountState() {
    fetchDjangoPage('/').then((remoteDocument) => {
      if (location.pathname === '/preview/' || location.pathname === '/preview') {
        lastServerDocument = remoteDocument;
        syncPreviewAccountState(remoteDocument);
      }
    }).catch(() => {
      // The Preview remains usable when the Django session endpoint is unavailable.
    });
  }

  function showBridgeMessage(title, detail) {
    const root = document.querySelector('#app');
    if (!root) return;
    root.setAttribute('aria-busy', 'false');
    delete root.dataset.loading;
    const box = document.createElement('section');
    box.className = 'w tp-state';
    box.setAttribute('role', 'alert');
    const heading = document.createElement('b');
    heading.textContent = title;
    const paragraph = document.createElement('p');
    paragraph.textContent = detail;
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'btn o';
    retry.textContent = 'تلاش دوباره';
    retry.addEventListener('click', () => handlePreviewRoute());
    box.append(heading, paragraph, retry);
    root.replaceChildren(box);
  }

  function enhanceDjangoPage(root) {
    root.querySelectorAll('[data-copy-target]').forEach((button) => {
      if (button.dataset.tpCopyBound === 'true') return;
      button.dataset.tpCopyBound = 'true';
      button.addEventListener('click', async () => {
        const targetId = button.dataset.copyTarget;
        const field = targetId && root.querySelector('[id="' + targetId + '"]');
        if (!field) return;
        const feedbackId = button.dataset.copyFeedback;
        const feedback = feedbackId && root.querySelector('[id="' + feedbackId + '"]');
        const value = 'value' in field ? field.value : field.textContent.trim();
        let copied = false;

        try {
          if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
            await navigator.clipboard.writeText(value);
            copied = true;
          }
        } catch {
          // Clipboard access may be blocked in insecure contexts or by browser permissions.
        }

        if (!copied) {
          try {
            field.focus();
            if (typeof field.select === 'function') field.select();
            copied = document.execCommand('copy');
          } catch {
            copied = false;
          }
        }

        if (copied) {
          button.textContent = button.dataset.copySuccess || 'کپی شد';
          if (feedback) feedback.textContent = 'پیوند دعوت کپی شد.';
        } else {
          if (feedback) feedback.textContent = 'کپی خودکار انجام نشد؛ پیوند را انتخاب و به‌صورت دستی کپی کنید.';
          if (typeof field.select === 'function') {
            field.focus();
            field.select();
          }
        }
      });
    });

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

    const remoteChildren = Array.from(remoteApp.children);
    const pageMain = remoteChildren.length === 1 && remoteChildren[0].tagName === 'MAIN'
      ? remoteChildren[0]
      : null;
    const contentRoot = pageMain || remoteApp;

    ['class', 'aria-label', 'aria-labelledby', 'style'].forEach((attribute) => {
      localApp.removeAttribute(attribute);
      if (contentRoot !== remoteApp && contentRoot.hasAttribute(attribute)) {
        localApp.setAttribute(attribute, contentRoot.getAttribute(attribute));
      }
    });
    localApp.replaceChildren(...Array.from(contentRoot.childNodes).map(node => node.cloneNode(true)));

    const messages = documentFromServer.querySelector('.tp-msgs');
    document.querySelectorAll('.tp-msgs[data-tp-server-messages]').forEach((message) => message.remove());
    if (messages) {
      const clonedMessages = messages.cloneNode(true);
      clonedMessages.dataset.tpServerMessages = 'true';
      localApp.parentNode.insertBefore(clonedMessages, localApp);
    }

    currentServerUrl = finalUrl instanceof URL ? finalUrl : new URL(finalUrl, location.origin);
    activeDjangoView = true;
    localApp.dataset.djangoView = currentServerUrl.pathname;
    localApp.setAttribute('aria-busy', 'true');
    localApp.setAttribute('data-enter', '');
    lastServerDocument = documentFromServer;
    document.title = documentFromServer.title || 'تاتامی پلاس';
    const description = documentFromServer.querySelector('meta[name="description"]');
    const localDescription = document.querySelector('meta[name="description"]');
    if (description && localDescription) localDescription.content = description.content;

    syncPageNavigation(currentServerUrl.pathname);
    syncPreviewAccountState(documentFromServer);
    enhanceDjangoPage(localApp);

    const loadPageScript = (name, src) => {
      document.querySelectorAll('script[data-tp-django-page-script="' + name + '"]').forEach((script) => script.remove());
      const script = document.createElement('script');
      script.src = src;
      script.async = false;
      script.dataset.tpDjangoPageScript = name;
      document.body.append(script);
    };
    if (localApp.querySelector('[data-reference-store]')) {
      loadPageScript('reference-store', '/static/js/reference-store.js');
    }
    if (localApp.querySelector('[data-home-feed]')) {
      loadPageScript('home-restored', '/static/js/home-restored.js');
    }
    localApp.setAttribute('aria-busy', 'false');
  }

  async function loadDjangoPath(path, version, expectedHash) {
    let target;
    try { target = new URL(path, location.origin); } catch { return; }
    if (!isAllowedDjangoUrl(target)) return;

    abortActivePostRequest();

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
      if (!response.ok) {
        throw new Error('Django returned HTTP ' + response.status);
      }
      const markup = await response.text();
      if (version !== requestVersion || expectedHash !== location.hash) return;
      await ensureDjangoStyles();
      if (version !== requestVersion || expectedHash !== location.hash) return;
      renderDjangoDocument(markup, finalUrl, expectedHash);
      if (app) delete app.dataset.loading;
    } catch (error) {
      if (version !== requestVersion || expectedHash !== location.hash) return;
      resetPreviewBridgeState();
      if (app) {
        delete app.dataset.loading;
        app.setAttribute('aria-busy', 'false');
      }
      const detail = error && error.message && error.message.startsWith('Django returned HTTP ')
        ? 'سرور پاسخ ناموفق داد. کد پاسخ: ' + error.message.replace('Django returned HTTP ', '')
        : 'ارتباط با صفحهٔ واقعی Django برقرار نشد. اتصال را بررسی کنید و دوباره تلاش کنید.';
      showBridgeMessage('این بخش فعلاً از سرور دریافت نشد', detail);
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
      ++requestVersion;
      resetPreviewBridgeState();
      if (lastServerDocument) syncPreviewAccountState(lastServerDocument);
      return;
    }

    const version = ++requestVersion;
    abortActivePostRequest();
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
      if (!target && version === requestVersion && hash === location.hash) {
        resetPreviewBridgeState();
        if (lastServerDocument) syncPreviewAccountState(lastServerDocument);
      }
      return;
    }
    await loadDjangoPath(target, version, hash);
  }

  // Keep the Preview shell, navigation and footer intact. Django supplies only
  // real page content, forms, session, CSRF and business data.
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
    const method = String(form.method || 'get').toUpperCase();
    let action;
    try {
      action = new URL(form.getAttribute('action') || currentServerUrl.href, currentServerUrl);
    } catch { return; }

    const app = document.querySelector('#app');
    const inApp = Boolean(app && app.contains(form));
    const drawer = document.getElementById('mnd');
    const inDrawer = Boolean(drawer && drawer.contains(form));
    const isSessionLogout = inDrawer && method === 'POST' &&
      (action.pathname === '/accounts/logout/' || action.pathname === '/accounts/logout');
    if ((!activeDjangoView && !isSessionLogout) ||
        (!inApp && !isSessionLogout) ||
        (form.target && form.target.toLowerCase() !== '_self') ||
        !isAllowedDjangoUrl(action)) return;

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

    form.querySelectorAll('.tp-bridge-submit-status').forEach((item) => item.remove());
    const submitControls = Array.from(form.querySelectorAll('button[type="submit"],input[type="submit"]'))
      .map((node) => ({ node, wasDisabled: node.disabled }));
    submitControls.forEach(({ node }) => { node.disabled = true; node.classList.add('is-loading'); });
    form.setAttribute('aria-busy', 'true');

    const statusArea = document.createElement('div');
    statusArea.className = 'tp-bridge-submit-status';
    const status = document.createElement('p');
    status.className = 'tp-hint';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.textContent = 'در حال ارسال اطلاعات به سامانه...';
    statusArea.append(status);

    const isVideoUpload = form.hasAttribute('data-video-upload-form') || !!form.querySelector('[data-video-upload-form]');
    const request = new XMLHttpRequest();
    const submittedVersion = requestVersion;
    const submittedHash = location.hash;
    const isCurrentRequest = () =>
      submittedVersion === requestVersion && submittedHash === location.hash;
    const releaseControls = (removeStatus) => {
      submitControls.forEach(({ node, wasDisabled }) => {
        if (!node.isConnected) return;
        node.disabled = wasDisabled;
        node.classList.remove('is-loading');
      });
      if (form.isConnected) form.removeAttribute('aria-busy');
      if (removeStatus && statusArea.isConnected) statusArea.remove();
      if (activePostRequest === request) activePostRequest = null;
    };
    let cancelUpload = null;
    const showInlineFailure = (message) => {
      releaseControls(false);
      status.className = 'tp-error-text tp-bridge-submit-error';
      status.setAttribute('role', 'alert');
      status.setAttribute('aria-live', 'assertive');
      status.textContent = message;
      if (cancelUpload) cancelUpload.remove();
    };

    if (isVideoUpload) {
      cancelUpload = document.createElement('button');
      cancelUpload.type = 'button';
      cancelUpload.className = 'btn o s tp-bridge-upload-cancel';
      cancelUpload.textContent = 'لغو بارگذاری';
      cancelUpload.addEventListener('click', () => {
        if (request.readyState === XMLHttpRequest.DONE) return;
        cancelUpload.disabled = true;
        status.textContent = 'در حال لغو بارگذاری...';
        request.abort();
      });
      statusArea.append(cancelUpload);
    }
    form.append(statusArea);

    request.open('POST', action.href, true);
    request.withCredentials = true;
    request.setRequestHeader('Accept', 'text/html');
    const csrf = form.querySelector('input[name="csrfmiddlewaretoken"]');
    if (csrf && csrf.value) request.setRequestHeader('X-CSRFToken', csrf.value);

    request.upload.addEventListener('progress', (progress) => {
      if (!isCurrentRequest() || !progress.lengthComputable || progress.total <= 0) return;
      const percent = Math.round((progress.loaded / progress.total) * 100);
      status.textContent = (isVideoUpload ? 'بارگذاری ویدئو: ' : 'ارسال اطلاعات: ') +
        percent.toLocaleString('fa-IR') + '٪';
    });

    request.addEventListener('load', () => {
      if (!isCurrentRequest()) {
        releaseControls(true);
        return;
      }
      let finalUrl = new URL(request.responseURL || action.href, action.href);
      const redirectLocation = request.status >= 300 && request.status < 400
        ? request.getResponseHeader('Location')
        : null;
      if (redirectLocation) {
        try {
          finalUrl = new URL(redirectLocation, finalUrl);
        } catch {
          showInlineFailure('نشانی مقصد پس از خروج معتبر نیست. صفحه را تازه کنید.');
          return;
        }
      }
      if (finalUrl.origin !== location.origin || !isAllowedDjangoUrl(finalUrl)) {
        showInlineFailure('سرور درخواست را به نشانی پشتیبانی‌نشده هدایت کرد. صفحه را تازه کنید.');
        return;
      }
      if (request.status < 200 || request.status >= 400) {
        showInlineFailure('سامانه درخواست را نپذیرفت (HTTP ' + request.status + '). ورودی‌ها را بررسی و دوباره تلاش کنید.');
        return;
      }

      const finalHash = serverHashForUrl(finalUrl);
      const samePath = finalUrl.pathname === action.pathname && finalUrl.search === action.search;
      if (!samePath && location.hash !== finalHash) {
        if (isSessionLogout) {
          const drawer = form.closest('dialog');
          if (drawer && drawer.open) drawer.close();
        }
        releaseControls(true);
        location.hash = finalHash;
        return;
      }

      try {
        renderDjangoDocument(request.responseText || '', finalUrl, location.hash);
        releaseControls(true);
      } catch {
        showInlineFailure('پاسخ دریافت شد، اما قالب HTML قابل شناسایی نبود. صفحه را تازه کنید.');
      }
    });

    request.addEventListener('error', () => {
      if (!isCurrentRequest()) {
        releaseControls(true);
        return;
      }
      showInlineFailure('ارتباط با سرور قطع شد. اتصال را بررسی کنید و دوباره ارسال کنید.');
    });

    request.addEventListener('abort', () => {
      if (!isCurrentRequest()) {
        releaseControls(true);
        return;
      }
      showInlineFailure(isVideoUpload
        ? 'بارگذاری ویدئو لغو شد. فایل را بررسی کنید و در صورت نیاز دوباره ارسال کنید.'
        : 'ارسال اطلاعات لغو شد. می‌توانید دوباره تلاش کنید.');
    });

    activePostRequest = request;
    request.send(formData);
  }, true);

  window.addEventListener('hashchange', handlePreviewRoute);
  hydratePreviewAccountState();
  handlePreviewRoute();
})();