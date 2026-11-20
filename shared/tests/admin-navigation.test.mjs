import assert from "node:assert/strict";
import { chromium } from "playwright";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../..");
const scriptPath = resolve(repoRoot, "django/static/js/tatami-admin-navigation.js");
const stylePath = resolve(repoRoot, "django/static/css/tatami-admin-navigation.css");
const script = await readFile(scriptPath, "utf8");
const style = await readFile(stylePath, "utf8");

const fixture = String.raw`<!doctype html>
<html lang="fa" dir="rtl">
<head><meta charset="utf-8"><base href="https://tatamiplus.ir/admin/"></head>
<body>
  <div id="nav-sidebar">
    <input id="nav-filter" type="search" placeholder="Filter">
    <div class="app-accounts module">
      <table>
        <caption><a class="section" href="/admin/accounts/">Accounts</a></caption>
        <thead class="visually-hidden"><tr><th>Model</th><th>Add</th><th>Change</th></tr></thead>
        <tbody>
          <tr class="model-user">
            <th scope="row"><a href="/admin/accounts/user/">کاربران</a></th>
            <td><a class="addlink" href="/admin/accounts/user/add/">افزودن</a></td>
          </tr>
          <tr class="model-signuplead">
            <th scope="row"><a href="/admin/accounts/signuplead/">سرنخ‌های ثبت‌نام</a></th>
            <td></td>
          </tr>
          <tr class="model-bulkimport">
            <th scope="row">ورود گروهی</th>
            <td><a class="addlink" href="/admin/accounts/bulkimport/add/">افزودن</a></td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="app-store module">
      <table>
        <caption><a class="section" href="/admin/store/">Store</a></caption>
        <tbody>
          <tr class="model-product">
            <th scope="row"><a href="/admin/store/product/">محصولات</a></th>
            <td><a class="addlink" href="/admin/store/product/add/">افزودن</a></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`;
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.setContent(fixture, { waitUntil: "domcontentloaded" });
  await page.addStyleTag({ content: style });
  await page.addScriptTag({ content: script });

  const nav = page.locator("#nav-sidebar");
  await assert.equal(await nav.locator(".tpa-nav-group").count(), 2);
  await assert.equal(await page.locator("#nav-filter").getAttribute("placeholder"), "جست‌وجو در بخش‌ها و زیرمجموعه‌ها…");

  // Group collapse opens and closes without changing the native links.
  const accountsGroup = nav.locator(".app-accounts");
  const groupToggle = accountsGroup.locator(".tpa-group-toggle");
  await groupToggle.click();
  await assert.equal(await accountsGroup.evaluate((el) => el.classList.contains("tpa-group-collapsed")), true);
  await assert.equal(await groupToggle.getAttribute("aria-expanded"), "false");
  await groupToggle.click();
  await assert.equal(await accountsGroup.evaluate((el) => el.classList.contains("tpa-group-collapsed")), false);

  // Favorites are browser-local and retain only the real admin URL.
  await accountsGroup.locator(".tpa-favorite-toggle").first().click();
  await assert.equal(await accountsGroup.locator(".tpa-favorite-toggle").first().getAttribute("aria-pressed"), "true");
  const favoriteDetails = page.locator('[data-quick="favorites"]');
  await favoriteDetails.locator("summary").click();
  await assert.equal(await favoriteDetails.locator(".tpa-quick-link").getAttribute("href"), "https://tatamiplus.ir/admin/accounts/user/");

  // The command palette contains only hrefs already present in Django's sidebar.
  const sourceLinks = await nav.locator("a[href]").evaluateAll((links) => links.map((link) => link.href));
  await page.locator(".tpa-command-trigger").click();
  const command = page.locator(".tpa-command-overlay");
  await assert.equal(await command.isVisible(), true);
  await page.locator(".tpa-command-input").fill("افزودن کاربران");
  const result = page.locator(".tpa-command-result").first();
  await assert.equal(await result.textContent().then((text) => text.includes("افزودن کاربران")), true);
  const destination = await result.getAttribute("href");
  await assert.equal(sourceLinks.includes(new URL(destination, "https://tatamiplus.ir/admin/").href), true);
  await page.keyboard.press("Escape");
  await assert.equal(await command.isHidden(), true);

  // Density preference toggles without altering page destinations.
  const densityButton = page.locator(".tpa-density-toggle");
  await densityButton.click();
  await assert.equal(await nav.evaluate((el) => el.classList.contains("tpa-nav-compact")), true);
  await densityButton.click();
  await assert.equal(await nav.evaluate((el) => el.classList.contains("tpa-nav-compact")), false);

  // Recent destinations are recorded from actual menu links.
  await nav.locator(".app-store a[href='/admin/store/product/']").evaluate((link) => {
    link.addEventListener("click", (event) => event.preventDefault(), { once: true });
  });
  await nav.locator(".app-store a[href='/admin/store/product/']").click();
  await page.locator('[data-quick="recent"] summary').click();
  await assert.equal(
    await page.locator('[data-quick="recent"] .tpa-quick-link').first().getAttribute("href"),
    "https://tatamiplus.ir/admin/store/product/"
  );

  // Add-only models are not discarded: their actual Add destination is searchable.
  await page.locator(".tpa-command-trigger").click();
  await page.locator(".tpa-command-input").fill("افزودن ورود گروهی");
  await assert.equal(await page.locator(".tpa-command-result").first().getAttribute("href"), "https://tatamiplus.ir/admin/accounts/bulkimport/add/");

  console.log("ADMIN_NAVIGATION_BROWSER_TEST_OK");
} finally {
  await browser.close();
}
