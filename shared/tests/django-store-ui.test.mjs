import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';

const source = fs.readFileSync(new URL('../../django/static/js/module-pages.js', import.meta.url), 'utf8');
const browser = await chromium.launch({ headless: true });
const failures = [];
const html = `<!doctype html>
<html lang="fa" dir="rtl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
  body{margin:0;font-family:Tahoma,sans-serif} .spacer{height:1100px}
  [hidden]{display:none!important}
  .tp-product-gallery-main{position:relative;height:280px}
  .tp-product-gallery-main img{width:100%;height:100%;object-fit:contain}
</style></head>
<body>
<main class="tp-store-page">
  <section data-product-gallery aria-label="گالری تصاویر محصول">
    <div class="tp-product-gallery-main">
      <figure data-gallery-main><img data-gallery-main-image src="https://example.test/a.jpg" alt="تصویر اول"></figure>
      <button type="button" data-gallery-open id="gallery-open">بزرگ‌نمایی</button>
    </div>
    <div class="tp-product-gallery-thumbs">
      <button type="button" data-gallery-select data-src="https://example.test/a.jpg" data-alt="تصویر اول" aria-pressed="true">۱</button>
      <button type="button" data-gallery-select data-src="https://example.test/b.jpg" data-alt="تصویر دوم" aria-pressed="false">۲</button>
      <button type="button" data-gallery-select data-src="https://example.test/c.jpg" data-alt="تصویر سوم" aria-pressed="false">۳</button>
    </div>
    <dialog data-gallery-dialog aria-label="گالری تصویر">
      <div><span data-gallery-counter></span><button type="button" data-gallery-close>بستن</button></div>
      <div data-gallery-stage>
        <button type="button" data-gallery-prev>قبلی</button>
        <img data-gallery-dialog-image src="https://example.test/a.jpg" alt="">
        <button type="button" data-gallery-next>بعدی</button>
      </div>
    </dialog>
  </section>

  <div class="spacer"></div>
  <section aria-label="خرید محصول">
    <form id="tp-product-form" data-product-form data-starting-price="100000" data-starting-price-label="۱۰۰٬۰۰۰">
      <div data-variant-native>
        <label for="id_variant">سایز و رنگ</label>
        <select id="id_variant" name="variant">
          <option value="">انتخاب تنوع</option>
          <option value="v1">S، سفید</option>
          <option value="v2">S، آبی</option>
          <option value="v3">M، سفید</option>
          <option value="v4">M، آبی</option>
          <option value="v5">L، آبی</option>
        </select>
      </div>
      <div data-variant-ui hidden>
        <div data-variant-records hidden>
          <i data-variant-record data-id="v1" data-size="S" data-color="سفید" data-stock="0" data-price="100000" data-price-label="۱۰۰٬۰۰۰"></i>
          <i data-variant-record data-id="v2" data-size="S" data-color="آبی" data-stock="3" data-price="120000" data-price-label="۱۲۰٬۰۰۰"></i>
          <i data-variant-record data-id="v3" data-size="M" data-color="سفید" data-stock="2" data-price="130000" data-price-label="۱۳۰٬۰۰۰"></i>
          <i data-variant-record data-id="v4" data-size="M" data-color="آبی" data-stock="0" data-price="140000" data-price-label="۱۴۰٬۰۰۰"></i>
          <i data-variant-record data-id="v5" data-size="L" data-color="آبی" data-stock="0" data-price="150000" data-price-label="۱۵۰٬۰۰۰"></i>
        </div>
        <fieldset data-variant-group="size"><legend>سایز</legend><div data-variant-options="size"></div><button type="button" data-dialog-open="tp-size-guide-dialog">راهنمای سایز</button></fieldset>
        <fieldset data-variant-group="color"><legend>رنگ</legend><div data-variant-options="color"></div></fieldset>
        <p data-variant-notice role="status"></p>
      </div>
      <label for="id_quantity">تعداد</label><input id="id_quantity" name="quantity" type="number" min="1" value="1">
      <p data-variant-price-display>۱۰۰٬۰۰۰ تومان</p>
      <p data-variant-stock-display></p>
      <button type="submit" data-variant-submit>افزودن به سبد</button>
    </form>
    <dl><dd data-product-spec-size>—</dd><dd data-product-spec-color>—</dd><dd data-product-spec-stock>—</dd></dl>
    <section data-product-tabs>
      <div role="tablist">
        <button type="button" role="tab" id="tp-tab-description" aria-selected="true" data-product-tab="description">توضیحات</button>
        <button type="button" role="tab" id="tp-tab-specifications" aria-selected="false" data-product-tab="specifications">مشخصات</button>
      </div>
      <section role="tabpanel" aria-labelledby="tp-tab-description" data-product-tab-panel="description">شرح</section>
      <section role="tabpanel" aria-labelledby="tp-tab-specifications" data-product-tab-panel="specifications" hidden>مشخصات</section>
    </section>
  </section>
  <dialog id="tp-size-guide-dialog"><button type="button" data-dialog-close>بستن</button><p>جدول سایز هنوز ثبت نشده است.</p></dialog>
  <div data-product-sticky hidden><b data-sticky-price></b><span data-sticky-stock></span><button type="submit" form="tp-product-form" data-variant-submit disabled>افزودن</button></div>

  <form id="card-add" method="post" action="/store/sample/">
    <input type="hidden" name="csrfmiddlewaretoken" value="csrf-sample">
    <input type="hidden" name="variant" value="v-single">
    <input type="hidden" name="quantity" value="1">
    <button type="submit">افزودن به سبد</button>
  </form>
</main>
</body></html>`;

const page = await browser.newPage({ viewport: { width: 390, height: 800 } });
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));

try {
  await page.setContent(html, { waitUntil: 'domcontentloaded' });
  await page.addScriptTag({ content: source });

  await page.locator('[data-gallery-select]').nth(1).click();
  assert.equal(await page.locator('[data-gallery-main-image]').getAttribute('src'), 'https://example.test/b.jpg');
  assert.equal(await page.locator('[data-gallery-select]').nth(1).getAttribute('aria-pressed'), 'true');
  await page.locator('#gallery-open').click();
  assert.equal(await page.locator('[data-gallery-dialog]').evaluate(el => el.open), true);
  await page.locator('[data-gallery-next]').click();
  assert.equal(await page.locator('[data-gallery-dialog-image]').getAttribute('src'), 'https://example.test/c.jpg');
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('[data-gallery-dialog-image]').getAttribute('src'), 'https://example.test/a.jpg');
  await page.locator('[data-gallery-stage]').dispatchEvent('pointerdown', { pointerType: 'touch', pointerId: 7, clientX: 280, clientY: 150 });
  await page.locator('[data-gallery-stage]').dispatchEvent('pointerup', { pointerType: 'touch', pointerId: 7, clientX: 90, clientY: 155 });
  assert.equal(await page.locator('[data-gallery-dialog-image]').getAttribute('src'), 'https://example.test/b.jpg');
  await page.locator('[data-gallery-close]').click();
  assert.equal(await page.locator('[data-gallery-dialog]').evaluate(el => el.open), false);

  assert.equal(await page.locator('[data-variant-native]').isHidden(), true);
  assert.equal(await page.locator('[data-variant-ui]').isVisible(), true);
  assert.equal(await page.locator('[data-variant-choice="size"][data-value="L"]').isDisabled(), true);

  await page.locator('[data-variant-choice="size"][data-value="S"]').click();
  await page.locator('[data-variant-choice="color"][data-value="سفید"]').click();
  assert.equal(await page.locator('#tp-product-form [data-variant-submit]').isDisabled(), true);
  assert.match(await page.locator('[data-variant-notice]').textContent(), /این ترکیب.*موجود نیست/);

  // A non-stock combination must not trap the customer: the other real, in-stock color remains selectable.
  assert.equal(await page.locator('[data-variant-choice="color"][data-value="آبی"]').isDisabled(), false);
  await page.locator('[data-variant-choice="color"][data-value="آبی"]').click();
  assert.equal(await page.locator('#id_variant').inputValue(), 'v2');
  assert.equal(await page.locator('[data-variant-price-display]').textContent(), '۱۲۰٬۰۰۰ تومان');
  assert.equal(await page.locator('#id_quantity').getAttribute('max'), '3');
  assert.equal(await page.locator('[data-product-spec-size]').textContent(), 'S');
  assert.equal(await page.locator('[data-product-spec-color]').textContent(), 'آبی');
  assert.equal(await page.locator('#tp-product-form [data-variant-submit]').isEnabled(), true);

  await page.locator('#id_quantity').fill('5');
  await page.locator('[data-variant-choice="size"][data-value="M"]').click();
  await page.locator('[data-variant-choice="color"][data-value="سفید"]').click();
  assert.equal(await page.locator('#id_variant').inputValue(), 'v3');
  assert.equal(await page.locator('#id_quantity').getAttribute('max'), '2');
  assert.equal(await page.locator('#id_quantity').inputValue(), '2');
  assert.equal(await page.locator('[data-product-spec-stock]').textContent(), 'موجود · حداکثر ۲ عدد');

  await page.locator('#tp-tab-specifications').click();
  assert.equal(await page.locator('#tp-panel-specifications').isVisible().catch(() => true), true);
  assert.equal(await page.locator('#tp-panel-description').isHidden(), true);

  await page.locator('[data-dialog-open="tp-size-guide-dialog"]').click();
  assert.equal(await page.locator('#tp-size-guide-dialog').evaluate(el => el.open), true);
  await page.locator('#tp-size-guide-dialog [data-dialog-close]').click();
  assert.equal(await page.locator('#tp-size-guide-dialog').evaluate(el => el.open), false);

  await page.waitForFunction(() => document.querySelector('[data-product-sticky]')?.hidden === false);
  assert.equal(await page.locator('[data-product-sticky] [data-variant-submit]').isEnabled(), true);

  const submitted = await page.evaluate(() => new Promise(resolve => {
    const form = document.querySelector('#card-add');
    form.addEventListener('submit', event => {
      event.preventDefault();
      resolve(Object.fromEntries(new FormData(form).entries()));
    }, { once: true });
    form.querySelector('button[type="submit"]').click();
  }));
  assert.equal(submitted.variant, 'v-single');
  assert.equal(submitted.quantity, '1');
  assert.equal(submitted.csrftoken, undefined);
  assert.equal(submitted.csrfmiddlewaretoken, 'csrf-sample');
  assert.deepEqual(pageErrors, [], 'no JavaScript runtime errors');
  console.log('Django product detail UI checks: 24 assertions passed');
} finally {
  await page.close();
  await browser.close();
}
