import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import { build, serve, wait } from './helpers.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tatami-django-bridge-'));
build(tempRoot);
const server = await serve(tempRoot);
const port = new URL(server.url).port;
const base = `http://tatamiplus.ir:${port}`;
const failures = [];
let browser = null;
let postMode = 'success';
let logoutPostCount = 0;
let logoutCsrfSeen = '';

const serverNavItems = [
  ['/', 'خانه'], ['/store/', 'فروشگاه'], ['/preview/#/online-coach', 'مربی آنلاین'],
  ['/club/', 'دوره‌ها'], ['/preview/#/tournaments', 'تورنمنت‌ها'],
  ['/preview/#/videos', 'ویدیوهای ضبط‌شده'], ['/preview/#/ai', 'آنالیز هوش مصنوعی'],
  ['/preview/#/academy', 'آکادمی اساتید'], ['/coaches/', 'مربیان تاتامی'],
  ['/preview/#/clubs', 'باشگاه‌ها'], ['/preview/#/blog', 'بلاگ'],
  ['/preview/#/tatamipedia', 'تاتامی‌پدیا'], ['/preview/#/sponsors', 'حامیان تاتامی پلاس'],
  ['/account/gems/', 'جم'], ['/preview/#/search', 'جستجو']
];
const serverNav = (id) => `<nav id="${id}" aria-label="منوی اصلی">${serverNavItems.map(([href, label], index) =>
  `<a href="${href}"${index === 1 ? ' class="on" aria-current="page"' : ''}>${label}</a>`
).join('')}</nav>`;
const documentHtml = (content, title = 'Django test page', authenticated = true) => `<!doctype html>
<html lang="fa" dir="rtl">
<head><meta charset="utf-8"><title>${title}</title><meta name="description" content="bridge test"></head>
<body>
<header>
  <a class="logo" href="/" aria-label="تاتامی پلاس">تاتامی پلاس</a>
  ${serverNav('nv')}
  <div class="hb">
    ${authenticated ? `<a class="ib tp-gem-header" id="hgem" href="/account/gems/" aria-label="موجودی ۱۲ جم؛ مشاهده تاریخچه">
      <svg class="tp-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10l5 6-10 12L2 9l5-6Z"/></svg>
      <span class="hb-t">جم</span><b class="tp-gem-header-value">۱۲</b>
    </a>` : ''}
    <a class="ib" id="hcart" href="/store/cart/" aria-label="سبد خرید">
      <svg class="tp-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2.4 11.2"/></svg>
      <span class="hb-t">سبد خرید</span>
    </a>
    <a class="ib" id="hbu" href="${authenticated ? '/account/' : '/auth/login/'}" aria-label="${authenticated ? 'حساب کاربری' : 'ورود یا ثبت‌نام'}">
      <svg class="tp-ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/></svg>
      <span class="hb-t">${authenticated ? 'کاربر آزمایشی' : 'ورود / ثبت‌نام'}</span>
    </a>
    <button type="button" class="ib mnb" id="mnb" aria-haspopup="dialog" aria-controls="mnd">بیشتر</button>
  </div>
</header>
<dialog id="mnd" class="tp-drawer">
  <div class="tp-drawer-h"><b>منو</b><button type="button" id="mnx">بستن</button></div>
  ${serverNav('nvd')}
  <div class="tp-drawer-f">${authenticated ? '<form method="post" action="/accounts/logout/"><input type="hidden" name="csrfmiddlewaretoken" value="test-csrf"><button type="submit">خروج</button></form>' : '<a class="btn" href="/auth/login/">ورود / ثبت‌نام</a>'}</div>
</dialog>
<div id="app"><main class="w tp-store-page">${content}</main></div>
<footer class="ft"><nav><a href="/store/">فروشگاه سرور</a><a href="/club/">دوره‌های سرور</a></nav><span id="server-footer-marker">فوتر سرور</span></footer>
</body></html>`;

const storeForm = (result = '') => `
  ${result ? `<p id="post-result">${result}</p>` : ''}
  <form id="bridge-form" method="post" action="/store/">
    <input type="hidden" name="csrfmiddlewaretoken" value="test-csrf">
    <label for="bridge-value">مقدار</label><input id="bridge-value" name="value" value="test">
    <button id="bridge-submit" type="submit">ارسال فرم</button>
  </form>
  <form id="video-form" method="post" action="/store/" enctype="multipart/form-data" data-video-upload-form>
    <input type="hidden" name="csrfmiddlewaretoken" value="test-csrf">
    <label for="video-file">ویدئو</label><input id="video-file" type="file" name="video_file">
    <button id="video-submit" type="submit">بارگذاری ویدئو</button>
  </form>
  <a id="server-cart-link" href="/store/cart/">رفتن به سبد خرید واقعی</a>
  <label for="invite-copy-value">پیوند دعوت</label>
  <input id="invite-copy-value" readonly value="https://tatami.example/coaches/join/ABCD2345/">
  <button id="invite-copy-button" type="button" data-copy-target="invite-copy-value"
          data-copy-feedback="invite-copy-status" data-copy-success="کپی شد">کپی لینک</button>
  <p id="invite-copy-status" role="status" aria-live="polite"></p>`;

try {
  browser = await chromium.launch({
    headless: true,
    args: ['--host-resolver-rules=MAP tatamiplus.ir 127.0.0.1']
  });
  const page = await browser.newPage();
  await page.addInitScript(() => {
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
      this.__tpMethod = method;
      this.__tpUrl = String(url);
      return originalOpen.call(this, method, url, ...rest);
    };
    XMLHttpRequest.prototype.send = function(...args) {
      this.addEventListener('loadend', () => {
        window.__tpXHRHistory = window.__tpXHRHistory || [];
        window.__tpXHRHistory.push({
          method: this.__tpMethod,
          url: this.__tpUrl,
          status: this.status,
          responseURL: this.responseURL,
          responseText: String(this.responseText || '').slice(0, 180),
          headers: this.getAllResponseHeaders()
        });
      });
      return originalSend.apply(this, args);
    };
  });
  const routeTrace = [];
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.pathname === '/' || url.pathname.includes('logout')) {
      routeTrace.push({ event: 'request', method: request.method(), url: request.url(), resourceType: request.resourceType() });
    }
  });
  page.on('response', response => {
    const url = new URL(response.url());
    if (url.pathname === '/' || url.pathname.includes('logout')) {
      routeTrace.push({ event: 'response', status: response.status(), url: response.url() });
    }
  });
  page.on('pageerror', error => failures.push('browser error: ' + error.message));

  const backendCss = fs.readFileSync(new URL('../../django/static/css/backend-templates.css', import.meta.url), 'utf8');
  const modulePagesCss = fs.readFileSync(new URL('../../django/static/css/module-pages.css', import.meta.url), 'utf8');
  await page.route('**/static/css/**', async route => {
    const url = new URL(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: 'text/css; charset=utf-8',
      body: url.pathname === '/static/css/backend-templates.css' ? backendCss : url.pathname === '/static/css/module-pages.css' ? modulePagesCss : 'body{color:inherit}'
    });
  });

  await page.route('**/store/**', async route => {
    const request = route.request();
    const requestUrl = new URL(request.url());
    if (request.method() === 'GET' && requestUrl.pathname === '/store/cart/') {
      const cartMarkup = '<h1 id="cart-target">سبد خرید واقعی از Django</h1>' +
        '<div class="cr tp-cart-actions"><form class="tp-qty" method="post" action="/store/cart/update/" data-quantity-form>' +
        '<label class="tp-qty-label" for="tp-test-quantity">تعداد</label>' +
        '<button class="btn o s tp-qty-step" type="button" data-qty-step="-1" aria-controls="tp-test-quantity" hidden>−</button>' +
        '<input class="tp-qty-input" id="tp-test-quantity" name="quantity" type="number" min="1" max="3" value="2" required>' +
        '<button class="btn o s tp-qty-step" type="button" data-qty-step="1" aria-controls="tp-test-quantity" hidden>+</button>' +
        '<button class="btn o s tp-qty-submit" type="submit">به‌روزرسانی</button></form>' +
        '<form class="tp-cart-remove-form" method="post" action="/store/cart/remove/"><button class="btn o s dg tp-cart-remove-btn" type="submit">حذف</button></form></div>';
      await route.fulfill({
        status: 200,
        contentType: 'text/html; charset=utf-8',
        body: documentHtml(cartMarkup, 'سبد خرید آزمایشی')
      });
      return;
    }
    if (request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'text/html; charset=utf-8',
        body: documentHtml(storeForm(), 'فروشگاه آزمایشی')
      });
      return;
    }
    if (postMode === 'network-error') {
      await route.abort('failed');
      return;
    }
    if (postMode === 'delayed') {
      await wait(1200);
      try {
        await route.fulfill({
          status: 200,
          contentType: 'text/html; charset=utf-8',
          body: documentHtml(storeForm('پاسخ دیررس فرم'), 'پاسخ دیررس')
        });
      } catch {
        // The XHR may be aborted by the UI.
      }
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'text/html; charset=utf-8',
      body: documentHtml(storeForm('فرم با موفقیت به سرور رسید.'), 'نتیجهٔ فرم')
    });
  });

  let serverAuthenticated = true;
  const rootHomeHtml = () => documentHtml('<h1 id="logged-out-home">صفحهٔ خانهٔ سرور</h1>', 'خانه', serverAuthenticated);
  fs.writeFileSync(path.join(tempRoot, 'index.html'), rootHomeHtml());

  // Hold the first session snapshot until the newer route response has rendered.
  let releaseInitialHydration;
  let markInitialHydrationStarted;
  const initialHydrationStarted = new Promise(resolve => { markInitialHydrationStarted = resolve; });
  let initialHydrationHeld = false;
  await page.route(`${base}/`, async route => {
    if (route.request().method() === 'GET' && !initialHydrationHeld) {
      initialHydrationHeld = true;
      markInitialHydrationStarted();
      await new Promise(resolve => { releaseInitialHydration = resolve; });
      await route.fulfill({
        status: 200,
        contentType: 'text/html; charset=utf-8',
        body: documentHtml('<h1 id="stale-guest-home">پاسخ قدیمی مهمان</h1>', 'پاسخ قدیمی', false)
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'text/html; charset=utf-8',
      body: rootHomeHtml()
    });
  });
  await page.route('**/accounts/logout/**', async route => {
    if (route.request().method() !== 'POST') {
      await route.fulfill({ status: 405, body: 'method not allowed' });
      return;
    }
    logoutPostCount += 1;
    serverAuthenticated = false;
    fs.writeFileSync(path.join(tempRoot, 'index.html'), rootHomeHtml());
    logoutCsrfSeen = route.request().headers()['x-csrftoken'] || '';
    assert.equal(logoutCsrfSeen, 'test-csrf');
    await route.fulfill({
      status: 302,
      headers: { location: '/' },
      body: ''
    });
  });


  await page.route('**/club/**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'text/html; charset=utf-8',
      body: documentHtml('<h1 id="club-target">صفحهٔ واقعی باشگاه</h1><a id="club-store-link" href="/store/">بازگشت به فروشگاه</a>', 'باشگاه آزمایشی')
    });
  });


  await page.goto(`${base}/preview/#/store`, { waitUntil: 'load' });
  await initialHydrationStarted;
  await page.locator('#bridge-form').waitFor({ state: 'visible', timeout: 15000 });
  assert.equal(await page.locator('#hbu').getAttribute('href'), '#/profile');
  assert.equal(await page.locator('#hgem').isVisible(), true);

  // A late guest snapshot must not overwrite the authenticated route response.
  releaseInitialHydration();
  await wait(100);
  assert.equal(await page.locator('#hbu').getAttribute('href'), '#/profile',
    'stale initial hydration must not replace the authenticated account link');
  assert.equal(await page.locator('#hgem').isVisible(), true,
    'stale initial hydration must not hide the authenticated gem link');
  assert.equal(await page.locator('#app').getAttribute('data-django-view'), '/store/');
  assert.equal(await page.locator('#app').evaluate(el => el.tagName), 'MAIN', 'the original Preview mount element must not be replaced');
  assert.equal(await page.evaluate(() => getComputedStyle(document.body).display), 'block', 'Django-only body flex rules must not affect the Preview shell');
  assert.equal(await page.locator('body').evaluate(el => el.classList.contains('tp-django-shell')), false);
  assert.equal(await page.locator('#app').evaluate(el => el.classList.contains('tp-store-page')), true);
  await page.setViewportSize({ width: 390, height: 850 });
  const mobilePadding = await page.locator('#app').evaluate(el => {
    const probe = document.createElement('div');
    probe.className = 'w';
    probe.setAttribute('data-mobile-padding-probe', 'true');
    el.append(probe);
    const expected = getComputedStyle(probe).paddingInlineStart;
    const actual = getComputedStyle(el).paddingInlineStart;
    probe.remove();
    return { expected, actual };
  });
  assert.equal(
    mobilePadding.actual,
    mobilePadding.expected,
    'Preview bridge root mobile padding must match a direct Django .w child: ' + JSON.stringify(mobilePadding)
  );
  await page.setViewportSize({ width: 1280, height: 900 });
  assert.equal(await page.locator('#hcart').getAttribute('href'), '#/cart', 'Preview cart route must remain hash-based');
  assert.equal(await page.locator('#cc').count(), 1, 'Preview cart counter mount must remain present');
  assert.equal(await page.locator('#hbu').getAttribute('href'), '#/profile');
  assert.equal((await page.locator('#hbu .hb-t').textContent()).trim(), 'کاربر آزمایشی');
  assert.equal(await page.locator('#hgem').isVisible(), true);
  assert.equal((await page.locator('#hgem .tp-gem-header-value').textContent()).trim(), '۱۲');
  assert.equal(await page.locator('#nv a').count(), 15);
  assert.equal(await page.locator('#nvd a').count(), 15);
  assert.equal(await page.locator('#nv a[href="/store/"]').count(), 0, 'server navigation must not replace Preview navigation');
  assert.equal(await page.locator('#nv a[href="#/store"]').count(), 1);
  assert.equal(await page.locator('#server-footer-marker').count(), 0, 'server footer must not replace Preview footer');
  assert.equal(await page.locator('footer a[href="#/store"]').count(), 1);
  assert.equal(await page.locator('#mndf form[action="/accounts/logout/"]').count(), 1);
  assert.equal(await page.locator('link[data-tp-django-style]').count(), 4);

  for (const width of [1024, 1199, 1200, 1439, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(await page.locator('#mnb').isVisible(), true, 'More menu must remain visible at ' + width + 'px');
  }
  await page.setViewportSize({ width: 1100, height: 900 });
  assert.equal(await page.locator('#nv a:nth-child(5)').isVisible(), false);
  await page.setViewportSize({ width: 1280, height: 900 });
  assert.equal(await page.locator('#nv a:nth-child(5)').isVisible(), true);
  assert.equal(await page.locator('#nv a:nth-child(7)').isVisible(), false);
  await page.setViewportSize({ width: 1500, height: 900 });
  assert.equal(await page.locator('#nv a:nth-child(8)').isVisible(), true);
  assert.equal(await page.locator('#nv a:nth-child(9)').isVisible(), false);
  await page.locator('#mnb').click();
  await page.locator('#mnd[open]').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#nvd a').count(), 15);
  await page.keyboard.press('Escape');


  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async (value) => { window.__copiedInviteLink = value; } }
    });
  });
  await page.locator('#invite-copy-button').click();
  await page.waitForFunction(() => window.__copiedInviteLink === 'https://tatami.example/coaches/join/ABCD2345/');
  assert.equal((await page.locator('#invite-copy-button').textContent()).trim(), 'کپی شد');
  assert.equal((await page.locator('#invite-copy-status').textContent()).trim(), 'پیوند دعوت کپی شد.');

  await page.locator('#bridge-submit').click();
  await page.locator('#post-result').waitFor({ state: 'visible' });
  assert.equal((await page.locator('#post-result').textContent()).trim(), 'فرم با موفقیت به سرور رسید.');

  postMode = 'network-error';
  await page.locator('#bridge-submit').click();
  await page.locator('.tp-bridge-submit-error').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#bridge-submit').isEnabled(), true);
  assert.match(await page.locator('.tp-bridge-submit-error').textContent(), /ارتباط با سرور قطع شد/);

  postMode = 'delayed';
  await page.locator('#video-file').setInputFiles({
    name: 'sample.mp4',
    mimeType: 'video/mp4',
    buffer: Buffer.alloc(2 * 1024 * 1024, 1)
  });
  await page.locator('#video-submit').click();
  await page.locator('.tp-bridge-upload-cancel').waitFor({ state: 'visible' });
  await page.locator('.tp-bridge-upload-cancel').click();
  await page.locator('.tp-bridge-submit-error').filter({ hasText: 'بارگذاری ویدئو لغو شد' }).waitFor({ state: 'visible' });
  assert.equal(await page.locator('#video-submit').isEnabled(), true);

  postMode = 'delayed';
  await page.locator('#bridge-submit').click();
  await page.locator('#bridge-form .tp-bridge-submit-status').waitFor({ state: 'visible' });
  await page.evaluate(() => { location.hash = '#/club'; });
  await page.locator('#club-target').waitFor({ state: 'visible', timeout: 15000 });
  await wait(1400);
  assert.equal(await page.locator('#club-target').count(), 1);
  assert.equal(await page.locator('#post-result').count(), 0);

  await page.locator('#club-store-link').click();
  await page.locator('#bridge-form').waitFor({ state: 'visible', timeout: 15000 });
  await page.locator('#server-cart-link').click();
  await page.locator('#cart-target').waitFor({ state: 'visible', timeout: 15000 });
  assert.equal(await page.locator('#app').getAttribute('data-django-view'), '/store/cart/');
  assert.equal(await page.locator('#app').evaluate(el => el.tagName), 'MAIN');
  assert.match(await page.locator('#app').innerText(), /سبد خرید واقعی از Django/);
  const decreaseQuantity = page.locator('[data-qty-step="-1"]');
  const increaseQuantity = page.locator('[data-qty-step="1"]');
  await increaseQuantity.waitFor({ state: 'visible', timeout: 10000 });
  await page.evaluate(() => {
    window.__tpQuantitySubmitCount = 0;
    document.querySelector('[data-quantity-form]').addEventListener('submit', event => {
      window.__tpQuantitySubmitCount += 1;
      event.preventDefault();
    });
  });
  assert.equal(await page.locator('#tp-test-quantity').inputValue(), '2');
  assert.equal(await decreaseQuantity.isEnabled(), true);
  assert.equal(await increaseQuantity.isEnabled(), true);
  const controlWidth = await increaseQuantity.evaluate(el => el.getBoundingClientRect().width);
  assert.ok(controlWidth >= 44, 'cart quantity controls must be at least 44px wide: ' + controlWidth);
  await increaseQuantity.click();
  assert.equal(await page.locator('#tp-test-quantity').inputValue(), '3');
  assert.equal(await increaseQuantity.isDisabled(), true, 'increase must stop at the server-provided stock maximum');
  await decreaseQuantity.click();
  assert.equal(await page.locator('#tp-test-quantity').inputValue(), '2');
  assert.equal(await decreaseQuantity.isEnabled(), true);
  await decreaseQuantity.click();
  assert.equal(await page.locator('#tp-test-quantity').inputValue(), '1');
  assert.equal(await decreaseQuantity.isDisabled(), true, 'decrease must stop at the minimum quantity');
  assert.equal(await page.evaluate(() => window.__tpQuantitySubmitCount), 0, 'step buttons must not submit the cart form');

  await page.evaluate(() => { location.hash = '#/online-coach'; });
  await page.waitForFunction(() => document.querySelector('#app')?.innerText.includes('روشن کردن دوربین'));
  assert.equal(await page.locator('#app').getAttribute('data-django-view'), null);
  assert.equal(await page.locator('#app').getAttribute('class'), '');
  assert.equal(await page.locator('link[data-tp-django-style]').count(), 0, 'Django styles must be removed when returning to Preview-only routes');
  assert.equal(await page.locator('#app').evaluate(el => el.tagName), 'MAIN');
  assert.equal(await page.locator('#cc').count(), 1);
  assert.equal(await page.locator('#nv a[href="#/store"]').count(), 1);
  assert.equal(await page.locator('footer a[href="#/store"]').count(), 1);
  assert.equal((await page.locator('#hbu .hb-t').textContent()).trim(), 'کاربر آزمایشی', 'real Django session header state must survive Preview-only navigation');
  assert.equal(await page.locator('#mndf form[action="/accounts/logout/"]').count(), 1);
  assert.equal(await page.locator('#server-footer-marker').count(), 0);
  await page.locator('#mnb').click();
  await page.locator('#mnd[open]').waitFor({ state: 'visible' });
  const logoutFormState = await page.locator('#mndf form[action="/accounts/logout/"]').evaluate(form => ({
    action: form.action,
    method: form.method.toUpperCase(),
    insideDrawer: Boolean(form.closest('#mnd')),
    buttonType: form.querySelector('button')?.type || ''
  }));
  assert.deepEqual(logoutFormState, {
    action: base + '/accounts/logout/',
    method: 'POST',
    insideDrawer: true,
    buttonType: 'submit'
  });
  await page.locator('#mndf form[action="/accounts/logout/"] button[type="submit"]').click();
  try {
    await page.locator('#logged-out-home').waitFor({ state: 'visible', timeout: 15000 });
  } catch (error) {
    const state = await page.evaluate(() => ({
      hash: location.hash,
      bodyPath: location.pathname,
      drawerOpen: document.getElementById('mnd')?.open,
      logoutForm: Boolean(document.querySelector('#mndf form[action="/accounts/logout/"]')),
      loginTarget: Boolean(document.getElementById('logged-out-home')),
      accountText: document.getElementById('hbu')?.innerText,
      bridgeError: document.querySelector('#mndf .tp-bridge-submit-error')?.textContent ||
        document.querySelector('#mndf .tp-error-text')?.textContent || '',
      formState: document.querySelector('#mndf form')?.innerText || '',
      xhr: window.__tpXHRHistory || []
    }));
    console.error('DRAWER_LOGOUT_DIAGNOSTICS', JSON.stringify({ routeTrace, state }));
    throw new Error('Drawer logout did not complete | requests=' + logoutPostCount +
      ' | csrf=' + logoutCsrfSeen + ' | routeTrace=' + JSON.stringify(routeTrace) +
      ' | state=' + JSON.stringify(state) + ' | ' + error.message);
  }
  assert.equal(logoutPostCount, 1, 'drawer logout must be submitted through the Preview bridge');
  const homeResponses = routeTrace.filter(item =>
    item.event === 'response' && new URL(item.url).pathname === '/' && item.status === 200
  );
  assert.ok(homeResponses.length >= 2, 'session hydration and the real logout redirect must both receive the Home document');
  assert.equal(await page.locator('#app').getAttribute('data-django-view'), '/');
  assert.equal(await page.locator('#app').evaluate(el => el.tagName), 'MAIN');
  assert.equal(await page.locator('#hbu').getAttribute('href'), '#/login');
  assert.equal((await page.locator('#hbu .hb-t').textContent()).trim(), 'ورود / ثبت‌نام');
  assert.equal(await page.locator('#hgem').isHidden(), true);
  assert.equal(await page.locator('#cc').count(), 1);
  assert.equal(await page.locator('#nv a[href="#/store"]').count(), 1);
  assert.equal(await page.locator('footer a[href="#/store"]').count(), 1);
  assert.equal(await page.locator('#mndf a[href="#/login"]').count(), 1);

  assert.deepEqual(failures, [], 'Preview and Django route transitions must not produce browser runtime errors');
  await page.close();
} catch (error) {
  failures.push(error?.stack || String(error));
} finally {
  if (browser) await browser.close();
  await server.close();
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

if (failures.length) throw new Error(failures.join('\n\n'));
console.log('Django Preview bridge browser checks: 5/5 passed');
