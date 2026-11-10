import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { build, pw, serve, wait } from './helpers.mjs';

const out = fs.mkdtempSync(path.join(os.tmpdir(), 'tatami-card-audit-'));
const djangoCss = fs.readFileSync(new URL('../../django/static/css/tatami.css', import.meta.url), 'utf8');
build(out);
const server = await serve(path.join(out, 'student'));
const browser = await pw.chromium.launch({ headless: true });
const failures = [];

async function checkDjangoServerRenderedCards() {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.setContent(`<!doctype html><html lang="fa" dir="rtl"><body>
    <div class="w">
      <div class="pg" id="django-products">
        <article class="card pcd"><figure class="ph r43"></figure><div class="b"><div class="mu sm">تجهیزات</div><h3>لباس جودو</h3><div class="tp-price">از ۱٬۲۰۰٬۰۰۰ تومان</div><div class="pa"><a class="btn s">مشاهدهٔ محصول</a></div></div></article>
        <article class="card pcd"><figure class="ph r43"></figure><div class="b"><div class="mu sm">لباس و تجهیزات حرفه‌ای</div><h3>لباس مخصوص تمرین و مسابقات جودو با پارچهٔ مقاوم و دوخت تقویت‌شده</h3><div class="mu sm">سطح: پیشرفته</div><div class="tp-price">از ۲٬۴۰۰٬۰۰۰ تومان</div><div class="pa"><a class="btn s">مشاهدهٔ محصول</a></div></div></article>
        <article class="card pcd"><figure class="ph r43"></figure><div class="b"><div class="mu sm">کمربند</div><h3>کمربند جودو</h3><div class="mu sm">سطح: همهٔ سطوح</div><div class="tp-price">از ۳۵۰٬۰۰۰ تومان</div><div class="pa"><a class="btn s">مشاهدهٔ محصول</a></div></div></article>
      </div>
      <section class="d-s"><ul class="tp-coaches" id="django-coaches">
        <li><a class="d-c tp-coach qa"><span class="d-av">س</span><span><b>سارا احمدی</b><span class="mu sm">مربی</span></span></a></li>
        <li><a class="d-c tp-coach qa"><span class="d-av">م</span><span><b>محمد رضایی</b><span class="mu sm">مربی ارشد تیم ملی</span></span></a></li>
      </ul></section>
    </div></body></html>`);
  await page.addStyleTag({ content: djangoCss });
  const productMetrics = await page.locator('#django-products > .pcd').evaluateAll(cards => {
    const rows = new Map();
    for (const card of cards) {
      const rect = card.getBoundingClientRect();
      const action = card.querySelector('.pa > .btn');
      const row = Math.round(rect.top / 4) * 4;
      const values = rows.get(row) || [];
      values.push({ bottom: rect.bottom, actionBottom: action.getBoundingClientRect().bottom });
      rows.set(row, values);
    }
    return [...rows.values()].filter(row => row.length > 1).map(row => ({
      cardSpread: Math.max(...row.map(x => x.bottom)) - Math.min(...row.map(x => x.bottom)),
      actionSpread: Math.max(...row.map(x => x.actionBottom)) - Math.min(...row.map(x => x.actionBottom))
    }));
  });
  assert.ok(productMetrics.length > 0, 'Django store: expected multiple products in a desktop grid row');
  for (const row of productMetrics) {
    assert.ok(row.cardSpread <= 2, 'Django store: card bottoms differ by ' + row.cardSpread + 'px');
    assert.ok(row.actionSpread <= 2, 'Django store: CTA bottoms differ by ' + row.actionSpread + 'px');
  }
  const coachMetrics = await page.locator('#django-coaches > li').evaluateAll(items => items.map(item => item.getBoundingClientRect().bottom));
  assert.ok(coachMetrics.length >= 2, 'Django coaches: expected at least two cards');
  assert.ok(Math.max(...coachMetrics) - Math.min(...coachMetrics) <= 2, 'Django coaches: cards are not equal height');
  await page.close();

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.setContent(`<!doctype html><html lang="fa" dir="rtl"><body><div class="w"><div class="pg">
    <article class="card pcd"><div class="b"><h3>محصول یک</h3><div class="pa"><a class="btn">مشاهده</a></div></div></article>
    <article class="card pcd"><div class="b"><h3>عنوان محصول بلندتر برای آزمون موبایل</h3><div class="pa"><a class="btn">مشاهده</a></div></div></article>
  </div></div></body></html>`);
  await mobile.addStyleTag({ content: djangoCss });
  const metrics = await mobile.evaluate(() => ({ width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
  assert.ok(metrics.scrollWidth <= metrics.width + 1, 'Django store: horizontal overflow at 390px');
  await mobile.close();
  console.log('PASS Django server-rendered product/coach card alignment and mobile overflow');
}

async function checkPage(page, route, label, cardSelector, actionSelector) {
  await page.evaluate(hash => { location.hash = hash; }, route);
  await wait(180);
  const result = await page.evaluate(({ cardSelector, actionSelector }) => {
    const cards = [...document.querySelectorAll(cardSelector)];
    const rows = new Map();
    for (const card of cards) {
      const rect = card.getBoundingClientRect();
      const action = card.querySelector(actionSelector);
      if (!action || rect.width < 1) continue;
      const rowKey = Math.round(rect.top / 4) * 4;
      const actionRect = action.getBoundingClientRect();
      const values = rows.get(rowKey) || [];
      values.push({ cardBottom: rect.bottom, actionBottom: actionRect.bottom, actionTop: actionRect.top });
      rows.set(rowKey, values);
    }
    return {
      count: cards.length,
      rows: [...rows.values()].filter(row => row.length >= 2).map(row => ({
        count: row.length,
        cardSpread: Math.max(...row.map(x => x.cardBottom)) - Math.min(...row.map(x => x.cardBottom)),
        actionSpread: Math.max(...row.map(x => x.actionBottom)) - Math.min(...row.map(x => x.actionBottom))
      }))
    };
  }, { cardSelector, actionSelector });
  assert.ok(result.count >= 2, label + ': expected at least two cards');
  assert.ok(result.rows.length > 0, label + ': expected at least one row with multiple cards');
  for (const row of result.rows) {
    assert.ok(row.cardSpread <= 2, label + ': card bottoms differ by ' + row.cardSpread + 'px');
    assert.ok(row.actionSpread <= 2, label + ': action bottoms differ by ' + row.actionSpread + 'px');
  }
  console.log('PASS ' + label + ': ' + result.count + ' cards, ' + result.rows.length + ' multi-card rows aligned');
}

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(server.url + '/index.html');
  await wait(250);
  await checkPage(page, '#/store', 'store product cards', '#app .pg > .pcd', '.pa > .btn:first-child');
  await checkPage(page, '#/videos', 'video cards', '#app .pg > .vcd', '.pa > .btn:first-child');
  await checkPage(page, '#/coaches', 'coach cards', '#app .pg > article.card', '.b > a.btn:last-child');
  await checkPage(page, '#/courses', 'course cards', '#app .pg > .tp-course-card', '.tp-cluster:last-child a.btn');
  assert.deepEqual(errors, [], 'page runtime errors');
  await page.close();

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.goto(server.url + '/index.html');
  for (const route of ['#/store', '#/videos', '#/coaches', '#/courses']) {
    await mobile.evaluate(hash => { location.hash = hash; }, route);
    await wait(120);
    const metrics = await mobile.evaluate(() => ({
      width: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      invalid: [...document.querySelectorAll('#app .pg > *')].filter(el => el.getBoundingClientRect().width < 1).length
    }));
    assert.ok(metrics.scrollWidth <= metrics.width + 1, route + ': horizontal overflow at 390px');
    assert.equal(metrics.invalid, 0, route + ': hidden or zero-width cards');
  }
  await mobile.close();
} catch (error) {
  failures.push(error?.stack || String(error));
  console.error(error);
} finally {
  await browser.close();
  await server.close();
  fs.rmSync(out, { recursive: true, force: true });
}
if (failures.length) throw new Error(failures.join('\n\n'));
console.log('Global card alignment browser regression: 6 sections passed, including Django store and coaches');
