const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
  try {
    for (const width of [390, 320, 768]) {
      const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
      await page.goto('http://127.0.0.1:18766/?tripId=DEMO');
      await page.getByRole('button', { name: '編輯行程' }).first().waitFor();
      assert.equal(await page.evaluate(() => window.mapStats.mounts), 0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.getByRole('button', { name: /路線總覽/ }).first().click();
      await page.getByTestId('map').waitFor();
      assert.equal(await page.evaluate(() => window.mapStats.routes), 1);
      await page.getByRole('button', { name: '編輯行程' }).first().click();
      const dialog = page.getByRole('dialog', { name: '編輯內容' });
      await dialog.locator('textarea').fill('我的編輯');
      await page.evaluate(() => {
        const data = window.testTrip.get();
        window.testTrip.patch({ itinerary: [...data.itinerary.map(i => i.id === 'a' ? { ...i, time: '11:00', guideInfo: '新導遊資訊', tags: [] } : i), { id: 'new', day: 3, time: '15:00', location: '新增景點', createdBy: 'other' }] });
      });
      await dialog.getByRole('button', { name: '確認儲存' }).click();
      await dialog.waitFor({ state: 'hidden' });
      const state = await page.evaluate(() => window.testTrip.get());
      assert.equal(state.itinerary.length, 4);
      assert.equal(state.itinerary[0].createdBy, 'other');
      assert.equal(state.itinerary[0].time, '11:00');
      assert.equal(state.itinerary[0].guideInfo, '新導遊資訊');
      assert.equal(state.itinerary[0].notes, '我的編輯');
      assert.equal(await page.evaluate(() => window.mapStats.routes), 1);
      // Same-field conflict: no overwrite, dialog and text remain.
      await page.getByRole('button', { name: '編輯行程' }).first().click();
      await dialog.locator('textarea').fill('我的衝突草稿');
      await page.evaluate(() => { const data = window.testTrip.get(); window.testTrip.patch({ itinerary: data.itinerary.map(i => i.id === 'a' ? { ...i, notes: '遠端編輯' } : i) }); });
      await dialog.getByRole('button', { name: '確認儲存' }).click();
      await page.getByText(/儲存失敗:/).waitFor();
      assert.equal(await dialog.locator('textarea').inputValue(), '我的衝突草稿');
      assert.equal(await page.evaluate(() => window.testTrip.get().itinerary[0].notes), '遠端編輯');
      await dialog.getByRole('button', { name: '取消', exact: true }).click();
      await page.locator('nav').getByRole('button', { name: '記帳' }).click();
      await page.getByText('午餐費', { exact: true }).click();
      assert.equal(await dialog.locator('input[step="0.0001"]').inputValue(), '0.21');
      const save = dialog.getByRole('button', { name: '確認儲存' });
      const box = await save.boundingBox();
      assert.ok(box.y >= 0 && box.y + box.height <= 844);
      await save.click();
      await dialog.waitFor({ state: 'hidden' });
      assert.equal(await page.evaluate(() => window.testTrip.get().expenses[0].amount), 210);
      assert.equal(await page.evaluate(() => window.testTrip.get().expenses[0].exchangeRate), .21);
      await page.getByRole('button', { name: /結算/ }).click();
      await page.getByText('$105', { exact: true }).waitFor();
      await page.getByRole('button', { name: '關閉', exact: true }).click();
      await page.locator('nav').getByRole('button', { name: '行程' }).click();
      await page.waitForFunction(() => getComputedStyle(document.querySelector('main div[style*="translateX"]')).transform === 'matrix(1, 0, 0, 1, 0, 0)');
      await page.screenshot({ path: process.env.SCREENSHOT_DIR ? `${process.env.SCREENSHOT_DIR}/mobile-${width}.png` : `/tmp/tabiji-${width}.png` });
      await page.getByRole('button', { name: '編輯行程' }).first().click();
      await page.setViewportSize({ width, height: 500 });
      await page.waitForFunction(() => innerHeight <= 500);
      await page.waitForFunction(() => {
        const buttons = [...document.querySelectorAll('[role=dialog] button')];
        const save = buttons.find(button => button.textContent.includes('確認儲存'));
        return save && save.getBoundingClientRect().bottom <= 500;
      });
      await page.setViewportSize({ width, height: 844 });
      await page.waitForFunction(() => Math.abs(document.querySelector('[role=dialog]').getBoundingClientRect().height - 844) < 1);
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await page.screenshot({ path: `/tmp/tabiji-edit-${width}.png` });
      await dialog.getByRole('button', { name: '取消', exact: true }).click();
      await page.addInitScript(() => { window.mapsUnavailable = true; });
      await page.goto('http://127.0.0.1:18766/?tripId=DEMO');
      await page.getByRole('button', { name: /路線總覽/ }).first().click();
      await page.getByText(/地圖載入失敗/).waitFor();
      await page.getByRole('button', { name: '編輯行程' }).first().click();
      await page.getByRole('textbox', { name: '地點', exact: true }).fill('手動輸入地點');
      await dialog.getByRole('button', { name: '確認儲存' }).click();
      await dialog.waitFor({ state: 'hidden' });
      assert.equal(await page.evaluate(() => window.testTrip.get().itinerary[0].location), '手動輸入地點');
      assert.equal(await page.evaluate(() => window.testTrip.get().itinerary[0].lat), null);
      assert.deepEqual(errors, []);
      console.log(`${width}px: lazy maps, no overflow, concurrent edit, conflict draft, historical rate, settlement, visible save passed`);
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
