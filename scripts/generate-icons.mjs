import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function crc32(buf) {
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

const table = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
  }
  table[i] = c;
}

function createChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crcVal = crc32(body);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);
  return Buffer.concat([len, body, crcBuf]);
}

function generatePng(width, height, isMaskable = false) {
  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bits per channel
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdrChunk = createChunk('IHDR', ihdrData);

  // Raw image data with 0 filter byte per line
  const rawBytes = Buffer.alloc(height * (1 + width * 4));
  const cx = width / 2;
  const cy = height / 2;
  const r = width / 2;

  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawBytes[offset++] = 0; // Filter None
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let red = 225; // #e11d48
      let green = 29;
      let blue = 72;
      let alpha = 255;

      // Subtle gradient from top-left to bottom-right
      const gradFactor = (x + y) / (width + height);
      red = Math.floor(225 - 35 * gradFactor);
      green = Math.floor(29 - 10 * gradFactor);
      blue = Math.floor(72 - 12 * gradFactor);

      if (!isMaskable) {
        // Rounded corner container
        const cornerRadius = width * 0.22;
        const inCornerX = x < cornerRadius ? cornerRadius - x : (x > width - cornerRadius ? x - (width - cornerRadius) : 0);
        const inCornerY = y < cornerRadius ? cornerRadius - y : (y > height - cornerRadius ? y - (height - cornerRadius) : 0);
        if (inCornerX > 0 && inCornerY > 0) {
          const cornerDist = Math.sqrt(inCornerX * inCornerX + inCornerY * inCornerY);
          if (cornerDist > cornerRadius) {
            alpha = 0;
          } else if (cornerDist > cornerRadius - 1) {
            alpha = Math.floor(255 * (cornerRadius - cornerDist));
          }
        }
      }

      // Drawing simple emblem in safe zone (80% circle)
      const nx = (x - cx) / (width * 0.35);
      const ny = (y - cy) / (height * 0.35);

      // White cash register / store badge
      if (alpha > 0 && Math.abs(nx) < 0.7 && Math.abs(ny) < 0.6) {
        // Draw white emblem
        const inRoof = ny < -0.15 && ny > -0.6 && Math.abs(nx) < (0.6 - (ny + 0.6) * 0.7);
        const inBase = ny > 0.3 && ny < 0.55 && Math.abs(nx) < 0.65;
        const inCounter = ny > -0.15 && ny < 0.3 && Math.abs(nx) < 0.5;

        if (inRoof || inBase || inCounter) {
          // Barcode stripe cutouts inside counter
          const inBarcode = inCounter && ny > -0.05 && ny < 0.2;
          const barcodeStripe = Math.floor((nx + 0.5) * 16) % 2 === 0;

          if (inBarcode && barcodeStripe) {
            red = 190;
            green = 18;
            blue = 60;
          } else {
            red = 255;
            green = 255;
            blue = 255;
          }
        }
      }

      rawBytes[offset++] = red;
      rawBytes[offset++] = green;
      rawBytes[offset++] = blue;
      rawBytes[offset++] = alpha;
    }
  }

  const compressed = zlib.deflateSync(rawBytes, { level: 9 });
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.resolve(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), generatePng(192, 192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), generatePng(512, 512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), generatePng(512, 512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), generatePng(180, 180, false));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), generatePng(64, 64, false));

console.log('PWA PNG icons generated successfully!');
