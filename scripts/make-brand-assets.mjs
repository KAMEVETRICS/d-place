import { mkdirSync, writeFileSync, copyFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const brandDir = path.join(root, "brand");
const appDir = path.join(root, "src", "app");
mkdirSync(brandDir, { recursive: true });
mkdirSync(appDir, { recursive: true });

const PAPER = "#F3E6C8";
const STAMP = "#7A1F2B";
const INK = "#1A1714";
const GOLD = "#C8920A";
const CREAM = "#FFF8EA";

function iconSvg(size) {
  const pad = Math.round(size * 0.14);
  const stroke = Math.max(2, Math.round(size * 0.045));
  const radius = Math.max(2, Math.round(size * 0.04));
  const font = Math.round(size * 0.58);
  const y = Math.round(size * 0.68);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none">
  <rect width="${size}" height="${size}" fill="${PAPER}"/>
  <rect x="${pad}" y="${pad}" width="${size - pad * 2}" height="${size - pad * 2}" rx="${radius}" ry="${radius}" stroke="${STAMP}" stroke-width="${stroke}" fill="${CREAM}"/>
  <text x="50%" y="${y}" text-anchor="middle" font-family="Times New Roman, Times, serif" font-size="${font}" font-weight="700" fill="${STAMP}">D</text>
</svg>`;
}

function thumbnailSvg(w, h) {
  const stampW = Math.round(h * 0.42);
  const stampX = Math.round(w * 0.08);
  const stampY = Math.round((h - stampW) / 2);
  const pad = Math.round(stampW * 0.14);
  const stroke = Math.max(3, Math.round(stampW * 0.045));
  const radius = Math.max(2, Math.round(stampW * 0.04));
  const font = Math.round(stampW * 0.58);
  const textY = stampY + Math.round(stampW * 0.68);
  const titleX = stampX + stampW + Math.round(w * 0.05);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none">
  <rect width="${w}" height="${h}" fill="${PAPER}"/>
  <rect x="0" y="0" width="${w}" height="${h}" fill="url(#grain)" opacity="0.04"/>
  <defs>
    <pattern id="grain" width="4" height="4" patternUnits="userSpaceOnUse">
      <circle cx="1" cy="1" r="0.6" fill="${INK}"/>
    </pattern>
  </defs>
  <rect x="${stampX}" y="${stampY}" width="${stampW}" height="${stampW}" rx="${radius}" ry="${radius}" stroke="${STAMP}" stroke-width="${stroke}" fill="${CREAM}"/>
  <text x="${stampX + stampW / 2}" y="${textY}" text-anchor="middle" font-family="Times New Roman, Times, serif" font-size="${font}" font-weight="700" fill="${STAMP}">D</text>
  <text x="${titleX}" y="${Math.round(h * 0.46)}" font-family="Times New Roman, Times, serif" font-size="${Math.round(h * 0.16)}" font-weight="700" fill="${INK}">D place</text>
  <text x="${titleX}" y="${Math.round(h * 0.58)}" font-family="Segoe UI, Arial, sans-serif" font-size="${Math.round(h * 0.055)}" font-weight="600" fill="${INK}" opacity="0.72">Knowledge stall. Paid in NIM.</text>
  <rect x="${titleX}" y="${Math.round(h * 0.66)}" width="${Math.round(h * 0.08)}" height="${Math.round(h * 0.012)}" fill="${GOLD}"/>
</svg>`;
}

const iconSource = iconSvg(1024);
writeFileSync(path.join(brandDir, "icon.svg"), iconSource);

const thumbSource = thumbnailSvg(1200, 630);
writeFileSync(path.join(brandDir, "thumbnail.svg"), thumbSource);

async function raster(svg, out, size) {
  const img = sharp(Buffer.from(svg));
  if (size) img.resize(size, size);
  await img.png().toFile(out);
}

await raster(iconSource, path.join(brandDir, "icon.png"), 1024);
await raster(iconSource, path.join(appDir, "icon.png"), 512);
await raster(iconSource, path.join(appDir, "apple-icon.png"), 180);
await sharp(Buffer.from(thumbSource)).png().toFile(path.join(brandDir, "thumbnail.png"));

copyFileSync(path.join(appDir, "icon.png"), path.join(brandDir, "icon-512.png"));

console.log("Wrote:");
console.log("  brand/icon.svg");
console.log("  brand/icon.png");
console.log("  brand/icon-512.png");
console.log("  brand/thumbnail.svg");
console.log("  brand/thumbnail.png  (local only)");
console.log("  src/app/icon.png");
console.log("  src/app/apple-icon.png");
