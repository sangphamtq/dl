import sharp from "sharp";

const BRAND = "#2e871c";
const HAT = "#fdf1cf";
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${BRAND}"/>
  <path fill="${HAT}" d="M256 84 Q288 148 466 358 Q256 430 46 358 Q224 148 256 84 Z"/>
</svg>`;

const out = "src/app/icon.png";
await sharp(Buffer.from(svg)).resize(256, 256).png().toFile(out);
console.log(`✓ ${out} — 256×256`);
