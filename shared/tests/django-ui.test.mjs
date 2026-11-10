import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';

const source = fs.readFileSync(new URL('../../django/static/js/tatami.js', import.meta.url), 'utf8');
const browser = await chromium.launch({ headless: true });
const failures = [];

async function runScenario(name, markup, verify) {
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  try {
    await page.setContent(markup, { waitUntil: 'domcontentloaded' });
    await page.addScriptTag({ content: source });
    assert.deepEqual(pageErrors, [], name + ': browser runtime errors');
    await verify(page);
    console.log('PASS ' + name);
  } catch (error) {
    failures.push(name + ': ' + (error?.stack || error));
    console.error('FAIL ' + name + ': ' + error.message);
  } finally {
    await page.close();
  }
}

const shell = '<!doctype html><html lang="fa" dir="rtl"><body><main id="app" tabindex="-1"></main><div id="ts" class="tp-toast" role="status" aria-live="polite"></div></body></html>';

try {
  await runScenario('no numeric fields: global initializer remains safe', shell, async page => {
    assert.equal(await page.locator('#app').count(), 1);
  });

  await runScenario(
    'multiple numeric fields and gem notification',
    '<!doctype html><html lang="fa" dir="rtl"><body><main id="app"><span id="amount-a" data-fa-number>1234</span><span id="amount-b" data-fa-number>98765</span></main><div id="ts" class="tp-toast" role="status" aria-live="polite"></div><p class="tp-msg gem">۱۰ جم به حساب شما افزوده شد.</p></body></html>',
    async page => {
      const expectedA = (1234).toLocaleString('fa-IR');
      const expectedB = (98765).toLocaleString('fa-IR');
      assert.equal(await page.locator('#amount-a').textContent(), expectedA);
      assert.equal(await page.locator('#amount-b').textContent(), expectedB);
      assert.equal(await page.locator('#ts').textContent(), '۱۰ جم به حساب شما افزوده شد.');
      assert.equal(await page.locator('#ts').evaluate(el => el.classList.contains('on')), true);
      assert.equal(await page.locator('#ts').evaluate(el => el.classList.contains('info')), true);
    }
  );

  await runScenario(
    'Django validation message receives focus when no field is invalid',
    '<!doctype html><html lang="fa" dir="rtl"><body><main id="app"></main><div id="ts"></div><p id="server-error" class="tp-msg error">ورودی نامعتبر است.</p></body></html>',
    async page => {
      assert.equal(await page.evaluate(() => document.activeElement?.id), 'server-error');
    }
  );
} finally {
  await browser.close();
}

if (failures.length) {
  throw new Error(failures.join('\n\n'));
}
console.log('Django frontend JavaScript runtime checks: 3/3 passed');
