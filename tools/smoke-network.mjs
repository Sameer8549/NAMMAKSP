import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const baseUrl = process.argv[2] || 'http://127.0.0.1:8000/';
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
const failedResponses = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => {
  if (message.type() === 'error') errors.push(message.text());
});
page.on('response', response => {
  if (response.status() >= 400) failedResponses.push({ status: response.status(), url: response.url() });
});

await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
await page.locator('input[type="text"]').fill('analyst');
await page.locator('input[type="password"]').fill('analyst123');
await page.locator('form').press('Enter');
try {
  await page.getByText('Crime Analysis Observatory', { exact: true }).waitFor({ timeout: 15000 });
} catch (error) {
  console.error(JSON.stringify({ body: (await page.locator('body').innerText()).slice(0, 1200), errors, failedResponses }, null, 2));
  throw error;
}

await page.getByRole('button', { name: /Network Analysis/i }).click();
await page.getByText('Individual Suspect Network Topology', { exact: true }).waitFor();
await page.getByRole('button', { name: /Open Individual Network/i }).first().click();

const evidenceNodes = page.locator('[data-node-id]');
await evidenceNodes.first().waitFor();
const nodeCount = await evidenceNodes.count();
const targetNode = evidenceNodes.nth(Math.min(1, nodeCount - 1));
const targetLabel = await targetNode.getAttribute('aria-label');
await targetNode.press('Enter');
await page.getByText(/SELECTED .* EVIDENCE/i).waitFor();

const edges = page.locator('[data-edge-id]');
const edgeCount = await edges.count();
if (edgeCount) {
  await edges.first().press('Enter');
  await page.getByText('Selected relationship:', { exact: false }).waitFor();
}

await page.getByRole('button', { name: /Hotspots/i }).click();
await page.locator('.maplibregl-canvas').waitFor({ timeout: 15000 });

console.log(JSON.stringify({
  nodeCount,
  edgeCount,
  selectedNode: targetLabel,
  mapCanvas: await page.locator('.maplibregl-canvas').count(),
  errors,
}, null, 2));

await browser.close();
