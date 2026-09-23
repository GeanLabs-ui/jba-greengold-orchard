import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const baseURL = process.env.BROWSER_BASE_URL;
if (!baseURL || new URL(baseURL).protocol !== 'https:') throw new Error('BROWSER_BASE_URL must be an HTTPS deployment origin');
const origin = new URL(baseURL).origin;
const output = 'test-results/browser-smoke';
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const results = [];
try {
  for (const [device, viewport] of Object.entries({ desktop: { width: 1440, height: 1000 }, mobile: { width: 390, height: 844 } })) {
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    const consoleErrors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    page.on('response', response => {
      if (response.url().startsWith(origin) && (response.status() >= 500 || (response.url().includes('/assets/') && response.status() >= 400))) {
        errors.push(`HTTP ${response.status()}: ${response.url()}`);
      }
    });
    page.on('requestfailed', request => {
      if (request.url().startsWith(`${origin}/assets/`) && !request.failure()?.errorText.includes('ERR_ABORTED')) errors.push(`Asset failed: ${request.url()}`);
    });
    for (const route of ['/', '/about', '/products', '/farms', '/sustainability', '/supply', '/news', '/careers', '/contact', '/privacy', '/terms', '/login', '/staff-login']) {
      const response = await page.goto(origin + route, { waitUntil: 'load', timeout: 60000 });
      assert.equal(response.status(), 200, `${route} should load`);
      await page.locator('h1').first().waitFor({ state: 'visible' });
      assert.ok((await page.locator('h1').first().innerText()).trim(), `${route} should render its heading`);
      if (route === '/products') {
        if (device === 'mobile') await page.getByRole('button', { name: 'Categories & Filters' }).click();
        await page.getByRole('button', { name: 'Apply Filters', exact: true }).click();
        await page.getByRole('heading', { name: /All Products/ }).waitFor({ state: 'visible' });
        const home = page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: 'Home', exact: true });
        await home.click();
        await page.waitForURL(origin + '/');
        await page.goto(origin + route, { waitUntil: 'load' });
      }
      if (route === '/about') {
        await page.getByRole('heading', { name: 'John Boakye Asante', exact: true }).waitFor();
        const portrait = page.getByRole('img', { name: 'Benedict Asante, Co-Founder', exact: true });
        await portrait.scrollIntoViewIfNeeded();
        await portrait.evaluate(image => image.decode());
        assert.equal(await portrait.getAttribute('src'), '/pages/about/founder-benedict-original.jpg');
        await page.locator('.ab-founders').screenshot({ path: `${output}/${device}-founders.png` });
        await page.getByText('Unlocking Prosperity Through Land Cultivation', { exact: true }).scrollIntoViewIfNeeded();
        await page.screenshot({ path: `${output}/${device}-footer.png` });
        await page.evaluate(() => window.scrollTo(0, 0));
      }
      const screenshot = `${output}/${device}-${route === '/' ? 'home' : route.slice(1)}.png`;
      await page.screenshot({ path: screenshot });
      results.push({ device, route, status: 'passed', screenshot });
    }
    assert.deepEqual(errors, [], `${device}: uncaught browser errors or broken resources`);
    results.push({ device, consoleErrors });
    await context.close();
  }
  console.log('Browser smoke passed: desktop/mobile rendering, product filters, navigation, and asset/runtime checks.');
} catch (error) {
  results.push({ status: 'failed', error: error.message });
  throw error;
} finally {
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
  await browser.close();
}
