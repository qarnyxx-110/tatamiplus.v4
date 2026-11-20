import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..", "django/static");
const [script, ...styles] = await Promise.all([
  readFile(resolve(root, "js/tatami-admin-navigation.js"), "utf8"),
  readFile(resolve(root, "css/tatami-admin.css"), "utf8"),
  readFile(resolve(root, "css/tatami-admin-ux.css"), "utf8"),
  readFile(resolve(root, "css/tatami-admin-polish.css"), "utf8"),
  readFile(resolve(root, "css/tatami-admin-navigation.css"), "utf8"),
  readFile(resolve(root, "css/tatami-admin-workspace.css"), "utf8"),
  readFile(resolve(root, "css/tatami-admin-navigation-text.css"), "utf8")
]);

const djangoSidebarCss = [
  ".sticky { position: sticky; top: 0; max-height: 100vh; }",
  ".toggle-nav-sidebar { z-index: 20; display: flex; align-items: center; justify-content: center; flex: 0 0 23px; width: 23px; border: 0; padding: 0; }",
  "#nav-sidebar { z-index: 15; flex: 0 0 275px; overflow: auto; }",
  "[dir=\"rtl\"] #nav-sidebar { right: -276px; margin-right: -276px; }",
  ".main > #nav-sidebar { visibility: hidden; }",
  ".main.shifted > #nav-sidebar { margin-right: 0; visibility: visible; }",
  "[dir=\"rtl\"] .main.shifted > #nav-sidebar { margin-right: 0; }",
  "#nav-sidebar .module th { width: 100%; overflow-wrap: anywhere; }",
  "#nav-sidebar .module td { white-space: nowrap; }",
  "#nav-sidebar table { width: 100%; }",
  "@media (max-width: 767px) { #nav-sidebar, #toggle-nav-sidebar { display: none; } .main > #nav-sidebar + .content, .main.shifted > #nav-sidebar + .content { max-width: 100%; } }"
].join("\n");

const fixture = [
'<!doctype html>',
'<html lang="fa" dir="rtl">',
'<head><meta charset="utf-8"><base href="https://tatamiplus.ir/admin/"></head>',
'<body>',
'<header id="header"><div id="branding">تاتامی پلاس</div></header>',
'<div class="breadcrumbs">داشبورد مدیریت</div>',
'<div class="main shifted" id="main">',
'<button class="sticky toggle-nav-sidebar" id="toggle-nav-sidebar" aria-label="بستن منو"></button>',
'<nav class="sticky" id="nav-sidebar" aria-label="منوی مدیریت">',
'<input id="nav-filter" type="search" placeholder="جست‌وجو">',
'<div class="app-accounts module"><table>',
'<caption><a class="section" href="/admin/accounts/">Accounts</a></caption><tbody>',
'<tr class="model-signuplead"><th scope="row"><a href="/admin/accounts/signuplead/">سرنخ‌های ثبت‌نام مربیان</a></th><td><a class="addlink" href="/admin/accounts/signuplead/add/">افزودن</a></td></tr>',
'<tr class="model-user"><th scope="row"><a href="/admin/accounts/user/">کاربران</a></th><td><a class="addlink" href="/admin/accounts/user/add/">افزودن</a></td></tr>',
'<tr class="model-bulkimport"><th scope="row">ورود گروهی اطلاعات کاربران</th><td><a class="addlink" href="/admin/accounts/bulkimport/add/">افزودن</a></td></tr>',
'</tbody></table></div>',
'<div class="app-auth module"><table><caption><a class="section" href="/admin/auth/">Auth</a></caption><tbody><tr class="model-group"><th scope="row"><a href="/admin/auth/group/">گروه‌های دسترسی</a></th><td></td></tr></tbody></table></div>',
'<div class="app-club module"><table><caption><a class="section" href="/admin/club/">Club</a></caption><tbody><tr class="model-course"><th scope="row"><a href="/admin/club/course/">دوره‌های آموزشی آنلاین</a></th><td><a class="addlink" href="/admin/club/course/add/">افزودن</a></td></tr></tbody></table></div>',
'<div class="app-coaches module"><table><caption><a class="section" href="/admin/coaches/">Coaches</a></caption><tbody><tr class="model-coach"><th scope="row"><a href="/admin/coaches/coach/">پروفایل مربیان</a></th><td><a class="addlink" href="/admin/coaches/coach/add/">افزودن</a></td></tr></tbody></table></div>',
'<div class="app-gems module"><table><caption><a class="section" href="/admin/gems/">Gems</a></caption><tbody><tr class="model-transaction"><th scope="row"><a href="/admin/gems/transaction/">تراکنش‌های جم</a></th><td></td></tr></tbody></table></div>',
'<div class="app-orders module"><table><caption><a class="section" href="/admin/orders/">Orders</a></caption><tbody><tr class="model-order"><th scope="row"><a href="/admin/orders/order/">سفارش‌های مشتریان</a></th><td><a class="addlink" href="/admin/orders/order/add/">افزودن</a></td></tr></tbody></table></div>',
'<div class="app-store module"><table><caption><a class="section" href="/admin/store/">Store</a></caption><tbody><tr class="model-product"><th scope="row"><a href="/admin/store/product/">محصولات فروشگاه</a></th><td><a class="addlink" href="/admin/store/product/add/">افزودن</a></td></tr></tbody></table></div>',
'<div class="app-blog module"><table><caption><a class="section" href="/admin/blog/">Blog</a></caption><tbody><tr class="model-post"><th scope="row"><a href="/admin/blog/post/">مقاله‌های وبلاگ</a></th><td><a class="addlink" href="/admin/blog/post/add/">افزودن</a></td></tr></tbody></table></div>',
'</nav>',
'<main id="content-start" class="content" tabindex="-1"><div id="content" class="colM"><h1>داشبورد مدیریت</h1></div></main>',
'</div><footer id="footer"></footer></body></html>'
].join("\n");

const browser = await chromium.launch({ headless: true });
const metrics = [];
const artifactDir = resolve(here, "../artifacts/admin-sidebar-sizing");
await mkdir(artifactDir, { recursive: true });

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  await page.route("https://tatamiplus.ir/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: fixture })
  );
  await page.goto("https://tatamiplus.ir/admin/", { waitUntil: "domcontentloaded" });
  await page.addStyleTag({ content: djangoSidebarCss });
  for (const style of styles) await page.addStyleTag({ content: style });
  await page.addScriptTag({ content: script });

  const nav = page.locator("#nav-sidebar");
  const expectedLabels = {
    accounts: "حساب‌های کاربری",
    auth: "کاربران و دسترسی‌ها",
    club: "باشگاه",
    coaches: "مربیان",
    gems: "جم",
    orders: "سفارش‌ها",
    store: "فروشگاه",
    blog: "وبلاگ"
  };

  for (const [app, label] of Object.entries(expectedLabels)) {
    const anchor = nav.locator(".app-" + app + " caption a.section");
    assert.equal(await anchor.locator(".tpa-app-label").textContent(), label, app + " label");
    const rawHref = await anchor.getAttribute("href");
    assert.ok(rawHref.startsWith("/admin/"), app + " raw href");
    assert.equal(await anchor.evaluate((element) => element.href), "https://tatamiplus.ir" + rawHref);
  }

  const inspectViewport = async (width, expectedSidebarWidth) => {
    await page.setViewportSize({ width, height: 1000 });
    const navDisplay = await nav.evaluate((el) => getComputedStyle(el).display);
    if (width < 768) {
      assert.equal(navDisplay, "none", "Django mobile sidebar should remain hidden");
      assert.equal(await page.locator("#toggle-nav-sidebar").evaluate((el) => getComputedStyle(el).display), "none");
      metrics.push({ viewport: width, sidebar: "native-hidden-mobile" });
      await page.screenshot({ path: resolve(artifactDir, "sidebar-" + width + ".png"), fullPage: true });
      return;
    }

    assert.notEqual(navDisplay, "none");
    const navRect = await nav.boundingBox();
    const toggleRect = await page.locator("#toggle-nav-sidebar").boundingBox();
    const contentRect = await page.locator("#content-start").boundingBox();
    assert.ok(navRect && toggleRect && contentRect);
    assert.ok(Math.abs(navRect.width - expectedSidebarWidth) <= 1,
      "Sidebar at " + width + "px should be " + expectedSidebarWidth + "px, got " + navRect.width + "px");
    assert.ok(contentRect.width >= 320, "Content area too narrow at " + width + "px");
    assert.ok(navRect.x >= 0 && navRect.x + navRect.width <= width + 1, "Sidebar outside viewport");
    assert.ok(contentRect.x >= 0 && contentRect.x + contentRect.width <= width + 1, "Content outside viewport");

    const accountsCaption = nav.locator(".app-accounts caption");
    const title = accountsCaption.locator("a.section");
    const count = accountsCaption.locator(".tpa-app-count");
    const disclosure = accountsCaption.locator(".tpa-group-toggle");
    const titleRect = await title.boundingBox();
    const countRect = await count.boundingBox();
    const disclosureRect = await disclosure.boundingBox();
    assert.ok(titleRect && countRect && disclosureRect);

    const separated = (a, b) =>
      a.x + a.width <= b.x + 1 || b.x + b.width <= a.x + 1 ||
      a.y + a.height <= b.y + 1 || b.y + b.height <= a.y + 1;
    assert.ok(separated(titleRect, countRect), "App title/count overlap at " + width + "px");
    assert.ok(separated(countRect, disclosureRect), "Count/disclosure overlap at " + width + "px");

    const row = nav.locator(".model-signuplead");
    const modelLink = row.locator("th .tpa-model-heading > a");
    const star = row.locator("th .tpa-model-heading > .tpa-favorite-toggle");
    const modelRect = await modelLink.boundingBox();
    const starRect = await star.boundingBox();
    assert.ok(modelRect && starRect);
    assert.ok(separated(modelRect, starRect), "Model text/star overlap at " + width + "px");
    assert.ok(await modelLink.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
      "Model name overflows at " + width + "px");

    const table = nav.locator(".app-accounts table");
    assert.ok(await table.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
      "Menu table horizontally overflows at " + width + "px");

    const add = row.locator("td .addlink");
    const addRect = await add.boundingBox();
    console.log("ADD_ACTION_MEASURE", JSON.stringify({
      viewport: width,
      rect: addRect,
      table: await table.evaluate((el) => ({ width: getComputedStyle(el).width, tableLayout: getComputedStyle(el).tableLayout, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth })),
      th: await row.locator("th").evaluate((el) => ({ width: getComputedStyle(el).width, boxSizing: getComputedStyle(el).boxSizing })),
      td: await row.locator("td").evaluate((el) => ({ width: getComputedStyle(el).width, minWidth: getComputedStyle(el).minWidth, maxWidth: getComputedStyle(el).maxWidth, boxSizing: getComputedStyle(el).boxSizing })),
      add: await add.evaluate((el) => ({ width: getComputedStyle(el).width, minWidth: getComputedStyle(el).minWidth, minHeight: getComputedStyle(el).minHeight, padding: getComputedStyle(el).padding, boxSizing: getComputedStyle(el).boxSizing, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }))
    }));
    await page.screenshot({ path: resolve(artifactDir, "sidebar-debug-" + width + ".png"), fullPage: true });
    assert.ok(addRect && addRect.width <= 65 && addRect.height >= 28,
      "Add action dimensions incorrect at " + width + "px");
    assert.ok(await add.evaluate((el) => el.scrollWidth <= el.clientWidth + 2),
      "Add action text overflows at " + width + "px");

    const appLabelRect = await title.locator(".tpa-app-label").boundingBox();
    const modelStyle = await modelLink.evaluate((el) => ({
      fontSize: getComputedStyle(el).fontSize,
      lineHeight: getComputedStyle(el).lineHeight,
      direction: getComputedStyle(el).direction
    }));
    const measured = {
      viewport: width,
      sidebar: navRect.width,
      content: contentRect.width,
      title: Math.round(titleRect.width * 10) / 10,
      count: Math.round(countRect.width * 10) / 10,
      disclosure: Math.round(disclosureRect.width * 10) / 10,
      appLabel: appLabelRect ? Math.round(appLabelRect.width * 10) / 10 : null,
      modelLabel: Math.round(modelRect.width * 10) / 10,
      modelFont: modelStyle.fontSize,
      direction: modelStyle.direction,
      addAction: { width: addRect.width, height: addRect.height }
    };
    metrics.push(measured);
    if (width === 1440 || width === 1024) {
      await page.screenshot({ path: resolve(artifactDir, "sidebar-" + width + ".png"), fullPage: true });
    }
  };

  await inspectViewport(1440, 278);
  await inspectViewport(1280, 278);
  await inspectViewport(1100, 246);
  await inspectViewport(1024, 246);
  await inspectViewport(900, 246);
  await inspectViewport(768, 246);
  await inspectViewport(767, null);
  await inspectViewport(390, null);

  const addOnly = nav.locator(".model-bulkimport");
  assert.equal(await addOnly.locator("th a").count(), 0);
  assert.equal(await addOnly.locator("td .addlink").getAttribute("href"),
    "/admin/accounts/bulkimport/add/");

  await writeFile(resolve(artifactDir, "measurements.json"), JSON.stringify(metrics, null, 2));
  console.log("ADMIN_NAVIGATION_MEASURED_LAYOUT_TEST_OK");
  console.log(JSON.stringify(metrics));
} finally {
  await browser.close();
}