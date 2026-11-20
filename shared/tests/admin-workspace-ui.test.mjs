import assert from "node:assert/strict";
import { chromium } from "playwright";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../..");
const root = resolve(repoRoot, "django/static");
const [navigationScript, navigationCss, workspaceCss] = await Promise.all([
  readFile(resolve(root, "js/tatami-admin-navigation.js"), "utf8"),
  readFile(resolve(root, "css/tatami-admin-navigation.css"), "utf8"),
  readFile(resolve(root, "css/tatami-admin-workspace.css"), "utf8")
]);

const fixture = String.raw`<!doctype html>
<html lang="fa" dir="rtl">
<head><meta charset="utf-8"><base href="https://tatamiplus.ir/admin/"></head>
<body class="change-form">
  <div id="main" style="display:flex;min-height:100vh">
    <nav id="nav-sidebar" aria-label="منوی مدیریت" style="width:280px;flex:0 0 280px;overflow:auto">
      <input id="nav-filter" type="search" placeholder="Filter">
      <div class="app-blog module">
        <table>
          <caption><a class="section" href="/admin/blog/">وبلاگ</a></caption>
          <tbody>
            <tr class="model-post">
              <th scope="row"><a href="/admin/blog/post/">پست‌های وبلاگ</a></th>
              <td><a class="addlink" href="/admin/blog/post/add/">افزودن</a></td>
            </tr>
          </tbody>
        </table>
      </div>
    </nav>
    <main id="content-start" style="min-width:0;flex:1">
      <div id="content" class="colM">
        <div id="content-main">
          <form id="post_form" method="post">
            <div>
              <fieldset class="module aligned">
                <h2 class="fieldset-heading">اطلاعات نوشته</h2>
                <div class="form-row field-title">
                  <div>
                    <div class="flex-container">
                      <label class="required" for="id_title">عنوان:</label>
                      <input id="id_title" class="vTextField" name="title" type="text" required>
                    </div>
                    <div class="help">عنوان قابل نمایش برای نوشته</div>
                  </div>
                </div>
                <div class="form-row field-slug">
                  <div>
                    <div class="flex-container">
                      <label for="id_slug">شناسه نشانی:</label>
                      <input id="id_slug" class="vTextField" name="slug" type="text">
                    </div>
                  </div>
                </div>
                <div class="form-row field-excerpt">
                  <div>
                    <div class="flex-container">
                      <label for="id_excerpt">خلاصه:</label>
                      <textarea id="id_excerpt" class="vLargeTextField" name="excerpt"></textarea>
                    </div>
                    <div class="help">خلاصه کوتاه نوشته</div>
                  </div>
                </div>
                <div class="form-row field-cover">
                  <div>
                    <div class="flex-container">
                      <label for="id_cover">تصویر شاخص:</label>
                      <input id="id_cover" name="cover" type="file">
                    </div>
                  </div>
                </div>
                <div class="form-row field-is-published">
                  <div>
                    <div class="flex-container checkbox-row">
                      <input id="id_is_published" name="is_published" type="checkbox">
                      <label class="vCheckboxLabel" for="id_is_published">منتشر شود</label>
                    </div>
                  </div>
                </div>
              </fieldset>
              <div class="submit-row">
                <input class="default" type="submit" name="_save" value="ذخیره">
                <input type="submit" name="_continue" value="ذخیره و ادامه ویرایش">
                <input type="submit" name="_addanother" value="ذخیره و افزودن مورد دیگر">
                <a class="closelink" href="/admin/blog/post/">بستن</a>
                <a class="deletelink" href="/admin/blog/post/1/delete/">حذف</a>
              </div>
            </div>
          </form>
        </div>
      </div>
    </main>
  </div>
</body>
</html>`;

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1536, height: 1000 } });
  await page.route("https://tatamiplus.ir/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: fixture })
  );
  await page.goto("https://tatamiplus.ir/admin/blog/post/add/", { waitUntil: "domcontentloaded" });
  await page.addStyleTag({ content: navigationCss });
  await page.addStyleTag({ content: workspaceCss });
  await page.addScriptTag({ content: navigationScript });

  // Navigation group caption uses distinct grid tracks; count and collapse arrow do not overlap.
  const caption = page.locator("#nav-sidebar .tpa-nav-group caption");
  assert.equal(await caption.evaluate((el) => getComputedStyle(el).display), "grid");
  const titleBox = await caption.locator("a.section").boundingBox();
  const countBox = await caption.locator(".tpa-app-count").boundingBox();
  const toggleBox = await caption.locator(".tpa-group-toggle").boundingBox();
  assert.ok(titleBox && countBox && toggleBox);
  assert.ok(titleBox.x + titleBox.width <= countBox.x + 1 || countBox.x + countBox.width <= titleBox.x + 1);
  assert.ok(toggleBox.x + toggleBox.width <= countBox.x + 1 || countBox.x + countBox.width <= toggleBox.x + 1);

  // Single-field rows have one consistent label/control grid.
  const titleLayout = await page.locator(".field-title .flex-container").evaluate((el) => ({
    display: getComputedStyle(el).display,
    columns: getComputedStyle(el).gridTemplateColumns
  }));
  assert.equal(titleLayout.display, "grid");
  assert.equal(titleLayout.columns.split(" ").length, 2);

  const titleBoxInput = await page.locator("#id_title").boundingBox();
  const textareaBox = await page.locator("#id_excerpt").boundingBox();
  assert.ok(titleBoxInput && textareaBox);
  assert.ok(titleBoxInput.width >= 250 && titleBoxInput.width <= 660);
  assert.ok(textareaBox.width >= 450 && textareaBox.width <= 820);
  assert.ok(textareaBox.height >= 190);

  // The form action footer is a distinct action group with consistent button targets.
  const submitRow = page.locator(".submit-row");
  assert.equal(await submitRow.evaluate((el) => getComputedStyle(el).display), "flex");
  for (const locator of [
    submitRow.locator('input[name="_save"]'),
    submitRow.locator('input[name="_continue"]'),
    submitRow.locator("a.closelink"),
    submitRow.locator("a.deletelink")
  ]) {
    const box = await locator.boundingBox();
    assert.ok(box && box.height >= 42);
  }
  assert.equal(await submitRow.locator("a.deletelink").getAttribute("href"), "https://tatamiplus.ir/admin/blog/post/1/delete/");
  assert.equal(await submitRow.locator('input[name="_save"]').getAttribute("name"), "_save");

  // Mobile: labels stack over their controls and nothing expands beyond the viewport.
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileLayout = await page.locator(".field-title .flex-container").evaluate((el) => ({
    display: getComputedStyle(el).display,
    columns: getComputedStyle(el).gridTemplateColumns
  }));
  assert.equal(mobileLayout.display, "grid");
  assert.equal(mobileLayout.columns.split(" ").length, 1);
  const mobileTextarea = await page.locator("#id_excerpt").boundingBox();
  assert.ok(mobileTextarea && mobileTextarea.width <= 360);
  const mobileActions = await submitRow.boundingBox();
  assert.ok(mobileActions && mobileActions.width <= 370);

  console.log("ADMIN_WORKSPACE_UI_BROWSER_TEST_OK");
} finally {
  await browser.close();
}
