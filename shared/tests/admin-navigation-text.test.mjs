import assert from "node:assert/strict";
import { chromium } from "playwright";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..", "django/static");
const [script, baseCss, textCss] = await Promise.all([
  readFile(resolve(root, "js/tatami-admin-navigation.js"), "utf8"),
  readFile(resolve(root, "css/tatami-admin-navigation.css"), "utf8"),
  readFile(resolve(root, "css/tatami-admin-navigation-text.css"), "utf8")
]);

const fixture = String.raw`<!doctype html>
<html lang="fa" dir="rtl">
<head><meta charset="utf-8"><base href="https://tatamiplus.ir/admin/"></head>
<body>
  <div id="main" style="display:flex;min-height:100vh">
    <nav id="nav-sidebar" style="width:316px;min-width:316px;flex:0 0 316px;overflow:auto">
      <input id="nav-filter" type="search">
      <div class="app-accounts module">
        <table>
          <caption><a class="section" href="/admin/accounts/" title="Models in the Accounts application">Accounts</a></caption>
          <tbody>
            <tr class="model-signuplead">
              <th scope="row"><a href="/admin/accounts/signuplead/">سرنخ‌های ثبت‌نام مربیان</a></th>
              <td><a class="addlink" href="/admin/accounts/signuplead/add/">افزودن</a></td>
              <td><a class="changelink" href="/admin/accounts/signuplead/">تغییر</a></td>
            </tr>
            <tr class="model-user">
              <th scope="row"><a href="/admin/accounts/user/">کاربران</a></th>
              <td><a class="addlink" href="/admin/accounts/user/add/">افزودن</a></td>
              <td><a class="changelink" href="/admin/accounts/user/">تغییر</a></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="app-club module">
        <table>
          <caption><a class="section" href="/admin/club/">Club</a></caption>
          <tbody>
            <tr class="model-course">
              <th scope="row"><a href="/admin/club/course/">دوره‌ها</a></th>
              <td><a class="addlink" href="/admin/club/course/add/">افزودن</a></td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </nav>
    <main id="content-start" style="min-width:0;flex:1"></main>
  </div>
</body>
</html>`;

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.route("https://tatamiplus.ir/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: fixture })
  );
  await page.goto("https://tatamiplus.ir/admin/", { waitUntil: "domcontentloaded" });
  await page.addStyleTag({ content: baseCss });
  await page.addStyleTag({ content: textCss });
  await page.addScriptTag({ content: script });

  const nav = page.locator("#nav-sidebar");
  const accountsLink = nav.locator(".app-accounts caption a.section");
  assert.equal(await accountsLink.locator(".tpa-app-label").textContent(), "حساب‌های کاربری");
  assert.equal(await accountsLink.getAttribute("href"), "/admin/accounts/");
  assert.equal(await accountsLink.evaluate((link) => link.href), "https://tatamiplus.ir/admin/accounts/");
  assert.equal(await accountsLink.getAttribute("aria-label"), "حساب‌های کاربری");
  assert.equal(await accountsLink.locator(".tpa-app-label").evaluate((el) => getComputedStyle(el).textTransform), "none");

  const clubLink = nav.locator(".app-club caption a.section");
  assert.equal(await clubLink.locator(".tpa-app-label").textContent(), "باشگاه");
  assert.equal(await clubLink.getAttribute("href"), "/admin/club/");
  assert.equal(await clubLink.evaluate((link) => link.href), "https://tatamiplus.ir/admin/club/");

  const caption = nav.locator(".app-accounts caption");
  const titleRect = await accountsLink.boundingBox();
  const countRect = await caption.locator(".tpa-app-count").boundingBox();
  const toggleRect = await caption.locator(".tpa-group-toggle").boundingBox();
  assert.ok(titleRect && countRect && toggleRect);
  const separated = (a, b) =>
    a.x + a.width <= b.x + 1 || b.x + b.width <= a.x + 1 ||
    a.y + a.height <= b.y + 1 || b.y + b.height <= a.y + 1;
  assert.ok(separated(titleRect, countRect), "App title overlaps its count");
  assert.ok(separated(countRect, toggleRect), "App count overlaps its collapse button");

  const longRow = nav.locator(".model-signuplead");
  const modelLink = longRow.locator("th .tpa-model-heading > a");
  const star = longRow.locator("th .tpa-favorite-toggle");
  const modelRect = await modelLink.boundingBox();
  const starRect = await star.boundingBox();
  assert.ok(modelRect && starRect);
  assert.ok(separated(modelRect, starRect), "Long Persian model name overlaps favorite star");
  assert.ok((await modelLink.evaluate((el) => getComputedStyle(el).direction)) === "rtl");
  assert.ok(await modelLink.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    "Persian model text overflows its allocated label width");

  const rowTable = nav.locator(".app-accounts table");
  assert.ok(await rowTable.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    "Navigation table creates horizontal overflow");
  assert.equal(await longRow.locator("td .addlink").getAttribute("href"),
    "https://tatamiplus.ir/admin/accounts/signuplead/add/");
  assert.equal(await longRow.locator("td .changelink").getAttribute("href"),
    "https://tatamiplus.ir/admin/accounts/signuplead/");

  // Narrow display: the sidebar remains within the viewport and model labels still wrap.
  await page.setViewportSize({ width: 390, height: 844 });
  const navRect = await nav.boundingBox();
  assert.ok(navRect && navRect.width <= 330 && navRect.x >= 0);
  assert.ok(await rowTable.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    "Mobile navigation table creates horizontal overflow");

  console.log("ADMIN_NAVIGATION_PERSIAN_TEXT_TEST_OK");
} finally {
  await browser.close();
}
