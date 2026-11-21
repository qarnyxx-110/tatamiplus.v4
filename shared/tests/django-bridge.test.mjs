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

const documentHtml = (content, title = 'Django test page') => `<!doctype html>
<html lang="fa" dir="rtl">
<head><meta charset="utf-8"><title>${title}</title><meta name="description" content="bridge test"></head>
<body><div id="app">${content}</div></body></html>`;

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
  page.on('pageerror', error => failures.push('browser error: ' + error.message));

  await page.route('**/store/**', async route => {
    const request = route.request();
    if (request.method() === 'GET') {
      const pathname = new URL(request.url()).pathname;
      if (pathname === '/store/cart/') {
        await route.fulfill({
          status: 200,
          contentType: 'text/html; charset=utf-8',
          body: documentHtml('<h1 id="cart-target">سبد خرید Django</h1>', 'سبد خرید')
        });
        return;
      }
      if (/^\/store\/[^/]+\/$/.test(pathname)) {
        await route.fulfill({
          status: 200,
          contentType: 'text/html; charset=utf-8',
          body: documentHtml('<h1 id="product-target">جزئیات محصول Django</h1>', 'جزئیات محصول')
        });
        return;
      }
      const storeUrl = new URL(request.url());
      const queryMarkers = '<output id="store-query-string">' + storeUrl.search + '</output>' +
        '<output id="store-query-value">' + (storeUrl.searchParams.get('query') || '') + '</output>';
      const productCard = '<article class="tp-product-card"><h3>لباس جودو سامکو مدل Approved (سایز S تا XXL)</h3><a href="/store/samko-approved/">مشاهده محصول</a></article>';
      await route.fulfill({
        status: 200,
        contentType: 'text/html; charset=utf-8',
        body: documentHtml(queryMarkers + storeForm() + productCard, 'فروشگاه آزمایشی')
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

  await page.route('**/checkout/**', async route => {
    const pathname = new URL(route.request().url()).pathname;
    await route.fulfill({
      status: 200,
      contentType: 'text/html; charset=utf-8',
      body: documentHtml('<h1 id="checkout-target">' + pathname + '</h1>', 'تسویه‌حساب')
    });
  });

  await page.route('**/orders/**', async route => {
    const pathname = new URL(route.request().url()).pathname;
    await route.fulfill({
      status: 200,
      contentType: 'text/html; charset=utf-8',
      body: documentHtml('<h1 id="orders-target">' + pathname + '</h1>', 'سفارش‌ها')
    });
  });

  await page.route('**/coaches/**', async route => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === '/coaches/') {
      await route.fulfill({
        status: 200,
        contentType: 'text/html; charset=utf-8',
        body: documentHtml(
          '<ul class="tp-coaches"><li><article class="card tp-coach-card"><div class="b tp-coach-card-copy"><b>سارا احمدی</b><a href="/coaches/42/">مشاهده پروفایل</a></div></article></li></ul>',
          'مربیان'
        )
      });
      return;
    }
    if (pathname === '/coaches/42/') {
      await route.fulfill({status:200,contentType:'text/html; charset=utf-8',body:documentHtml('<h1 id="coach-profile-target">پروفایل واقعی سارا احمدی</h1>','پروفایل مربی')});
      return;
    }
    await route.fulfill({status:404,contentType:'text/html; charset=utf-8',body:documentHtml('پیدا نشد','۴۰۴')});
  });

  await page.route('**/blog/**', async route => {
    const url = new URL(route.request().url());
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length > 1) {
      const slug = decodeURIComponent(parts[1]);
      await route.fulfill({
        status: 200,
        contentType: 'text/html; charset=utf-8',
        body: documentHtml(
          '<a id="blog-back-link" href="/blog/">بازگشت به وبلاگ</a><h1 id="blog-detail-target">' + slug + '</h1>',
          'جزئیات وبلاگ'
        )
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'text/html; charset=utf-8',
      body: documentHtml('<h1 id="blog-list-target">مطالب منتشرشده</h1><a id="blog-post-link" href="/blog/uchi-mata/">اوچی‌ماتا</a>', 'وبلاگ')
    });
  });

  await page.route('**/club/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/club/') {
      await route.fulfill({
        status: 200,
        contentType: 'text/html; charset=utf-8',
        body: documentHtml(
          '<div class="tp-course-grid"><article class="tp-course-card"><h3>آشنایی با فنون پایه جودو</h3><a href="/club/course/judo-foundations-live/">مشاهده دوره</a></article></div><h1 id="club-target">فهرست دوره‌های واقعی</h1>',
          'باشگاه مجازی'
        )
      });
      return;
    }
    if (url.pathname === '/club/course/judo-foundations-live/') {
      await route.fulfill({
        status: 200,
        contentType: 'text/html; charset=utf-8',
        body: documentHtml('<h1 id="course-detail-target">جزئیات واقعی دوره از Django</h1>', 'جزئیات دوره')
      });
      return;
    }
    await route.fulfill({
      status: 404,
      contentType: 'text/html; charset=utf-8',
      body: documentHtml('پیدا نشد', '۴۰۴')
    });
  });

  await page.goto(`${base}/preview/#/store`, { waitUntil: 'load' });
  await page.locator('#bridge-form').waitFor({ state: 'visible', timeout: 15000 });
  assert.equal(await page.locator('#app').getAttribute('data-django-view'), '/store/');

  await page.evaluate(() => { location.hash = '#/store?min_price=100.50&max_price=500.75&page=2'; });
  await page.locator('#bridge-form').waitFor({ state: 'visible', timeout: 15000 });
  assert.equal(await page.locator('#app').getAttribute('data-django-view'), '/store/');
  assert.equal(
    (await page.locator('#store-query-string').textContent()).trim(),
    '?min_price=100.50&max_price=500.75&page=2'
  );

  await page.evaluate(() => { location.hash = '#/store?min_price=100.999&page=2'; });
  await page.locator('#bridge-form').waitFor({ state: 'visible', timeout: 15000 });
  assert.equal(await page.locator('#app').getAttribute('data-django-view'), '/store/');
  assert.equal((await page.locator('#store-query-string').textContent()).trim(), '?page=2');

  await page.evaluate(() => { location.hash = '#/store'; });
  await page.locator('#bridge-form').waitFor({ state: 'visible', timeout: 15000 });

  // Preview product IDs resolve to Django slugs from the real product cards.
  await page.evaluate(() => { location.hash = '#/product/0'; });
  await page.locator('#product-target').waitFor({ state: 'visible', timeout: 15000 });
  assert.equal(await page.locator('#app').getAttribute('data-django-view'), '/store/samko-approved/');

  await page.evaluate(() => { location.hash = '#/cart'; });
  await page.locator('#cart-target').waitFor({ state: 'visible', timeout: 15000 });
  assert.equal(await page.locator('#app').getAttribute('data-django-view'), '/store/cart/');

  await page.evaluate(() => { location.hash = '#/checkout'; });
  await page.locator('#checkout-target').waitFor({ state: 'visible', timeout: 15000 });
  assert.equal(await page.locator('#app').getAttribute('data-django-view'), '/checkout/address/');

  await page.evaluate(() => { location.hash = '#/orders'; });
  await page.locator('#orders-target').waitFor({ state: 'visible', timeout: 15000 });
  assert.equal(await page.locator('#app').getAttribute('data-django-view'), '/orders/');

  await page.evaluate(() => { location.hash = '#/store'; });
  await page.locator('#bridge-form').waitFor({ state: 'visible', timeout: 15000 });

  await page.evaluate(() => { location.hash = '#/search?q=' + encodeURIComponent('اوکمی'); });
  await page.waitForFunction(() => document.querySelector('#app h1')?.textContent.trim() === 'جستجو');
  assert.equal(await page.locator('#app a[href^="#/blog/"]').count(), 0);
  assert.match(await page.locator('#app').innerText(), /مقاله‌های منتشرشدهٔ وبلاگ مستقیماً از Django دریافت می‌شوند/);

  await page.evaluate(() => { location.hash = '#/store'; });
  await page.locator('#bridge-form').waitFor({ state: 'visible', timeout: 15000 });

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

  await page.evaluate(() => { location.hash = '#/academy'; });
  await page.locator('#coach-target').waitFor({ state: 'visible', timeout: 15000 });
  assert.equal(await page.locator('#app').getAttribute('data-django-view'), '/coaches/');

  await page.evaluate(() => { location.hash = '#/coaches/sara-ahmadi'; });
  await page.locator('#coach-profile-target').waitFor({ state: 'visible', timeout: 15000 });
  assert.equal(await page.locator('#app').getAttribute('data-django-view'), '/coaches/42/');

  await page.evaluate(() => { location.hash = '#/courses/judo-foundations'; });
  await page.locator('#course-detail-target').waitFor({ state: 'visible', timeout: 15000 });
  assert.equal(await page.locator('#app').getAttribute('data-django-view'), '/club/course/judo-foundations-live/');

  await page.evaluate(() => { location.hash = '#/blog'; });
  await page.locator('#blog-list-target').waitFor({ state: 'visible', timeout: 15000 });
  assert.equal(await page.locator('#app').getAttribute('data-django-view'), '/blog/');
  await page.locator('#blog-post-link').click();
  await page.locator('#blog-detail-target').waitFor({ state: 'visible', timeout: 15000 });
  assert.equal(await page.locator('#app').getAttribute('data-django-view'), '/blog/uchi-mata/');
  await page.locator('#blog-back-link').click();
  await page.locator('#blog-list-target').waitFor({ state: 'visible', timeout: 15000 });
  assert.equal(await page.locator('#app').getAttribute('data-django-view'), '/blog/');

  await page.evaluate(() => { location.hash = '#/blog/اوچی-ماتا'; });
  await page.locator('#blog-detail-target').waitFor({ state: 'visible', timeout: 15000 });
  assert.equal((await page.locator('#blog-detail-target').textContent()).trim(), 'اوچی-ماتا');
  assert.equal(
    await page.locator('#app').getAttribute('data-django-view'),
    '/blog/' + encodeURIComponent('اوچی-ماتا') + '/'
  );

  await page.evaluate(() => { location.hash = '#/blog/' + encodeURIComponent('اوچی-ماتا'); });
  await page.locator('#blog-detail-target').waitFor({ state: 'visible', timeout: 15000 });
  assert.equal(await page.locator('#app').getAttribute('data-django-view'), '/blog/' + encodeURIComponent('اوچی-ماتا') + '/');

  await page.evaluate(() => { location.hash = '#/blog/one%252Ftwo'; });
  await page.locator('#blog-list-target').waitFor({ state: 'visible', timeout: 15000 });
  assert.equal(await page.locator('#app').getAttribute('data-django-view'), '/blog/');

  await page.route('**/auth/**', async route => {
    const url = new URL(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: 'text/html; charset=utf-8',
      body: documentHtml('<h1 id="auth-target">' + url.pathname + url.search + '</h1>', 'احراز هویت آزمایشی')
    });
  });

  const authRoutes = [
    ['#/login', '/auth/login/'],
    ['#/register?role=coach&next=%23%2Fcart', '/auth/login/sms/?role=coach&next=%2Fstore%2Fcart%2F'],
    ['#/role?role=student', '/auth/login/sms/?role=student'],
    ['#/password-reset', '/auth/password/reset/'],
    ['#/set-password', '/auth/password/set/'],
    ['#/login?next=%23%2Fblog%2Fuchi-mata', '/auth/login/?next=%2Fblog%2Fuchi-mata%2F'],
    ['#/login?next=%23%2Fblog%2F%D8%A7%D9%88%DA%86%DB%8C-%D9%85%D8%A7%D8%AA%D8%A7', '/auth/login/?next=%2Fblog%2F%D8%A7%D9%88%DA%86%DB%8C-%D9%85%D8%A7%D8%AA%D8%A7%2F'],
    ['#/login?next=%23%2Fblog%2F..%2Fauth', '/auth/login/'],
    ['#/login?next=%23%2Fblog%2Fone%2Ftwo', '/auth/login/'],
    ['#/login?next=%23%2Fblog%2Fone%25252Ftwo', '/auth/login/']
  ];
  for (const [hash, expected] of authRoutes) {
    await page.evaluate(value => { location.hash = value; }, hash);
    await page.waitForFunction(
      target => document.querySelector('#auth-target')?.textContent.trim() === target,
      expected,
      { timeout: 15000 }
    );
  }

  // Live search must not present local reference/demo products or coach profiles as Django records.
  await page.evaluate(() => { location.hash = '#/search?q=' + encodeURIComponent('عنوان مقاله واقعی'); });
  await page.locator('#app h1').filter({ hasText: 'جستجو' }).waitFor({ state: 'visible' });
  const publishedBlogLink = page.locator('#app a[href="#/blog"]');
  assert.equal(await publishedBlogLink.count(), 1);
  assert.match(await page.locator('#app').innerText(), /در داده‌های محلی نتیجه‌ای پیدا نشد؛ بخش‌های متصل به سامانه را بررسی کنید/);
  assert.match(await page.locator('#app').innerText(), /جست‌وجوی سمت سرور وبلاگ هنوز قرارداد ندارد/);
  assert.equal(await page.locator('#app a[href^="#/blog/"]').count(), 0);
  await publishedBlogLink.click();
  await page.locator('#blog-list-target').waitFor({ state: 'visible', timeout: 15000 });
  assert.equal(await page.locator('#app').getAttribute('data-django-view'), '/blog/');

  await page.evaluate(() => { location.hash = '#/search?q=' + encodeURIComponent('سامکو'); });
  await page.locator('#app h1').filter({ hasText: 'جستجو' }).waitFor({ state: 'visible' });
  assert.equal(await page.locator('#app a[href^="#/product/"]').count(), 0);
  const liveStoreLink = page.locator('#app a[href^="#/store?query="]');
  assert.equal(await liveStoreLink.count(), 1);
  assert.match(await page.locator('#app').innerText(), /قیمت فروش و موجودی ثبت‌شده در Django/);
  await liveStoreLink.click();
  await page.locator('#store-query-value').waitFor({ state: 'visible', timeout: 15000 });
  assert.equal((await page.locator('#store-query-value').textContent()).trim(), 'سامکو');

  await page.evaluate(() => { location.hash = '#/search?q=' + encodeURIComponent('سارا احمدی'); });
  await page.locator('#app h1').filter({ hasText: 'جستجو' }).waitFor({ state: 'visible' });
  assert.equal(await page.locator('#app a[href="#/coaches/sara-ahmadi"]').count(), 0);
  assert.equal(await page.locator('#app a[href="#/coaches"]').count(), 1);
  assert.match(await page.locator('#app').innerText(), /فقط پروفایل‌های عمومی و منتشرشده در Django/);

  // Sample clubs remain searchable, explicitly labelled, and their detail route stays in Preview.
  await page.evaluate(() => { location.hash = '#/search?q=' + encodeURIComponent('ققنوس'); });
  await page.locator('#app a[href="#/club/0"]').waitFor({ state: 'visible' });
  assert.match(await page.locator('#app').innerText(), /داده نمونه · تهران/);

  await page.locator('#app a[href="#/club/0"]').click();
  await page.locator('#app .tp-club-detail').waitFor({ state: 'visible', timeout: 15000 });
  assert.match(await page.locator('#app').innerText(), /باشگاه جودوی ققنوس/);
  assert.match(await page.locator('#app').innerText(), /اطلاعات نمونه/);
  assert.notEqual(await page.locator('#app').getAttribute('data-django-view'), '/club/');

  // The legacy recorded-videos tab is intentionally a local demo until a real backend feed exists.
  await page.evaluate(() => { location.hash = '#/videos'; });
  await page.locator('#app h1').filter({ hasText: 'باشگاه مجازی' }).waitFor({ state: 'visible' });
  assert.match(await page.locator('#app [role="note"]').innerText(), /نسخهٔ پیش‌نمایش/);
  assert.match(await page.locator('#app [role="note"]').innerText(), /دادهٔ نمونه و محلی‌اند/);
  assert.match(await page.locator('#app [role="note"]').innerText(), /از داده‌های واقعی Django دریافت نمی‌شود/);

  await page.close();
} catch (error) {
  failures.push(error?.stack || String(error));
} finally {
  if (browser) await browser.close();
  await server.close();
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

if (failures.length) throw new Error(failures.join('\n\n'));
console.log('Django Preview bridge browser checks: existing regression passed; blog routes, live search provenance, sample club routes and video demo notice passed; auth routes: 10/10 passed');
