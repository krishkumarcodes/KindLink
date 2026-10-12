import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createCrcTable() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
}

const crcTable = createCrcTable();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(typeStr, dataBuf) {
  const typeBuf = Buffer.from(typeStr, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(dataBuf.length, 0);

  const crcInput = Buffer.concat([typeBuf, dataBuf]);
  const crcVal = crc32(crcInput);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);

  return Buffer.concat([lenBuf, typeBuf, dataBuf, crcBuf]);
}

export function generateOgPng(outputPath) {
  const width = 1200;
  const height = 630;

  // IHDR: width(4), height(4), depth(1)=8, colortype(1)=2 (RGB), comp(1)=0, filter(1)=0, interlace(1)=0
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 2; // RGB
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  // Scanlines: each row has 1 filter byte + width * 3 bytes (RGB)
  const rowSize = 1 + width * 3;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter byte: 0 = None

    const progressY = y / height;

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 3;
      const progressX = x / width;

      // Dark gradient background with teal glow
      // Base: #0B1120 (11, 17, 32) -> #042F2E (4, 47, 46)
      const distFromCenter = Math.hypot((progressX - 0.5) * 1.5, (progressY - 0.5));
      const glow = Math.max(0, 1 - distFromCenter * 1.2);

      let r = Math.round(11 + (13 - 11) * progressY + 20 * glow);
      let g = Math.round(17 + (75 - 17) * (1 - progressY) + 120 * glow * 0.4);
      let b = Math.round(32 + (40 - 32) * progressX + 110 * glow * 0.3);

      // Add a distinctive top border accent line (Teal #0D9488)
      if (y < 6) {
        r = 13;
        g = 148;
        b = 136;
      }

      rawData[pxOffset] = Math.min(255, Math.max(0, r));
      rawData[pxOffset + 1] = Math.min(255, Math.max(0, g));
      rawData[pxOffset + 2] = Math.min(255, Math.max(0, b));
    }
  }

  const compressedData = zlib.deflateSync(rawData, { level: 9 });

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrChunk = makeChunk('IHDR', ihdrData);
  const idatChunk = makeChunk('IDAT', compressedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  const pngBuffer = Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, pngBuffer);
  console.log(`Generated branded OG image at ${outputPath} (${pngBuffer.length} bytes)`);
}

const target = path.resolve('public/og-image.png');
generateOgPng(target);
