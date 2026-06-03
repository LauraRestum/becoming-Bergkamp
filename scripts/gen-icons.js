/*
 * Regenerate every favicon / app icon from the master emblem.
 * Source: 608D69B1-9A24-4DF4-A062-561CB71341B1.png (1024x1024, transparent)
 *
 * Run:  node scripts/gen-icons.js
 * Requires sharp (installed locally for this one-off generation).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, '608D69B1-9A24-4DF4-A062-561CB71341B1.png');
const DARK = { r: 10, g: 10, b: 10, alpha: 1 }; // matches theme_color #0a0a0a

// Build a centered, square master of the trimmed emblem (transparent bg).
async function squareMaster() {
  const trimmed = await sharp(SRC).trim({ threshold: 10 }).toBuffer({ resolveWithObject: true });
  const side = Math.max(trimmed.info.width, trimmed.info.height);
  return sharp({
    create: { width: side, height: side, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  })
    .composite([{ input: trimmed.data, gravity: 'center' }])
    .png()
    .toBuffer();
}

// A square icon with the emblem centered on a solid dark background.
// `inset` is the fraction (0-1) of the canvas the emblem fills (safe zone for maskable).
async function darkSquare(master, size, inset, round) {
  const art = Math.round(size * inset);
  const emblem = await sharp(master).resize(art, art, { fit: 'inside' }).png().toBuffer();
  let img = sharp({
    create: { width: size, height: size, channels: 4, background: DARK }
  }).composite([{ input: emblem, gravity: 'center' }]);

  if (round) {
    // Apply rounded corners (used for the browser-tab favicons, like the old svg).
    const r = Math.round(size * 0.18);
    const mask = Buffer.from(
      `<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${r}" ry="${r}"/></svg>`
    );
    img = sharp(await img.png().toBuffer()).composite([{ input: mask, blend: 'dest-in' }]);
  }
  return img.png().toBuffer();
}

// Transparent square emblem (for the in-page home badge that sits on any bg).
async function transparentSquare(master, size) {
  return sharp(master).resize(size, size, { fit: 'inside' }).png().toBuffer();
}

// Minimal ICO writer that embeds PNG frames (supported by all modern browsers).
function buildIco(frames) {
  const count = frames.length;
  const header = Buffer.alloc(6 + count * 16);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(count, 4);
  let offset = header.length;
  const body = [];
  frames.forEach((f, i) => {
    const e = 6 + i * 16;
    header.writeUInt8(f.size >= 256 ? 0 : f.size, e + 0);
    header.writeUInt8(f.size >= 256 ? 0 : f.size, e + 1);
    header.writeUInt8(0, e + 2); // palette
    header.writeUInt8(0, e + 3); // reserved
    header.writeUInt16LE(1, e + 4); // planes
    header.writeUInt16LE(32, e + 6); // bpp
    header.writeUInt32LE(f.data.length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += f.data.length;
    body.push(f.data);
  });
  return Buffer.concat([header, ...body]);
}

async function write(rel, buf) {
  const p = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, buf);
  console.log('wrote', rel, '(' + buf.length + ' bytes)');
}

(async () => {
  const master = await squareMaster();

  // --- App / PWA / share icons: emblem on dark, full-bleed (maskable-safe). ---
  await write('icons/icon-512.png', await darkSquare(master, 512, 0.82, false));
  await write('icons/icon-192.png', await darkSquare(master, 192, 0.82, false));
  await write('icons/icon-180.png', await darkSquare(master, 180, 0.86, false));
  await write('apple-touch-icon.png', await darkSquare(master, 180, 0.86, false));
  await write('android-chrome-512x512.png', await darkSquare(master, 512, 0.82, false));
  await write('android-chrome-192x192.png', await darkSquare(master, 192, 0.82, false));

  // --- Browser-tab favicons: emblem on a rounded dark tile (like the old svg). ---
  const fav48 = await darkSquare(master, 48, 0.9, true);
  const fav32 = await darkSquare(master, 32, 0.9, true);
  const fav16 = await darkSquare(master, 16, 0.94, true);
  await write('favicon-32x32.png', fav32);
  await write('favicon-16x16.png', fav16);
  await write('favicon.ico', buildIco([
    { size: 16, data: fav16 },
    { size: 32, data: fav32 },
    { size: 48, data: fav48 }
  ]));

  // --- Scalable SVG favicon: embed a crisp 96px dark tile as base64. ---
  const svgPng = await darkSquare(master, 96, 0.9, true);
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">\n' +
    '  <image width="96" height="96" href="data:image/png;base64,' +
    svgPng.toString('base64') + '"/>\n' +
    '</svg>\n';
  await write('favicon.svg', Buffer.from(svg));

  // --- In-page home badge: transparent emblem that reads on dark or light nav. ---
  await write('icons/home-emblem.png', await transparentSquare(master, 256));

  console.log('\nDone.');
})();
