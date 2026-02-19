/**
 * Generate 16, 48, 128 PNG icons and 1280×640 PNG from icons/icon.svg (context: export to Markdown).
 */
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const iconsDir = path.resolve(__dirname, '../icons');
const svgPath = path.join(iconsDir, 'icon.svg');
const sizes = [16, 48, 128];
const rectSizes = [{ width: 1280, height: 640 }];

const svgBuffer = fs.readFileSync(svgPath);

async function generate() {
  for (const size of sizes) {
    const outPath = path.join(iconsDir, `${size}.png`);
    await sharp(svgBuffer, { density: 72 * (size / 128) })
      .resize(size, size)
      .png()
      .toFile(outPath);
    console.log(`Wrote ${outPath}`);
  }
  for (const { width, height } of rectSizes) {
    const outPath = path.join(iconsDir, `${width}x${height}.png`);
    await sharp(svgBuffer, { density: 72 * (width / 128) })
      .resize(width, height)
      .png()
      .toFile(outPath);
    console.log(`Wrote ${outPath}`);
  }
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});
