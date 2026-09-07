/*
 * Builds every icon the site serves from the two brand files in src/brand/.
 *
 * Run after changing the logo:  node scripts/build-icons.mjs
 *
 * The gradient artwork is the master for anything rendered as pixels. The flat
 * vector is Ali's own single-colour drawing of the same mark; it is used where
 * a vector is needed (the SVG favicon) and as the silhouette for the mono mark
 * in the footer, because there is no vector of the gradient version. Its
 * outline matches the artwork to within a few percent, which is invisible at
 * the sizes it appears.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import sharp from 'sharp';

const root = process.cwd();
const brand = path.join(root, 'src', 'brand');
const out = path.join(root, 'public');

/** The paper tone from global.css. Icons that cannot be transparent sit on it. */
const PAPER = '#fefefd';

/** The mark, trimmed of its transparent margin, as a buffer plus its size. */
async function artwork() {
  const trimmed = await sharp(path.join(brand, 'am-logo.png')).trim().png().toBuffer();
  const { width, height } = await sharp(trimmed).metadata();
  return { trimmed, width, height };
}

/**
 * The mark centred on a square canvas.
 *
 * `coverage` is how much of the side the mark's longest edge takes, which is
 * what leaves the margin an icon needs: generous for a maskable icon, whose
 * corners a launcher may crop, tight for a favicon that is tiny already.
 */
async function square({ trimmed, width, height }, side, coverage, background) {
  const scale = (side * coverage) / Math.max(width, height);
  const resized = await sharp(trimmed)
    .resize({ width: Math.round(width * scale), height: Math.round(height * scale), fit: 'inside' })
    .toBuffer();
  const meta = await sharp(resized).metadata();

  return sharp({
    create: {
      width: side,
      height: side,
      channels: 4,
      background: background ?? { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: resized,
        left: Math.round((side - meta.width) / 2),
        top: Math.round((side - meta.height) / 2),
      },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/**
 * An .ico holding several PNGs.
 *
 * sharp cannot write the format, and it is a short one: a six-byte header, a
 * sixteen-byte directory entry per size, then the images. PNG inside ICO is
 * understood by every browser in use.
 */
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  let offset = 6 + images.length * 16;
  const entries = images.map(({ size, data }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    return entry;
  });

  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

/** The flat logo's paths, re-fitted to a square viewBox with a margin. */
async function squareVector(margin) {
  const source = await readFile(path.join(brand, 'am-flat-logo.svg'), 'utf8');
  const box = source.match(/viewBox="([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+)"/);
  if (!box) throw new Error('am-flat-logo.svg has no viewBox to square up');

  const [x, y, w, h] = box.slice(1).map(Number);
  const side = Math.max(w, h) * (1 + margin * 2);
  const viewBox = [x + w / 2 - side / 2, y + h / 2 - side / 2, side, side]
    .map((n) => Number(n.toFixed(1)))
    .join(' ');

  const paths = [...source.matchAll(/<path[^>]*\/>/g)].map((m) => m[0]);
  if (paths.length === 0) throw new Error('am-flat-logo.svg has no paths');
  return { viewBox, paths, box: { x, y, w, h } };
}

await mkdir(out, { recursive: true });
const mark = await artwork();
console.log(`artwork ${mark.width}x${mark.height}`);

/* Favicons. Tight margin: at 16 pixels every one counts. */
const icoSizes = [16, 32, 48];
const icoImages = [];
for (const size of icoSizes) {
  icoImages.push({ size, data: await square(mark, size, 0.94, null) });
}
await writeFile(path.join(out, 'favicon.ico'), ico(icoImages));
console.log('favicon.ico', icoSizes.join(', '));

/*
 * The SVG favicon, from the flat vector. Browsers that take it get a mark that
 * stays crisp at any size; the .ico above is the fallback.
 */
const flat = await squareVector(0.06);
await writeFile(
  path.join(out, 'favicon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${flat.viewBox}">\n  <title>AM</title>\n  ${flat.paths.join('\n  ')}\n</svg>\n`,
);
console.log('favicon.svg', flat.viewBox);

/*
 * The home screen icons. iOS composites a transparent touch icon onto black,
 * so that one gets the paper tone behind it. A maskable icon may be cropped to
 * a circle by the launcher, so the mark sits inside the safe zone with room to
 * spare.
 */
const paper = { r: 254, g: 254, b: 253, alpha: 1 };
await writeFile(path.join(out, 'apple-touch-icon.png'), await square(mark, 180, 0.78, paper));
await writeFile(path.join(out, 'icon-192.png'), await square(mark, 192, 0.9, null));
await writeFile(path.join(out, 'icon-512.png'), await square(mark, 512, 0.9, null));
await writeFile(path.join(out, 'icon-maskable-512.png'), await square(mark, 512, 0.62, paper));
console.log('apple-touch-icon.png, icon-192.png, icon-512.png, icon-maskable-512.png');

/* The manifest, so a saved site has a name and an icon rather than a screenshot. */
await writeFile(
  path.join(out, 'site.webmanifest'),
  `${JSON.stringify(
    {
      name: 'Ali Maghami',
      short_name: 'Maghami',
      description: 'Computer vision, AI and robotics: projects, posts, publications.',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      background_color: PAPER,
      theme_color: PAPER,
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    null,
    2,
  )}\n`,
);
console.log('site.webmanifest');
