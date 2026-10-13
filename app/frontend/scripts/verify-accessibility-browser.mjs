import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const liveBase = process.env.TEST_BASE_URL || 'http://127.0.0.1:4175';
const demoBase = process.env.TEST_DEMO_BASE_URL || 'http://127.0.0.1:4176';
const output = new URL('../artifacts/accessibility/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: process.env.TEST_BROWSER_CHANNEL || 'chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
const errors = [], results = [];
async function ready(page) { await page.waitForFunction(() => { const map = document.querySelector('.map-space'); return map?.dataset.mapStatus === 'ready' && map.dataset.loadedStyle === map.dataset.themeStyle; }, null, { timeout: 60000 }); }
async function screenshot(page, name) { await page.screenshot({ path: new URL(name, output).pathname.replace(/^\/([A-Z]:)/, '$1'), fullPage: !name.includes('comparison') }); }
async function closureReady(page) {
  await page.waitForFunction(() => document.querySelector('.maplibregl-canvas')?.dataset.closures === '1971', null, { timeout: 45000 });
  await ready(page);
}
async function metric(container, label) { return container.locator('dt').filter({ hasText: label }).locator('..').locator('dd').innerText(); }
async function comparison(page, base, pair) {
  const areas = (await (await page.request.get(`${base}/api/v1/study-areas`)).json()).data.items;
  const area = areas.find((area) => area.slug === 'sukkur-rohri');
  const scenarios = (await (await page.request.get(`${base}/api/v1/study-areas/${area.id}/scenarios`)).json()).data.scenarios;
  const response = await page.request.post(`${base}/api/v1/analysis/compare`, { data: { studyAreaId: area.id, scenarioIds: scenarios.map((scenario) => scenario.id), originNodeId: pair[0], destinationNodeId: pair[1], expectedDatasetVersion: area.datasetVersion } });
  assert.equal(response.status(), 200);
  return (await response.json()).data;
}
try {
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
  const page = await desktop.newPage(); page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(liveBase); await ready(page);
  await page.getByRole('heading', { name: 'No verified shelter data available' }).waitFor({ timeout: 45000 });
  await page.getByRole('button', { name: 'Compare scenarios A/B/C' }).click();
  await page.getByRole('heading', { name: 'Select an origin first' }).waitFor();
  await page.keyboard.press('Escape'); assert.equal(await page.locator('dialog').evaluate((node) => node.open), false);
  await page.getByRole('button', { name: 'Load rerouting demo' }).click();
  await page.getByRole('heading', { name: 'Alternative route available' }).waitFor({ timeout: 45000 });
  await ready(page);
  assert.equal(await metric(page.locator('.route-result'), 'Baseline distance'), '4.42 km');
  assert.equal(await metric(page.locator('.route-result'), 'Scenario distance'), '4.98 km');
  await page.getByRole('button', { name: 'Compare scenarios A/B/C' }).click();
  await page.locator('.comparison-card').nth(2).waitFor({ timeout: 45000 });
  const actual = await comparison(page, liveBase, ['529', '806']);
  for (let index = 0; index < 3; index++) {
    const card = page.locator('.comparison-card').nth(index), item = actual.items[index];
    assert.equal(await metric(card, 'Affected physical segments'), item.affectedPhysicalSegments.toLocaleString('en-US'));
    assert.equal(await metric(card, 'Unique closures'), item.uniqueBlockedPhysicalSegmentIds.length.toLocaleString('en-US'));
    assert.equal(await metric(card, 'Accessible / inaccessible / unknown shelters'), 'No data');
  }
  await screenshot(page, 'desktop-comparison-light.png');
  await page.getByRole('button', { name: 'Close scenario comparison' }).click();
  await page.getByRole('button', { name: 'Switch to dark theme' }).click(); await ready(page);
  await page.getByRole('button', { name: 'Compare scenarios A/B/C' }).click(); await screenshot(page, 'desktop-comparison-dark.png');
  await page.getByRole('button', { name: 'Inspect on map' }).nth(1).click(); await ready(page);
  await page.getByRole('button', { name: 'Load unreachable demo' }).click();
  await page.getByRole('heading', { name: 'Unreachable under simulation' }).waitFor({ timeout: 45000 });
  await page.getByRole('button', { name: 'Compare scenarios A/B/C' }).click();
  await page.locator('.comparison-card').nth(1).getByText('Unreachable', { exact: true }).waitFor({ timeout: 45000 });
  assert.equal(await metric(page.locator('.comparison-card').nth(1), 'Distance increase'), '—');
  await page.getByRole('button', { name: 'Close scenario comparison' }).click();
  await page.getByRole('heading', { name: 'No verified shelter data available' }).waitFor();
  results.push({ check: 'Live empty shelter directory, desktop light/dark A/B/C, actual API metrics, modal keyboard close, old reroute and unreachable fixtures', status: 'PASSED' });
  await desktop.close();

  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, colorScheme: 'light' });
  const mobile = await mobileContext.newPage(); mobile.on('pageerror', (error) => errors.push(error.message));
  await mobile.goto(demoBase); await ready(mobile);
  await mobile.getByText('Development fixtures only. These are not real shelters.').waitFor({ timeout: 45000 });
  await mobile.getByRole('button', { name: 'Load rerouting demo' }).tap();
  await mobile.getByRole('heading', { name: 'Alternative route available' }).waitFor({ timeout: 45000 });
  await mobile.locator('.shelter-row').first().tap();
  await mobile.getByRole('button', { name: 'Route to network connection' }).tap();
  await mobile.getByRole('heading', { name: 'Alternative route available' }).waitFor({ timeout: 45000 });
  await closureReady(mobile);
  assert.equal(await metric(mobile.locator('.route-result'), 'Scenario distance'), '4.98 km');
  assert.equal(await mobile.locator('.maplibregl-canvas').getAttribute('data-shelters'), '3');
  await mobile.evaluate(() => window.scrollTo(0, 0)); await screenshot(mobile, 'mobile-shelters-light.png');
  await mobile.getByRole('button', { name: 'Switch to dark theme' }).tap(); await ready(mobile);
  await mobile.getByRole('button', { name: 'Load unreachable demo' }).tap();
  await mobile.getByRole('heading', { name: 'Unreachable under simulation' }).waitFor({ timeout: 45000 });
  await mobile.locator('.shelter-row').filter({ hasText: 'node 2814' }).tap();
  await mobile.getByText('No path remains under this simulation', { exact: true }).waitFor({ timeout: 45000 });
  await mobile.locator('.shelter-row').filter({ hasText: 'missing location' }).tap();
  assert(await mobile.getByRole('button', { name: 'Route to network connection' }).isDisabled());
  assert(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await closureReady(mobile); await mobile.evaluate(() => window.scrollTo(0, 0)); await screenshot(mobile, 'mobile-shelters-dark.png');
  await mobile.getByRole('button', { name: 'Compare scenarios A/B/C' }).tap();
  await mobile.locator('.comparison-card').nth(1).getByText('Unreachable', { exact: true }).waitFor({ timeout: 45000 });
  assert(await mobile.locator('dialog').evaluate((node) => node.scrollWidth <= node.clientWidth));
  await screenshot(mobile, 'mobile-comparison-dark.png');
  await mobile.getByRole('button', { name: 'Close scenario comparison' }).tap();
  await mobile.getByRole('button', { name: 'Switch to light theme' }).tap(); await ready(mobile);
  await mobile.getByRole('button', { name: 'Compare scenarios A/B/C' }).tap(); await screenshot(mobile, 'mobile-comparison-light.png');
  await mobile.getByRole('button', { name: 'Close scenario comparison' }).tap();
  await mobile.route('**/api/v1/shelters/reachability', (route) => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, error: { code: 'UNAVAILABLE', message: 'Unavailable' }, meta: { requestId: 'browser-test' } }) }));
  await mobile.getByRole('button', { name: 'Refresh workspace' }).tap();
  await mobile.locator('.shelter-inspector').getByRole('alert').waitFor({ timeout: 45000 });
  await mobile.unroute('**/api/v1/shelters/reachability'); await mobile.getByRole('button', { name: 'Retry shelters' }).tap();
  await mobile.locator('.shelter-inspector').getByRole('alert').waitFor({ state: 'hidden', timeout: 45000 });
  results.push({ check: 'Isolated hypothetical fixtures, reachable/unreachable/unknown, shelter destination routing, mobile light/dark comparison, no overflow, failure/retry', status: 'PASSED' });
  await mobileContext.close();
  assert.deepEqual(errors, []);
  await writeFile(new URL('browser-verification.json', output), JSON.stringify({ status: 'PASSED', liveBase, demoBase, results, errors }, null, 2));
  console.log(JSON.stringify({ status: 'PASSED', results, errors }, null, 2));
} catch (error) { console.error('Accessibility browser verification FAILED:', error.message); process.exitCode = 1; }
finally { await browser.close(); }
