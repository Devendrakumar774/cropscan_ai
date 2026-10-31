const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 table
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[i] = c;
}

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function createChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const crcData = Buffer.concat([typeBuf, data]);
  const crcVal = crc32(crcData);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);

  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function generatePng(size) {
  const width = size;
  const height = size;

  // Colors:
  // Background: Deep green #2F5D3A -> rgb(47, 93, 58)
  // Leaf: Cream #F6F1E7 -> rgb(246, 241, 231)
  // Accent: Mustard #E0A526 -> rgb(224, 165, 38)
  const bgR = 47, bgG = 93, bgB = 58;
  const leafR = 246, leafG = 241, leafB = 231;
  const accR = 224, accG = 165, accB = 38;

  const rawRows = [];
  const cx = width / 2;
  const cy = height / 2;
  const r = width * 0.44;

  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 4);
    row[0] = 0; // Filter: None

    for (let x = 0; x < width; x++) {
      const idx = 1 + x * 4;
      const dx = (x - cx) / (width * 0.4);
      const dy = (y - cy) / (height * 0.4);
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Rounded rectangle or circle background
      // Soft corner check
      const cornerR = width * 0.22;
      const qx = Math.max(0, Math.abs(x - cx) - (width * 0.5 - cornerR));
      const qy = Math.max(0, Math.abs(y - cy) - (height * 0.5 - cornerR));
      const inBox = Math.sqrt(qx * qx + qy * qy) <= cornerR;

      if (!inBox) {
        row[idx] = 0;
        row[idx + 1] = 0;
        row[idx + 2] = 0;
        row[idx + 3] = 0; // transparent
        continue;
      }

      // Default background color
      let pr = bgR, pg = bgG, pb = bgB, pa = 255;

      // Leaf shape simulation in center:
      // A stylish sprout: two curved ellipses
      const lx = (x - cx) / (width * 0.26);
      const ly = (y - cy) / (height * 0.26);

      // Main central leaf
      const inLeaf1 = (Math.pow(lx - 0.15, 2) + Math.pow(ly + 0.1, 2) < 0.45) &&
                      (Math.pow(lx + 0.35, 2) + Math.pow(ly - 0.2, 2) < 0.85);

      // Side small leaf
      const inLeaf2 = (Math.pow(lx + 0.3, 2) + Math.pow(ly + 0.2, 2) < 0.25) &&
                      (Math.pow(lx - 0.1, 2) + Math.pow(ly - 0.1, 2) < 0.45);

      // Stem / vein
      const inStem = Math.abs(lx * 0.8 + ly * 0.6) < 0.05 && ly > -0.5 && ly < 0.6;

      if (inLeaf1 || inLeaf2) {
        pr = leafR;
        pg = leafG;
        pb = leafB;
      } else if (inStem) {
        pr = accR;
        pg = accG;
        pb = accB;
      }

      row[idx] = pr;
      row[idx + 1] = pg;
      row[idx + 2] = pb;
      row[idx + 3] = pa;
    }
    rawRows.push(row);
  }

  const rawData = Buffer.concat(rawRows);
  const compressed = zlib.deflateSync(rawData);

  // PNG header
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth
  ihdr[9] = 6; // Color type: RGBA
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  const ihdrChunk = createChunk('IHDR', ihdr);
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate 192x192 and 512x512 icons
fs.writeFileSync(path.join(publicDir, 'icon-192.png'), generatePng(192));
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), generatePng(512));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), generatePng(180));

// Also generate a crisp SVG icon
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="112" fill="#2F5D3A"/>
  <path d="M256 120 C 330 140, 390 220, 380 320 C 310 390, 200 370, 160 300 C 130 220, 190 140, 256 120 Z" fill="#F6F1E7"/>
  <path d="M256 120 Q 240 260 170 340" stroke="#E0A526" stroke-width="16" fill="none" stroke-linecap="round"/>
  <path d="M220 220 Q 280 230 310 200" stroke="#E0A526" stroke-width="12" fill="none" stroke-linecap="round"/>
  <path d="M200 270 Q 270 280 330 270" stroke="#E0A526" stroke-width="12" fill="none" stroke-linecap="round"/>
</svg>`;

fs.writeFileSync(path.join(publicDir, 'icon.svg'), svg.trim());
console.log('Successfully generated PWA icons in public/');

