import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:5174';
const output = new URL('../artifacts/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: process.env.TEST_BROWSER_CHANNEL || 'chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
const results = [];
const errors = [];
async function waitReady(page) {
  await page.waitForFunction(() => {
    const map = document.querySelector('.map-space');
    return map?.dataset.mapStatus === 'ready' && map.dataset.themeStyle === map.dataset.loadedStyle;
  }, null, { timeout: 60_000 });
}
async function metric(page, label) {
  return page.locator('dt').filter({ hasText: label }).locator('..').locator('dd').innerText();
}
async function api(page, path, data) {
  const response = data ? await page.request.post(`${base}/api/v1${path}`, { data }) : await page.request.get(`${base}/api/v1${path}`);
  assert.equal(response.status(), 200, path);
  const json = await response.json(); assert.equal(json.success, true); return json.data;
}
async function sourceCount(page, name, expected) {
  await page.waitForFunction(({ name, expected }) => document.querySelector('.maplibregl-canvas')?.dataset[name] === String(expected), { name, expected }, { timeout: 45_000 });
}
async function screenshot(page, name) { await page.screenshot({ path: new URL(name, output).pathname.replace(/^\/([A-Z]:)/, '$1'), fullPage: true }); }
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
  const page = await context.newPage();
  let vectorTiles = 0;
  let workerLoaded = false;
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (response.status() === 200 && response.url().includes('openfreemap') && response.url().includes('.pbf')) vectorTiles++;
    if (response.status() === 200 && response.url().includes('maplibre-gl-worker')) workerLoaded = true;
  });
  await page.goto(base);
  await sourceCount(page, 'roads', 15152);
  await waitReady(page);
  assert(vectorTiles > 0, 'Vector tiles must actually load');
  assert(workerLoaded, 'Bundled worker must load');
  const dimensions = await page.locator('.maplibregl-canvas').boundingBox();
  assert(dimensions.height > 400 && dimensions.width > 400);
  const area = (await api(page, '/study-areas')).items.find((area) => area.slug === 'sukkur-rohri');
  const scenarios = (await api(page, `/study-areas/${area.id}/scenarios`)).scenarios;
  for (const scenario of scenarios) {
    await page.getByRole('button', { name: new RegExp(scenario.title.replace(/^Scenario \d+\s*[—–-]\s*/, '')) }).click();
    const impact = await api(page, `/scenarios/${scenario.id}/impact`);
    const zones = await api(page, `/scenarios/${scenario.id}/zones`);
    await sourceCount(page, 'closures', impact.affectedPhysicalSegments);
    await sourceCount(page, 'flood', zones.features.length);
    assert.equal(await metric(page, 'Affected physical segments'), impact.affectedPhysicalSegments.toLocaleString('en-US'));
    assert.equal(await metric(page, 'Blocked directed arcs'), impact.blockedDirectedArcs.toLocaleString('en-US'));
  }
  await page.getByRole('button', { name: 'Load rerouting demo' }).click();
  await page.getByRole('heading', { name: 'Alternative route available' }).waitFor({ timeout: 45_000 });
  const comparison = await api(page, '/routing/compare', { studyAreaId: area.id, scenarioId: scenarios[1].id, originNodeId: '529', destinationNodeId: '806', expectedDatasetVersion: area.datasetVersion });
  assert.equal(comparison.outcome, 'rerouted');
  assert.equal(await metric(page, 'Baseline distance'), `${(comparison.baseline.distanceMeters / 1000).toFixed(2)} km`);
  assert.equal(await metric(page, 'Scenario distance'), `${(comparison.scenario.distanceMeters / 1000).toFixed(2)} km`);
  await sourceCount(page, 'baseline', 1); await sourceCount(page, 'scenario', 1); await sourceCount(page, 'endpoints', 2);
  await waitReady(page); await screenshot(page, 'desktop-light-reroute.png');
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await waitReady(page);
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
  assert.equal(await page.locator('.map-space').getAttribute('data-theme-style'), 'https://tiles.openfreemap.org/styles/dark');
  await sourceCount(page, 'closures', 1971); await sourceCount(page, 'baseline', 1); await sourceCount(page, 'scenario', 1);
  await screenshot(page, 'desktop-dark-reroute.png');
  const pressed = page.getByRole('button', { name: 'Localized Flood', exact: false });
  await pressed.click();
  await page.getByRole('button', { name: 'Wide Flood Disruption', exact: false }).click();
  await page.getByRole('button', { name: 'Bridge Corridor Flood', exact: false }).click();
  await sourceCount(page, 'closures', 1971);
  assert.equal(await metric(page, 'Affected physical segments'), '1,971');
  await page.getByRole('button', { name: 'Load unreachable demo' }).click();
  await page.getByRole('heading', { name: 'Unreachable under simulation' }).waitFor({ timeout: 45_000 });
  await sourceCount(page, 'baseline', 1); await sourceCount(page, 'scenario', 0);
  assert.equal(await metric(page, 'Baseline distance'), '4.50 km');
  assert.equal(await metric(page, 'Scenario distance'), 'Unreachable');
  await waitReady(page);
  await screenshot(page, 'desktop-dark-unreachable.png');
  await page.setViewportSize({ width: 1280, height: 800 });
  await waitReady(page);
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await screenshot(page, 'desktop-1280-dark.png');
  await page.reload(); await waitReady(page);
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
  results.push({ check: 'Desktop map, tiles, all scenarios, metrics, rerouting, unreachable, rapid switching, style restoration and persistence', status: 'PASSED', vectorTiles });
  await context.close();

  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, colorScheme: 'light' });
  const mobile = await mobileContext.newPage(); mobile.on('pageerror', (error) => errors.push(error.message));
  await mobile.goto(base); await sourceCount(mobile, 'roads', 15152); await waitReady(mobile);
  assert(await mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  const beforeZoom = await mobile.locator('.map-footnote').innerText();
  await mobile.getByRole('button', { name: 'Zoom in', exact: true }).tap();
  await mobile.waitForFunction((before) => document.querySelector('.map-footnote')?.innerText !== before, beforeZoom);
  await mobile.getByRole('button', { name: 'Origin Choose on map', exact: false }).tap();
  await mobile.locator('.map-viewport').scrollIntoViewIfNeeded();
  const beforePan = await mobile.locator('.map-footnote').innerText();
  const canvas = await mobile.locator('.maplibregl-canvas').boundingBox();
  const touch = await mobileContext.newCDPSession(mobile);
  const touchX = canvas.x + canvas.width / 2;
  const touchY = canvas.y + canvas.height / 2;
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: touchX, y: touchY }] });
  for (let step = 1; step <= 8; step++) await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: touchX + step * 5, y: touchY + step * 3 }] });
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await touch.detach();
  await mobile.waitForFunction((before) => document.querySelector('.map-footnote')?.innerText !== before, beforePan);
  await mobile.getByRole('button', { name: 'Use map center' }).tap();
  await mobile.locator('.point-button').first().filter({ hasText: /Node/ }).waitFor({ timeout: 45_000 });
  await mobile.getByRole('button', { name: 'Load rerouting demo' }).tap();
  await mobile.getByRole('heading', { name: 'Alternative route available' }).waitFor({ timeout: 45_000 });
  await sourceCount(mobile, 'scenario', 1); await waitReady(mobile);
  await mobile.evaluate(() => window.scrollTo(0, 0));
  await screenshot(mobile, 'mobile-light-reroute.png');
  await mobile.getByRole('button', { name: 'Switch to dark theme' }).tap(); await waitReady(mobile);
  await sourceCount(mobile, 'closures', 1971); await sourceCount(mobile, 'scenario', 1);
  assert(await mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await screenshot(mobile, 'mobile-dark-reroute.png');
  // API failure and retry exercise the real rendered error state.
  await mobile.route('**/api/v1/scenarios/*/impact', (route) => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, error: { code: 'SPATIAL_ANALYSIS_UNAVAILABLE', message: 'Unavailable' }, meta: { requestId: 'browser-test' } }) }));
  await mobile.getByRole('button', { name: 'Refresh workspace' }).tap();
  await mobile.getByRole('alert').filter({ hasText: 'analysis request failed' }).waitFor({ timeout: 45_000 });
  await mobile.unroute('**/api/v1/scenarios/*/impact');
  await mobile.getByRole('button', { name: 'Refresh workspace' }).tap();
  await mobile.getByRole('alert').filter({ hasText: 'analysis request failed' }).waitFor({ state: 'hidden', timeout: 45_000 });
  results.push({ check: '390 px mobile layout, touch controls, zoom/pan, real snapping, routes, both themes, error and recovery', status: 'PASSED' });
  await mobileContext.close();

  const emptyContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const empty = await emptyContext.newPage();
  await empty.route('**/api/v1/study-areas', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: { items: [] }, meta: { requestId: 'browser-test' } }) }));
  await empty.goto(base); await empty.getByRole('heading', { name: 'No active dataset' }).waitFor();
  assert(await empty.getByRole('button', { name: 'Calculate routes' }).isDisabled());
  await emptyContext.close();
  results.push({ check: 'Empty dataset state', status: 'PASSED' });
  assert.deepEqual(errors, [], 'No browser JavaScript errors');
  await writeFile(new URL('browser-verification.json', output), JSON.stringify({ status: 'PASSED', base, results, errors }, null, 2));
  console.log(JSON.stringify({ status: 'PASSED', results, errors }, null, 2));
} catch (error) {
  console.error('Browser verification FAILED:', error.message);
  process.exitCode = 1;
} finally { await browser.close(); }
