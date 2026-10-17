import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { DEFAULT_WEIGHTS, rank } from '../../public/model.mjs';

async function currentWeights(page) {
  return page.evaluate(() => Object.fromEntries(['H','P','V'].map(k=>[k,Number(document.getElementById(`weight-${k}`).value)])));
}
async function setWeight(page,key,value) {
  await page.locator(`#weight-${key}`).evaluate((el,next)=>{el.value=String(next);el.dispatchEvent(new Event('input',{bubbles:true}));},value);
}
test.beforeEach(async ({page}) => {
  await page.route('https://fonts.googleapis.com/**',route=>route.abort());
  await page.route('https://fonts.gstatic.com/**',route=>route.abort());
  await page.goto('./');
  await expect(page.locator('.bar-row')).toHaveCount(12);
});

test('subpath loads cleanly with the twelve baseline districts', async ({page}) => {
  await expect(page.locator('#dashboard-view')).toBeVisible();
  await expect(page.locator('#comparison-rows tr')).toHaveCount(12);
  await expect(page.locator('#district-detail .detail-score')).toContainText('45.8');
  await expect(page.locator('.disclaimer')).toContainText('這是模擬，不是城市現況排名');
  for (const file of ['app.mjs','model.mjs','content.mjs','styles.css','logo.svg']) {
    const response=await page.request.get(file);
    expect(response.status()).toBe(200);
  }
});
test('weight slider changes scores and maintains 100%, including zero fallback', async ({page}) => {
  await setWeight(page,'H',100);
  expect(await currentWeights(page)).toEqual({H:100,P:0,V:0});
  await setWeight(page,'H',60);
  const w=await currentWeights(page);
  expect(w).toEqual({H:60,P:20,V:20});
  const expected=rank(w).find(r=>r.name==='大同區').TES.toFixed(1);
  await expect(page.locator('#district-detail .detail-score')).toContainText(expected);
  await expect(page.locator('#number-P')).toContainText('20');
  await expect(page.locator('#summary-strip')).toContainText('總和 100%');
});
test('preset, PPI toggle and reset update graph labels and restore the baseline', async ({page}) => {
  await page.locator('[data-preset="vulnerable"]').click();
  expect(await currentWeights(page)).toEqual({H:25,P:25,V:50});
  await page.locator('[data-metric="PPI"]').click();
  await expect(page.locator('[data-metric="PPI"]')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#chart-explainer')).toContainText('PPI 越高');
  const expected=rank({H:25,P:25,V:50}).find(r=>r.name==='大同區').PPI.toFixed(1);
  await expect(page.locator('.bar-row[data-district="大同區"] .bar-number')).toHaveText(expected);
  await page.locator('#reset-weights').click();
  expect(await currentWeights(page)).toEqual(DEFAULT_WEIGHTS);
  await expect(page.locator('#district-detail .detail-score')).toContainText('45.8');
});
test('district selection preserves keyboard focus and filtering keeps both pilots', async ({page}) => {
  await page.locator('.bar-row[data-district="萬華區"]').click();
  await expect(page.locator('#district-detail h3')).toContainText('萬華區');
  await expect(page.locator('.bar-row[data-district="萬華區"]')).toBeFocused();
  await expect(page.locator('.bar-row[data-district="萬華區"]')).toHaveAttribute('aria-pressed','true');
  await page.locator('#pilot-only').check();
  await expect(page.locator('#comparison-rows tr')).toHaveCount(2);
  await page.locator('#pilot-only').uncheck();
  await expect(page.locator('#comparison-rows tr')).toHaveCount(12);
});
test('hash navigation, fieldwork district selector and source disclosure work', async ({page}) => {
  await page.locator('.nav-link[data-view="fieldwork"]').click();
  await expect(page.locator('#fieldwork-view')).toBeVisible();
  await expect(page.locator('#dashboard-view')).toBeHidden();
  await page.locator('[data-field-district="wh"]').click();
  await expect(page.locator('[data-corridor-district="wh"]')).toBeVisible();
  await expect(page.locator('[data-corridor-district="dt"]')).toBeHidden();
  await page.locator('.nav-link[data-view="sources"]').click();
  await expect(page.locator('#sources-view')).toBeVisible();
  await expect(page.locator('#sources-view')).toContainText('並非真實人口密度');
  await page.reload();
  await expect(page.locator('#sources-view')).toBeVisible();
});
test('CSV download includes the exact scenario and all twelve districts', async ({page}) => {
  await page.locator('[data-preset="heat"]').click();
  const pending=page.waitForEvent('download');
  await page.locator('#export-csv').click();
  const download=await pending;
  expect(download.suggestedFilename()).toContain('H60_P25_V15');
  const csv=await readFile(await download.path(),'utf8');
  expect(csv.split('\r\n')).toHaveLength(13);
  expect(csv).toContain('"60","25","15"');
  expect(csv).toContain('非實測／非官方評分');
});
test('all documentation downloads exist under the project subpath', async ({page}) => {
  for (const file of ['site-sampling-plan.md','candidate-template.csv','simulation-inputs.csv']) {
    const response=await page.request.get(`downloads/${file}`);
    expect(response.status()).toBe(200);
    expect((await response.body()).length).toBeGreaterThan(0);
  }
});
test('reduced-motion selection and page layout remain accessible without horizontal overflow', async ({page}) => {
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.locator('.table-district[data-district="大同區"]').click();
  await expect(page.locator('.table-district[data-district="大同區"]')).toBeFocused();
  const sizes=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));
  expect(sizes.scroll).toBeLessThanOrEqual(sizes.client+1);
});
