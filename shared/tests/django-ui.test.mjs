import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';

const source = fs.readFileSync(new URL('../../django/static/js/tatami.js', import.meta.url), 'utf8');
const browser = await chromium.launch({ headless: true });
const failures = [];

async function runScenario(name, markup, verify, options = {}) {
  const page = await browser.newPage(options);
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
    '<!doctype html><html lang="fa" dir="rtl"><body><main id="app"><span id="amount-a" data-fa-number>1 234</span><span id="amount-b" data-fa-number>98,765</span><span id="amount-c" data-fa-number>12٬345</span></main><div id="ts" class="tp-toast" role="status" aria-live="polite"></div><p class="tp-msg gem">۱۰ جم به حساب شما افزوده شد.</p></body></html>',
    async page => {
      const expectedA = (1234).toLocaleString('fa-IR');
      const expectedB = (98765).toLocaleString('fa-IR');
      assert.equal(await page.locator('#amount-a').textContent(), expectedA);
      assert.equal(await page.locator('#amount-b').textContent(), expectedB);
      assert.equal(await page.locator('#amount-c').textContent(), (12345).toLocaleString('fa-IR'));
      assert.equal(await page.locator('#ts').textContent(), '۱۰ جم به حساب شما افزوده شد.');
      assert.equal(await page.locator('#ts').evaluate(el => el.classList.contains('on')), true);
      assert.equal(await page.locator('#ts').evaluate(el => el.classList.contains('info')), true);
    }
  );


  await runScenario(
    'mobile registration keeps backend roles and advances through steps',
    '<!doctype html><html lang="fa" dir="rtl"><body><main><form data-auth-form="register" novalidate><div class="tp-auth-stage is-active" data-auth-stage="1"><label>نام کاربری<input id="username" name="username" required></label><fieldset><label><input type="radio" name="role" value="student" checked required>هنرجو</label><label><input type="radio" name="role" value="coach" required>مربی</label><div class="tp-role-option is-unavailable" aria-disabled="true">باشگاه</div></fieldset><button type="button" data-auth-next>ادامه</button></div><div class="tp-auth-stage" data-auth-stage="2"><label>گذرواژه<input name="password1" type="password" required></label><label>تکرار گذرواژه<input name="password2" type="password" required></label><button type="button" data-auth-back>بازگشت</button><button type="submit">ثبت‌نام</button></div><span data-auth-progress-step="1"></span><span data-auth-progress-step="2"></span></form></main><div id="ts"></div></body></html>',
    async page => {
      assert.equal(await page.locator('[data-auth-stage="1"]').evaluate(el => el.hidden), false);
      assert.equal(await page.locator('[data-auth-stage="2"]').evaluate(el => el.hidden), true);
      assert.equal(await page.locator('input[name="role"]').count(), 2);
      await page.fill('#username', 'preview-student');
      await page.locator('[data-auth-next]').click();
      assert.equal(await page.locator('[data-auth-stage="1"]').evaluate(el => el.hidden), true);
      assert.equal(await page.locator('[data-auth-stage="2"]').evaluate(el => el.hidden), false);
      await page.locator('[data-auth-back]').click();
      assert.equal(await page.locator('[data-auth-stage="1"]').evaluate(el => el.hidden), false);
      assert.equal(await page.locator('[data-auth-stage="2"]').evaluate(el => el.hidden), true);
      assert.equal(await page.locator('.tp-role-option[aria-disabled="true"]').count(), 1);
    },
    { viewport: { width: 390, height: 844 } }
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
