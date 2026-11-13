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
    'Django validation message receives focus when no field is invalid',
    '<!doctype html><html lang="fa" dir="rtl"><body><main id="app"></main><div id="ts"></div><p id="server-error" class="tp-msg error">ورودی نامعتبر است.</p></body></html>',
    async page => {
      assert.equal(await page.evaluate(() => document.activeElement?.id), 'server-error');
    }
  );

  await runScenario(
    'Django registration role picker, club preview guard, and mobile stages',
    '<!doctype html><html lang="fa" dir="rtl"><head><style>@media(max-width:767px){.tp-auth-register[data-mobile-steps="true"][data-step="1"] [data-auth-step="2"]{display:none}.tp-auth-register[data-mobile-steps="true"][data-step="2"] [data-auth-step="1"]{display:none}}</style></head><body><form id="tp-register-form" method="post" data-auth-form="register"><div class="tp-field"><label for="id_username">نام کاربری</label><input id="id_username" name="username" required></div><div class="tp-field"><label for="id_email">ایمیل</label><input id="id_email" name="email" type="email"></div><div class="tp-field"><label for="id_role">نقش</label><select id="id_role" name="role" required><option value="student">هنرجو</option><option value="coach">مربی</option></select></div><div class="tp-field"><label for="id_password1">گذرواژه</label><input id="id_password1" name="password1" type="password" required></div><div class="tp-field"><label for="id_password2">تکرار گذرواژه</label><input id="id_password2" name="password2" type="password" required></div><button type="submit">ساخت حساب</button></form></body></html>',
    async page => {
      await page.setViewportSize({width:390,height:800});
      assert.equal(await page.locator('.tp-role-picker [role=radio]').count(),3);
      assert.equal(await page.locator('#tp-register-form').getAttribute('data-mobile-steps'),'true');
      assert.equal(await page.locator('#tp-register-form').getAttribute('data-step'),'1');
      await page.locator('.tp-role-preview').click();
      assert.equal(await page.locator('#tp-register-form').getAttribute('data-role-preview'),'club');
      assert.equal(await page.locator('#tp-register-form [type=submit]').isDisabled(),true);
      assert.equal(await page.locator('.tp-club-preview').count(),1);
      await page.locator('.tp-role-picker [role=radio]').first().click();
      assert.equal(await page.locator('#tp-register-form [type=submit]').isDisabled(),false);
      await page.locator('#id_username').fill('sample-user');
      await page.locator('#id_username').fill('qa-student');
      await page.locator('[data-auth-next]').click();
      assert.equal(await page.locator('#tp-register-form').getAttribute('data-step'),'2');
      assert.equal(await page.locator('#tp-register-form [data-auth-step="2"]').isVisible(),true);
    }
  );
} finally {
  await browser.close();
}

if (failures.length) {
  throw new Error(failures.join('\n\n'));
}
console.log('Django frontend JavaScript runtime checks: 4/4 passed');
