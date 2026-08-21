import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const iconsDir = path.resolve('public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

const createSvg = (size, isMaskable = false) => {
  const radius = isMaskable ? 0 : Math.round(size * 0.22);
  const cx = size / 2;
  const cy = size / 2;
  const strokeW = Math.max(2, Math.round(size * 0.025));

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0B1120"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
    <linearGradient id="emerald" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#34D399"/>
      <stop offset="50%" stop-color="#10B981"/>
      <stop offset="100%" stop-color="#059669"/>
    </linearGradient>
  </defs>
  
  <rect width="${size}" height="${size}" rx="${radius}" fill="url(#bg)"/>
  
  <circle cx="${cx}" cy="${cy}" r="${size * 0.38}" stroke="url(#emerald)" stroke-width="${strokeW}" fill="#0F172A" opacity="0.9"/>
  
  <g transform="translate(${size * 0.25}, ${size * 0.25}) scale(${size * 0.021})">
    <path d="M2 20 C 2 20, 6 6, 14 2 C 14 2, 11 10, 19 14 C 21 15.5, 22 18, 22 20 Z" fill="url(#emerald)"/>
    <path d="M12 1 L12 23 M7 6 C7 6, 10 4, 13 4 C 16 4, 17 6, 17 8 C 17 10.5, 14 11, 12 12 C 9.5 13, 7 14, 7 17 C 7 20, 9.5 21, 13 21 C 16 21, 18 19.5, 18 19.5" 
          stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" fill="none"/>
  </g>
</svg>`;
};

async function generate() {
  const svg192 = createSvg(192);
  const svg512 = createSvg(512);
  const svgMaskable192 = createSvg(192, true);
  const svgMaskable512 = createSvg(512, true);
  const svgApple = createSvg(180);
  const svgFavicon = createSvg(32);

  fs.writeFileSync(path.resolve('public', 'favicon.svg'), createSvg(128));

  await sharp(Buffer.from(svg192)).png().toFile(path.resolve('public', 'icons', 'icon-192x192.png'));
  await sharp(Buffer.from(svg512)).png().toFile(path.resolve('public', 'icons', 'icon-512x512.png'));
  await sharp(Buffer.from(svgMaskable192)).png().toFile(path.resolve('public', 'icons', 'icon-maskable-192x192.png'));
  await sharp(Buffer.from(svgMaskable512)).png().toFile(path.resolve('public', 'icons', 'icon-maskable-512x512.png'));
  await sharp(Buffer.from(svgApple)).png().toFile(path.resolve('public', 'icons', 'apple-touch-icon.png'));
  await sharp(Buffer.from(svgFavicon)).png().toFile(path.resolve('public', 'icons', 'favicon.png'));
  await sharp(Buffer.from(svgFavicon)).png().toFile(path.resolve('public', 'favicon.ico'));

  console.log('All PWA icons generated successfully!');
}

generate().catch(console.error);
