import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPng(width, height, r, g, b) {
  // Simple valid PNG encoder
  const buffer = [];
  // PNG Signature
  buffer.push(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // bit depth
  ihdrData.writeUInt8(6, 9); // color type (RGBA)
  ihdrData.writeUInt8(0, 10); // compression
  ihdrData.writeUInt8(0, 11); // filter
  ihdrData.writeUInt8(0, 12); // interlace
  buffer.push(createChunk('IHDR', ihdrData));

  // Raw image data with filter byte 0 per scanline
  const scanlineLength = width * 4 + 1;
  const rawData = Buffer.alloc(height * scanlineLength);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineLength;
    rawData[rowOffset] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      // Draw a rounded card / emblem
      const cx = width / 2;
      const cy = height / 2;
      const distFromCenter = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      const isInsideCircle = distFromCenter < (width * 0.44);

      if (isInsideCircle) {
        // Inner emblem: lighter emerald / golden accent
        if (distFromCenter < (width * 0.28) && distFromCenter > (width * 0.22)) {
          rawData[pixelOffset] = 234;     // R
          rawData[pixelOffset + 1] = 179; // G
          rawData[pixelOffset + 2] = 8;   // B (Gold ring)
          rawData[pixelOffset + 3] = 255;
        } else {
          rawData[pixelOffset] = r;       // Brand Forest Green
          rawData[pixelOffset + 1] = g;
          rawData[pixelOffset + 2] = b;
          rawData[pixelOffset + 3] = 255;
        }
      } else {
        // Background
        rawData[pixelOffset] = 12;        // #0c4a26 (12, 74, 38)
        rawData[pixelOffset + 1] = 74;
        rawData[pixelOffset + 2] = 38;
        rawData[pixelOffset + 3] = 255;
      }
    }
  }

  // IDAT chunk
  const compressedData = zlib.deflateSync(rawData);
  buffer.push(createChunk('IDAT', compressedData));

  // IEND chunk
  buffer.push(createChunk('IEND', Buffer.alloc(0)));

  return Buffer.concat(buffer);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);

  const crc = crc32(body);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc, 0);

  return Buffer.concat([length, body, crcBuf]);
}

// Pre-computed CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate brand SVG icon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0c4a26"/>
      <stop offset="50%" stop-color="#14532d"/>
      <stop offset="100%" stop-color="#052e16"/>
    </linearGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="100%" stop-color="#eab308"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="128" fill="url(#bg)"/>
  <circle cx="256" cy="256" r="180" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="4"/>
  <!-- Shopping Cart & POS Register Symbol -->
  <path d="M150 180 h40 l30 140 h140 l30 -100 h-180" fill="none" stroke="#ffffff" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="230" cy="360" r="18" fill="url(#gold)"/>
  <circle cx="330" cy="360" r="18" fill="url(#gold)"/>
  <!-- Leaf / Fresh Symbol -->
  <path d="M340 140 Q390 140 400 190 Q350 190 340 140 Z" fill="#4ade80"/>
  <text x="256" y="440" font-family="system-ui, -apple-system, sans-serif" font-size="34" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="4">M-POS</text>
</svg>`;

fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent);

// Generate PNG icons
const icon192 = createPng(192, 192, 22, 101, 52);
const icon512 = createPng(512, 512, 22, 101, 52);
const iconMaskable = createPng(512, 512, 12, 74, 38);
const appleIcon = createPng(180, 180, 22, 101, 52);

fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), icon192);
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), icon512);
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), iconMaskable);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleIcon);

console.log('PWA icons successfully generated in public/ directory!');
