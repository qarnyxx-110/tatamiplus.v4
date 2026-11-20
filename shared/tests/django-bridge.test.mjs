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

  await page.route('**/coaches/**', async route => {
    await route.fulfill({status:200,contentType:'text/html; charset=utf-8',body:documentHtml('<h1 id="coach-target">فهرست واقعی مربیان</h1>','مربیان')});
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
    await route.fulfill({
      status: 200,
      contentType: 'text/html; charset=utf-8',
      body: documentHtml('<h1 id="club-target">صفحهٔ واقعی باشگاه</h1>', 'باشگاه آزمایشی')
    });
  });

  await page.goto(`${base}/preview/#/store`, { waitUntil: 'load' });
  await page.locator('#bridge-form').waitFor({ state: 'visible', timeout: 15000 });
  assert.equal(await page.locator('#app').getAttribute('data-django-view'), '/store/');

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
    ['#/login?next=%23%2Fblog%2F%D8%A7%D9%88%DA%86%DB%8C-%D9%85%D8%A7%D8%AA%D8%A7', '/auth/login/?next=%2Fblog%2F%D8%A7%D9%88%DA%86%DB%8C-%D9%85%D8%A7%D8%AA%D8%A7%2F']
  ];
  for (const [hash, expected] of authRoutes) {
    await page.evaluate(value => { location.hash = value; }, hash);
    await page.waitForFunction(
      target => document.querySelector('#auth-target')?.textContent.trim() === target,
      expected,
      { timeout: 15000 }
    );
  }

  await page.close();
} catch (error) {
  failures.push(error?.stack || String(error));
} finally {
  if (browser) await browser.close();
  await server.close();
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

if (failures.length) throw new Error(failures.join('\n\n'));
console.log('Django Preview bridge browser checks: existing regression passed; blog routes: list/detail/Persian slug passed; auth routes: 7/7 passed');
