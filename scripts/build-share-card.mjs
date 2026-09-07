/*
 * Builds public/og/default.jpg, the image every share of this site falls back
 * to when the page has none of its own.
 *
 * Run after changing the logo or the wording:  node scripts/build-share-card.mjs
 *
 * Rendered in a real browser because the card is a typographic layout in the
 * site's own faces, and laying that out by hand in a raster library would mean
 * reimplementing text wrapping. It needs Chrome installed, so it is a manual
 * step whose output is committed rather than something CI does.
 */
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { chromium } from 'playwright-core';
import sharp from 'sharp';

const root = process.cwd();
const out = path.join(root, 'public', 'og');

const WIDTH = 1200;
const HEIGHT = 630;

const logo = await readFile(path.join(root, 'src', 'brand', 'am-logo.png'));
const logoUri = `data:image/png;base64,${logo.toString('base64')}`;

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Mona+Sans:wght@400;500;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  html, body { margin: 0; padding: 0; }
  body {
    width: ${WIDTH}px; height: ${HEIGHT}px; overflow: hidden; position: relative;
    font-family: 'Mona Sans', system-ui, sans-serif;
    color: #24292e; background: #f6f7ee;
    -webkit-font-smoothing: antialiased;
  }
  /* The same four-blob wash the site paints behind its masthead. */
  .wash {
    position: absolute; inset: 0;
    background:
      radial-gradient(62% 78% at 88% 12%, rgba(87, 95, 190, 0.28), transparent 72%),
      radial-gradient(55% 62% at 6% 96%, rgba(206, 109, 83, 0.22), transparent 70%),
      radial-gradient(44% 54% at 66% 100%, rgba(96, 160, 179, 0.20), transparent 70%),
      radial-gradient(40% 40% at 40% 0%, rgba(253, 201, 135, 0.20), transparent 70%);
  }
  .card {
    position: absolute; left: 64px; top: 64px; right: 64px; bottom: 64px;
    box-sizing: border-box; padding: 56px 68px 52px;
    background: rgba(254, 254, 253, 0.82);
    border: 1px solid rgba(255, 255, 255, 0.85);
    border-radius: 28px;
    box-shadow: 0 1px 2px rgba(48, 48, 38, 0.06), 0 16px 48px rgba(48, 48, 38, 0.10);
    display: flex; flex-direction: column; justify-content: space-between;
  }
  /* align-self, or the flex column stretches the image to the card's width
     and squashes the mark flat. */
  .mark { height: 74px; width: auto; display: block; align-self: flex-start; }
  h1 { margin: 0; font-size: 92px; line-height: 1.0; letter-spacing: -0.035em; font-weight: 700; }
  .tag { margin: 20px 0 0; font-size: 40px; line-height: 1.2; font-weight: 400; color: #3d444d; letter-spacing: -0.012em; }
  .foot { display: flex; justify-content: space-between; align-items: center; }
  .pills span {
    display: inline-block; padding: 9px 14px; margin-right: 10px;
    font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 19px; color: #57606a;
    background: #f1f3e6; border: 1px solid #e4e6d6; border-radius: 8px;
  }
  .site { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 22px; color: #575fbe; }
</style>
</head>
<body>
  <div class="wash"></div>
  <div class="card">
    <img class="mark" src="${logoUri}" alt="">
    <div>
      <h1>Ali Maghami</h1>
      <p class="tag">Building AI for the physical world.</p>
    </div>
    <div class="foot">
      <div class="pills"><span>Computer Vision</span><span>Robotics</span><span>Physical AI</span></div>
      <div class="site">maghami.dev</div>
    </div>
  </div>
</body>
</html>`;

const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL || 'chrome' });
const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 2 });
await page.setContent(html, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
const shot = await page.screenshot({ type: 'png' });
await browser.close();

await mkdir(out, { recursive: true });
const info = await sharp(shot)
  .resize(WIDTH, HEIGHT)
  .jpeg({ quality: 86, mozjpeg: true })
  .toFile(path.join(out, 'default.jpg'));

console.log(`og/default.jpg ${info.width}x${info.height} ${Math.round(info.size / 1024)}KB`);
