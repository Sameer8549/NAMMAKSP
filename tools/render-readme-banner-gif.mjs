import { chromium } from 'playwright';
import gifenc from 'gifenc';
import { PNG } from 'pngjs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const width = 1000;
const height = 300;
const frames = 24;
const delay = 70;
const frameDir = path.join(root, 'output', 'readme-banner-gif');
const outPath = path.join(root, 'docs', 'assets', 'namma-ksp-readme-banner.gif');
const { GIFEncoder, quantize, applyPalette } = gifenc;

async function dataUri(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mime = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
  const bytes = await readFile(filePath);
  return `data:${mime};base64,${bytes.toString('base64')}`;
}

const assets = {
  logo: await dataUri(path.join(root, 'web-client', 'src', 'assets', 'ksp_official_crest_hd.png')),
  map: await dataUri(path.join(root, 'web-client', 'src', 'assets', 'karnataka_map_overlay.png')),
  screen: await dataUri(path.join(root, 'docs', 'screenshots', 'readme', '03-network-analysis.png')),
};

const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    html, body { margin: 0; width: ${width}px; height: ${height}px; overflow: hidden; background: #050b14; }
    canvas { display: block; width: ${width}px; height: ${height}px; }
  </style>
</head>
<body>
<canvas id="banner" width="${width}" height="${height}"></canvas>
<script>
const assets = ${JSON.stringify(assets)};
const canvas = document.getElementById('banner');
const ctx = canvas.getContext('2d');
const W = canvas.width;
const H = canvas.height;
const S = W / 1400;
const load = (src) => new Promise((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = reject;
  image.src = src;
});
let logo, map, screen;
function rr(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function tx(text, x, y, font, color) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}
function line(x1, y1, x2, y2, color, alpha = 0.7) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}
function node(x, y, label, color, pulse) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 12 + pulse * 10;
  ctx.fillStyle = '#08111f';
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(x, y, 15 + pulse * 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  tx(label, x, y + 0.5, '900 10px Segoe UI, Arial', color);
  ctx.restore();
}
function chip(text, x, y, w) {
  rr(x, y, w, 26, 8);
  ctx.fillStyle = 'rgba(15,23,42,0.86)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(148,163,184,0.35)';
  ctx.stroke();
  tx(text, x + 11, y + 18, '800 11px Segoe UI, Arial', '#dbeafe');
}
function metric(value, label, x) {
  rr(x, 253, 88, 38, 9);
  ctx.fillStyle = 'rgba(15,23,42,0.92)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(96,165,250,0.24)';
  ctx.stroke();
  tx(value, x + 10, 276, '900 20px Segoe UI, Arial', '#f8fafc');
  tx(label, x + 10, 290, '900 8px Segoe UI, Arial', '#b6c8dc');
}
window.ready = Promise.all([load(assets.logo), load(assets.map), load(assets.screen)]).then((imgs) => {
  [logo, map, screen] = imgs;
});
window.drawFrame = async (i, total) => {
  await window.ready;
  const t = i / total;
  const pulse = (Math.sin(t * Math.PI * 2) + 1) / 2;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.scale(S, S);

  const bg = ctx.createLinearGradient(0, 0, 1400, 420);
  bg.addColorStop(0, '#050b14');
  bg.addColorStop(0.52, '#09172a');
  bg.addColorStop(1, '#06101f');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1400, 420);

  ctx.save();
  ctx.globalAlpha = 0.24;
  ctx.strokeStyle = '#294158';
  for (let x = 0; x < 1400; x += 42) line(x, 0, x, 420, '#294158', 0.55);
  for (let y = 0; y < 420; y += 42) line(0, y, 1400, y, '#294158', 0.55);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.drawImage(map, 625, 8, 368, 392);
  ctx.restore();

  const scanY = 32 + 322 * t;
  const scan = ctx.createLinearGradient(610, scanY - 26, 1015, scanY + 26);
  scan.addColorStop(0, 'rgba(34,211,238,0)');
  scan.addColorStop(0.5, 'rgba(34,211,238,0.28)');
  scan.addColorStop(1, 'rgba(250,204,21,0)');
  ctx.fillStyle = scan;
  ctx.fillRect(608, scanY - 18, 424, 36);

  rr(64, 42, 76, 76, 18);
  ctx.fillStyle = 'rgba(255,255,255,0.96)';
  ctx.fill();
  ctx.drawImage(logo, 74, 52, 56, 56);
  tx('KARNATAKA STATE POLICE', 158, 82, '900 16px Segoe UI, Arial', '#facc15');
  tx('DATATHON 2026', 158, 105, '900 16px Segoe UI, Arial', '#facc15');

  tx('NAMMA', 64, 228, '900 74px Segoe UI, Arial', '#f8fafc');
  tx('KSP', 395, 228, '900 74px Segoe UI, Arial', '#facc15');
  tx('Crime Intelligence Platform', 64, 282, '800 30px Segoe UI, Arial', '#dbeafe');
  const accent = ctx.createLinearGradient(64, 310, 580, 310);
  accent.addColorStop(0, '#facc15');
  accent.addColorStop(0.58, '#22d3ee');
  accent.addColorStop(1, 'rgba(34,211,238,0)');
  ctx.fillStyle = accent;
  ctx.fillRect(64, 310, 520, 2);
  chip('Conversational AI', 64, 331, 146);
  chip('FIR Intelligence', 222, 331, 134);
  chip('Network Analysis', 368, 331, 148);
  chip('Forecasting', 528, 331, 104);
  chip('PWA', 64, 376, 60);
  chip('Live on AppSail', 136, 376, 132);

  const nodes = [
    [842, 206, 'FIR', '#facc15'],
    [706, 168, 'A', '#22d3ee'],
    [918, 150, 'V', '#22d3ee'],
    [722, 284, 'L', '#22d3ee'],
    [928, 300, 'MO', '#22d3ee'],
  ];
  [[0, 1], [0, 2], [0, 3], [0, 4], [1, 3], [2, 4]].forEach(([a, b], idx) => {
    line(nodes[a][0], nodes[a][1], nodes[b][0], nodes[b][1], idx % 2 ? '#facc15' : '#22d3ee', 0.72);
  });
  nodes.forEach((n, idx) => node(n[0], n[1], n[2], n[3], idx === 0 ? pulse : Math.max(0, pulse - 0.2)));

  rr(936, 45, 410, 138, 18);
  ctx.fillStyle = 'rgba(8,17,31,0.88)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(96,165,250,0.34)';
  ctx.stroke();
  tx('NATURAL LANGUAGE INVESTIGATION', 954, 78, '900 16px Segoe UI, Arial', '#facc15');
  rr(954, 97, 374, 64, 12);
  ctx.fillStyle = 'rgba(15,23,42,0.9)';
  ctx.fill();
  ctx.stroke();
  tx('Ask about FIRs, suspects, victims,', 969, 125, '800 16px Segoe UI, Arial', '#dbeafe');
  tx('locations and evidence trails.', 969, 147, '800 16px Segoe UI, Arial', '#dbeafe');

  rr(936, 196, 410, 150, 18);
  ctx.save();
  ctx.clip();
  ctx.globalAlpha = 0.86;
  ctx.drawImage(screen, 936, 196, 410, 150);
  ctx.restore();
  ctx.strokeStyle = 'rgba(96,165,250,0.34)';
  ctx.stroke();
  metric('5K', 'FIRS', 952);
  metric('2K', 'OFFENDERS', 1082);
  metric('5', 'ROLES', 1212);
};
</script>
</body>
</html>`;

await mkdir(frameDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: 'load' });
await page.evaluate(() => window.ready);

const gif = GIFEncoder({ auto: false });
for (let i = 0; i < frames; i += 1) {
  await page.evaluate(([frame, total]) => window.drawFrame(frame, total), [i, frames]);
  const pngBuffer = await page.locator('canvas').screenshot({
    type: 'png',
    path: path.join(frameDir, `frame-${String(i).padStart(2, '0')}.png`),
  });
  const png = PNG.sync.read(pngBuffer);
  const palette = quantize(png.data, 128, { format: 'rgb565' });
  const index = applyPalette(png.data, palette, 'rgb565');
  gif.writeFrame(index, width, height, { palette, delay });
}

gif.finish();
await writeFile(outPath, gif.bytes());
await browser.close();
console.log(outPath);
