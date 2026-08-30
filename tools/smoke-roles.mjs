import { chromium } from 'playwright';

const roles = [
  ['admin', 'admin123', 'ADMIN'],
  ['officer', 'officer123', 'INVESTIGATOR'],
  ['analyst', 'analyst123', 'ANALYST'],
  ['supervisor', 'supervisor123', 'SUPERVISOR'],
  ['policymaker', 'policy123', 'POLICYMAKER'],
];

const browser = await chromium.launch({ headless: true });
const results = [];
for (const [username, password, role] of roles) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  try {
    await page.goto('http://127.0.0.1:8000/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.locator('input[type="text"]').fill(username);
    await page.locator('input[type="password"]').fill(password);
    await page.locator('form').press('Enter');
    await page.waitForFunction(() => !document.querySelector('.login-card'), null, { timeout: 15000 });
    await page.waitForTimeout(1500);
    const body = await page.locator('body').innerText();
    results.push({ role, opened: body.includes(role === 'POLICYMAKER' ? 'State Prevention Intelligence' : role === 'SUPERVISOR' ? 'AGING CASES' : role === 'ADMIN' ? 'Platform Governance' : role === 'ANALYST' ? 'Crime Analysis Observatory' : 'Case'), charts: await page.locator('.recharts-wrapper').count(), errors });
  } catch (error) {
    results.push({ role, opened: false, charts: 0, errors: [...errors, error.message] });
  }
  await context.close();
}
await browser.close();
console.log(JSON.stringify(results, null, 2));
