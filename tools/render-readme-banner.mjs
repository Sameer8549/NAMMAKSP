import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const outDir = path.join(root, 'output', 'readme-banner');
const htmlPath = path.join(outDir, 'banner.html');
const outPath = path.join(root, 'docs', 'assets', 'namma-ksp-readme-banner.png');

const logo = pathToFileURL(path.join(root, 'web-client', 'src', 'assets', 'ksp_official_crest_hd.png')).href;
const map = pathToFileURL(path.join(root, 'web-client', 'src', 'assets', 'karnataka_map_overlay.png')).href;
const screen = pathToFileURL(path.join(root, 'docs', 'screenshots', 'readme', '03-network-analysis.png')).href;

const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      width: 1400px;
      height: 420px;
      overflow: hidden;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #050b14;
    }
    .banner {
      position: relative;
      width: 1400px;
      height: 420px;
      overflow: hidden;
      border-radius: 30px;
      color: #f8fafc;
      background:
        radial-gradient(circle at 78% 18%, rgba(37, 99, 235, 0.24), transparent 28%),
        radial-gradient(circle at 24% 105%, rgba(250, 204, 21, 0.16), transparent 30%),
        linear-gradient(135deg, #06101f 0%, #09172a 48%, #050b14 100%);
    }
    .banner::before {
      content: "";
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(rgba(148, 163, 184, 0.08) 1px, transparent 1px),
        linear-gradient(90deg, rgba(148, 163, 184, 0.08) 1px, transparent 1px);
      background-size: 42px 42px;
      mask-image: linear-gradient(90deg, #000 0%, rgba(0,0,0,0.74) 58%, rgba(0,0,0,0.35) 100%);
    }
    .banner::after {
      content: "";
      position: absolute;
      inset: auto 0 0 0;
      height: 136px;
      background: linear-gradient(0deg, rgba(2, 6, 23, 0.74), transparent);
    }
    .left {
      position: absolute;
      left: 64px;
      top: 42px;
      width: 610px;
      z-index: 2;
    }
    .brand-row {
      display: flex;
      align-items: center;
      gap: 18px;
      margin-bottom: 26px;
    }
    .logo {
      width: 76px;
      height: 76px;
      border-radius: 20px;
      padding: 8px;
      background: rgba(255, 255, 255, 0.96);
      box-shadow: 0 0 0 1px rgba(250, 204, 21, 0.45), 0 18px 42px rgba(0,0,0,0.38);
      object-fit: contain;
    }
    .eyebrow {
      color: #facc15;
      font-size: 15px;
      line-height: 1.25;
      font-weight: 900;
      letter-spacing: 0.22em;
      text-transform: uppercase;
    }
    h1 {
      margin: 0;
      font-size: 72px;
      line-height: 0.92;
      font-weight: 950;
      letter-spacing: 0;
    }
    h1 span {
      color: #facc15;
    }
    .subtitle {
      margin-top: 14px;
      color: #dbeafe;
      font-size: 30px;
      line-height: 1.2;
      font-weight: 750;
    }
    .rule {
      width: 520px;
      height: 2px;
      margin: 16px 0 12px;
      background: linear-gradient(90deg, #facc15, rgba(34, 211, 238, 0.82), transparent);
    }
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    .chip {
      padding: 8px 12px;
      border: 1px solid rgba(148, 163, 184, 0.28);
      border-radius: 10px;
      background: rgba(15, 23, 42, 0.72);
      color: #c7d2fe;
      font-size: 14px;
      font-weight: 800;
    }
    .map {
      position: absolute;
      left: 610px;
      top: 22px;
      width: 370px;
      height: 370px;
      opacity: 0.34;
      object-fit: contain;
      filter: drop-shadow(0 0 24px rgba(34, 211, 238, 0.22));
      z-index: 1;
    }
    .network {
      position: absolute;
      left: 610px;
      top: 84px;
      width: 380px;
      height: 248px;
      z-index: 2;
    }
    .line {
      position: absolute;
      height: 2px;
      background: linear-gradient(90deg, rgba(34, 211, 238, 0), #22d3ee, rgba(250, 204, 21, 0.85));
      transform-origin: left center;
      opacity: 0.72;
    }
    .node {
      position: absolute;
      width: 42px;
      height: 42px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      background: #0b1628;
      border: 2px solid #22d3ee;
      box-shadow: 0 0 24px rgba(34, 211, 238, 0.28);
      color: #e0f2fe;
      font-size: 12px;
      font-weight: 950;
    }
    .node.gold {
      border-color: #facc15;
      box-shadow: 0 0 28px rgba(250, 204, 21, 0.35);
      color: #facc15;
    }
    .right {
      position: absolute;
      right: 54px;
      top: 44px;
      width: 410px;
      z-index: 3;
      display: grid;
      gap: 14px;
    }
    .panel {
      border: 1px solid rgba(96, 165, 250, 0.27);
      border-radius: 18px;
      background: rgba(8, 17, 31, 0.82);
      box-shadow: 0 18px 44px rgba(0,0,0,0.32);
      backdrop-filter: blur(12px);
      overflow: hidden;
    }
    .panel.head {
      padding: 18px;
    }
    .panel-title {
      color: #facc15;
      font-size: 14px;
      font-weight: 950;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 14px;
    }
    .ask {
      padding: 12px 14px;
      border-radius: 12px;
      background: rgba(15, 23, 42, 0.9);
      border: 1px solid rgba(96, 165, 250, 0.36);
      color: #dbeafe;
      font-size: 15px;
      font-weight: 750;
    }
    .screen {
      width: 100%;
      height: 138px;
      object-fit: cover;
      object-position: top;
      opacity: 0.86;
    }
    .metrics {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      padding: 14px;
    }
    .metric {
      padding: 12px;
      border-radius: 12px;
      background: rgba(15, 23, 42, 0.82);
      border: 1px solid rgba(148, 163, 184, 0.18);
    }
    .metric strong {
      display: block;
      color: #fff;
      font-size: 22px;
      line-height: 1;
    }
    .metric span {
      display: block;
      margin-top: 7px;
      color: #9fb3c8;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
    }
    .bottom {
      position: absolute;
      display: none !important;
      left: 64px;
      right: 54px;
      bottom: 18px;
      z-index: 4;
      grid-template-columns: 1fr auto;
      align-items: center;
      gap: 24px;
      padding: 12px 18px;
      border-radius: 16px;
      border: 1px solid rgba(250, 204, 21, 0.28);
      background: rgba(5, 11, 20, 0.76);
    }
    .bottom-text {
      color: #b6c8dc;
      font-size: 15px;
      font-weight: 750;
    }
    .status {
      display: flex;
      align-items: center;
      gap: 10px;
      color: #bbf7d0;
      font-size: 15px;
      font-weight: 900;
    }
    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #34d399;
      box-shadow: 0 0 16px rgba(52, 211, 153, 0.8);
    }
  </style>
</head>
<body>
  <section class="banner">
    <div class="left">
      <div class="brand-row">
        <img class="logo" src="${logo}" alt="">
        <div class="eyebrow">Karnataka State Police<br>Datathon 2026</div>
      </div>
      <h1>NAMMA <span>KSP</span></h1>
      <div class="subtitle">Crime Intelligence Platform</div>
      <div class="rule"></div>
      <div class="chips">
        <div class="chip">Conversational AI</div>
        <div class="chip">FIR Intelligence</div>
        <div class="chip">Network Analysis</div>
        <div class="chip">Forecasting</div>
        <div class="chip">PWA</div>
        <div class="chip">Live on AppSail</div>
      </div>
    </div>
    <img class="map" src="${map}" alt="">
    <div class="network">
      <div class="line" style="left:86px;top:83px;width:135px;transform:rotate(18deg)"></div>
      <div class="line" style="left:218px;top:122px;width:118px;transform:rotate(-32deg)"></div>
      <div class="line" style="left:119px;top:196px;width:136px;transform:rotate(-34deg)"></div>
      <div class="line" style="left:178px;top:54px;width:104px;transform:rotate(62deg)"></div>
      <div class="line" style="left:240px;top:151px;width:96px;transform:rotate(30deg)"></div>
      <div class="node gold" style="left:200px;top:102px">FIR</div>
      <div class="node" style="left:66px;top:64px">A</div>
      <div class="node" style="left:312px;top:62px">V</div>
      <div class="node" style="left:91px;top:178px">L</div>
      <div class="node" style="left:294px;top:194px">MO</div>
    </div>
    <div class="right">
      <div class="panel head">
        <div class="panel-title">Natural language investigation</div>
        <div class="ask">Show linked FIRs, suspects, victims, locations and evidence trails.</div>
      </div>
      <div class="panel">
        <img class="screen" src="${screen}" alt="">
        <div class="metrics">
          <div class="metric"><strong>5K</strong><span>FIRs</span></div>
          <div class="metric"><strong>2K</strong><span>Offenders</span></div>
          <div class="metric"><strong>5</strong><span>Roles</span></div>
        </div>
      </div>
    </div>
    <div class="bottom">
      <div class="bottom-text">Evidence-linked dashboards for investigators, analysts, supervisors, policymakers and administrators.</div>
      <div class="status"><span class="dot"></span>Live on AppSail</div>
    </div>
  </section>
</body>
</html>`;

await mkdir(outDir, { recursive: true });
await writeFile(htmlPath, html, 'utf8');

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 420 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'networkidle' });
await page.screenshot({ path: outPath, type: 'png', fullPage: false });
await browser.close();

console.log(outPath);
