// Compact QR Code Generator in pure TypeScript / JavaScript
// Generates standard ISO/IEC 18004 QR Codes (Byte mode, ECC levels L, M, Q, H)

export type QrEccLevel = 'L' | 'M' | 'Q' | 'H';

// Galois Field GF(256) math with primitive poly 0x11D
const EXP_TABLE = new Uint8Array(512);
const LOG_TABLE = new Uint8Array(256);

(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP_TABLE[i] = x;
    EXP_TABLE[i + 255] = x;
    LOG_TABLE[x] = i;
    x <<= 1;
    if (x & 256) {
      x ^= 0x11d;
    }
  }
})();

function gfMul(x: number, y: number): number {
  if (x === 0 || y === 0) return 0;
  return EXP_TABLE[LOG_TABLE[x] + LOG_TABLE[y]];
}

function reedSolomonComputeDivisor(numEcCodewords: number): Uint8Array {
  const result = new Uint8Array(numEcCodewords);
  result[numEcCodewords - 1] = 1;
  let root = 1;
  for (let i = 0; i < numEcCodewords; i++) {
    for (let j = 0; j < numEcCodewords; j++) {
      result[j] = gfMul(result[j], root);
      if (j + 1 < numEcCodewords) {
        result[j] ^= result[j + 1];
      }
    }
    root = gfMul(root, 0x02);
  }
  return result;
}

function reedSolomonComputeRemainder(data: Uint8Array, divisor: Uint8Array): Uint8Array {
  const numEcCodewords = divisor.length;
  const remainder = new Uint8Array(numEcCodewords);
  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ remainder[0];
    remainder.copyWithin(0, 1);
    remainder[numEcCodewords - 1] = 0;
    for (let j = 0; j < numEcCodewords; j++) {
      remainder[j] ^= gfMul(divisor[j], factor);
    }
  }
  return remainder;
}

// Table of QR versions 1 to 10
// [totalCodewords, ecCodewordsPerBlock, numBlocksGroup1, dataCodewordsGroup1, numBlocksGroup2, dataCodewordsGroup2]
interface VersionConfig {
  version: number;
  totalCodewords: number;
  ecPerBlock: Record<QrEccLevel, number>;
  blocks: Record<QrEccLevel, [number, number, number, number]>; // [b1, d1, b2, d2]
  alignmentPatterns: number[];
}

const QR_VERSIONS: VersionConfig[] = [
  {
    version: 1,
    totalCodewords: 26,
    ecPerBlock: { L: 7, M: 10, Q: 13, H: 17 },
    blocks: {
      L: [1, 19, 0, 0],
      M: [1, 16, 0, 0],
      Q: [1, 13, 0, 0],
      H: [1, 9, 0, 0],
    },
    alignmentPatterns: [],
  },
  {
    version: 2,
    totalCodewords: 44,
    ecPerBlock: { L: 10, M: 16, Q: 22, H: 28 },
    blocks: {
      L: [1, 34, 0, 0],
      M: [1, 28, 0, 0],
      Q: [1, 22, 0, 0],
      H: [1, 16, 0, 0],
    },
    alignmentPatterns: [6, 18],
  },
  {
    version: 3,
    totalCodewords: 70,
    ecPerBlock: { L: 15, M: 26, Q: 18, H: 22 },
    blocks: {
      L: [1, 55, 0, 0],
      M: [1, 44, 0, 0],
      Q: [2, 17, 0, 0],
      H: [2, 13, 0, 0],
    },
    alignmentPatterns: [6, 22],
  },
  {
    version: 4,
    totalCodewords: 100,
    ecPerBlock: { L: 20, M: 18, Q: 26, H: 16 },
    blocks: {
      L: [1, 80, 0, 0],
      M: [2, 32, 0, 0],
      Q: [2, 24, 0, 0],
      H: [4, 9, 0, 0],
    },
    alignmentPatterns: [6, 26],
  },
  {
    version: 5,
    totalCodewords: 134,
    ecPerBlock: { L: 26, M: 24, Q: 18, H: 22 },
    blocks: {
      L: [1, 108, 0, 0],
      M: [2, 43, 0, 0],
      Q: [2, 15, 2, 16],
      H: [2, 11, 2, 12],
    },
    alignmentPatterns: [6, 30],
  },
  {
    version: 6,
    totalCodewords: 172,
    ecPerBlock: { L: 18, M: 16, Q: 24, H: 28 },
    blocks: {
      L: [2, 68, 0, 0],
      M: [4, 27, 0, 0],
      Q: [4, 19, 0, 0],
      H: [4, 15, 0, 0],
    },
    alignmentPatterns: [6, 34],
  },
];

export interface QrCodeMatrix {
  size: number;
  modules: boolean[][];
}

export function generateQrMatrix(text: string, eccLevel: QrEccLevel = 'M'): QrCodeMatrix {
  const textBytes = new TextEncoder().encode(text);
  const dataLen = textBytes.length;

  // Find lowest version that fits
  let selectedConfig: VersionConfig | null = null;
  for (const cfg of QR_VERSIONS) {
    const [b1, d1, b2, d2] = cfg.blocks[eccLevel];
    const maxDataBytes = b1 * d1 + b2 * d2;
    // 4 bits mode + 8 bits count = 1.5 bytes overhead => ceil
    if (dataLen + 2 <= maxDataBytes) {
      selectedConfig = cfg;
      break;
    }
  }

  if (!selectedConfig) {
    selectedConfig = QR_VERSIONS[QR_VERSIONS.length - 1];
  }

  const version = selectedConfig.version;
  const size = 17 + 4 * version;
  const [b1, d1, b2, d2] = selectedConfig.blocks[eccLevel];
  const totalDataBytes = b1 * d1 + b2 * d2;

  // Encode data into bits: Byte mode (0100) + length (8 bits for v1-9) + data bytes
  const bitBuffer: number[] = [];
  const pushBits = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) {
      bitBuffer.push((val >>> i) & 1);
    }
  };

  // 1. Mode indicator (0100 for Byte mode)
  pushBits(0b0100, 4);
  // 2. Character count (8 bits)
  pushBits(dataLen, 8);
  // 3. Data
  for (let i = 0; i < dataLen; i++) {
    pushBits(textBytes[i], 8);
  }
  // 4. Terminator (up to 4 bits)
  const remainingBits = totalDataBytes * 8 - bitBuffer.length;
  pushBits(0, Math.min(4, Math.max(0, remainingBits)));

  // 5. Pad to byte boundary
  while (bitBuffer.length % 8 !== 0) {
    bitBuffer.push(0);
  }

  // 6. Pad codewords (0xEC, 0x11)
  const dataCodewords = new Uint8Array(totalDataBytes);
  let byteIdx = 0;
  for (let i = 0; i < bitBuffer.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) {
      b = (b << 1) | bitBuffer[i + j];
    }
    dataCodewords[byteIdx++] = b;
  }

  const padPatterns = [0xec, 0x11];
  let padIdx = 0;
  while (byteIdx < totalDataBytes) {
    dataCodewords[byteIdx++] = padPatterns[padIdx % 2];
    padIdx++;
  }

  // Block splitting & Reed-Solomon EC computation
  const ecPerBlock = selectedConfig.ecPerBlock[eccLevel];
  const divisor = reedSolomonComputeDivisor(ecPerBlock);

  const numBlocks = b1 + b2;
  const dataBlocks: Uint8Array[] = [];
  const ecBlocks: Uint8Array[] = [];
  let offset = 0;

  for (let i = 0; i < b1; i++) {
    const chunk = dataCodewords.subarray(offset, offset + d1);
    dataBlocks.push(chunk);
    ecBlocks.push(reedSolomonComputeRemainder(chunk, divisor));
    offset += d1;
  }
  for (let i = 0; i < b2; i++) {
    const chunk = dataCodewords.subarray(offset, offset + d2);
    dataBlocks.push(chunk);
    ecBlocks.push(reedSolomonComputeRemainder(chunk, divisor));
    offset += d2;
  }

  // Interleave data codewords
  const finalCodewords = new Uint8Array(selectedConfig.totalCodewords);
  let finalIdx = 0;

  const maxDataBlockLen = Math.max(d1, d2);
  for (let col = 0; col < maxDataBlockLen; col++) {
    for (let b = 0; b < numBlocks; b++) {
      if (col < dataBlocks[b].length) {
        finalCodewords[finalIdx++] = dataBlocks[b][col];
      }
    }
  }

  // Interleave error correction codewords
  for (let col = 0; col < ecPerBlock; col++) {
    for (let b = 0; b < numBlocks; b++) {
      finalCodewords[finalIdx++] = ecBlocks[b][col];
    }
  }

  // Matrix creation: modules[y][x]
  const modules: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const isFunction: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  const setFunc = (x: number, y: number, val: boolean) => {
    modules[y][x] = val;
    isFunction[y][x] = true;
  };

  // 1. Finder patterns (7x7) + separators at (0,0), (size-7, 0), (0, size-7)
  const drawFinder = (cx: number, cy: number) => {
    for (let dy = -1; dy <= 7; dy++) {
      for (let dx = -1; dx <= 7; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x >= 0 && x < size && y >= 0 && y < size) {
          if (dx >= 0 && dx <= 6 && dy >= 0 && dy <= 6) {
            const isDark =
              dx === 0 ||
              dx === 6 ||
              dy === 0 ||
              dy === 6 ||
              (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4);
            setFunc(x, y, isDark);
          } else {
            setFunc(x, y, false);
          }
        }
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(size - 7, 0);
  drawFinder(0, size - 7);

  // 2. Alignment patterns for version >= 2
  const alignCoords = selectedConfig.alignmentPatterns;
  if (alignCoords.length > 0) {
    for (const r of alignCoords) {
      for (const c of alignCoords) {
        // Skip if overlaps finder pattern
        if (
          (r === 6 && c === 6) ||
          (r === 6 && c === size - 7) ||
          (r === size - 7 && c === 6)
        ) {
          continue;
        }
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const x = c + dx;
            const y = r + dy;
            const isDark =
              Math.max(Math.abs(dx), Math.abs(dy)) === 2 ||
              (dx === 0 && dy === 0);
            setFunc(x, y, isDark);
          }
        }
      }
    }
  }

  // 3. Timing patterns
  for (let i = 8; i < size - 8; i++) {
    if (!isFunction[6][i]) setFunc(i, 6, i % 2 === 0);
    if (!isFunction[i][6]) setFunc(6, i, i % 2 === 0);
  }

  // 4. Dark module
  setFunc(8, 4 * version + 9, true);

  // Reserve Format information area around finders
  for (let i = 0; i <= 8; i++) {
    if (i !== 6) {
      isFunction[8][i] = true;
      isFunction[i][8] = true;
    }
  }
  for (let i = 0; i < 8; i++) {
    isFunction[size - 1 - i][8] = true;
    isFunction[8][size - 1 - i] = true;
  }

  // Mask pattern selection (Mask pattern 0: (x + y) % 2 === 0)
  const mask = (x: number, y: number) => (x + y) % 2 === 0;

  // Place codewords in zigzag
  let curByte = 0;
  let curBit = 7;
  let upward = true;

  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right--; // Skip vertical timing pattern column

    for (let vert = 0; vert < size; vert++) {
      const y = upward ? size - 1 - vert : vert;
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        if (!isFunction[y][x]) {
          let bit = false;
          if (curByte < finalCodewords.length) {
            bit = ((finalCodewords[curByte] >>> curBit) & 1) === 1;
            curBit--;
            if (curBit < 0) {
              curBit = 7;
              curByte++;
            }
          }
          if (mask(x, y)) {
            bit = !bit;
          }
          modules[y][x] = bit;
        }
      }
    }
    upward = !upward;
  }

  // Write Format Information (15 bits)
  // Format info = (eccLevelBits << 3) | maskPattern
  // Mask 0 = 000.
  // ECC bits: L=01, M=00, Q=11, H=10
  const eccBits: Record<QrEccLevel, number> = { L: 0b01, M: 0b00, Q: 0b11, H: 0b10 };
  const formatData = (eccBits[eccLevel] << 3) | 0b000;

  // BCH(15, 5) error correction
  let rem = formatData << 10;
  for (let i = 4; i >= 0; i--) {
    if ((rem >>> (i + 10)) & 1) {
      rem ^= 0b10100110111 << i;
    }
  }
  const formatBits = ((formatData << 10) | rem) ^ 0b101010000010010;

  // Place format bits:
  // Along top-left finder:
  // (0,8)..(5,8), (7,8), (8,8), (8,7), (8,5)..(8,0)
  const formatCoordsTopLeft: [number, number][] = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5],
    [8, 7], [8, 8], [7, 8], [5, 8], [4, 8], [3, 8],
    [2, 8], [1, 8], [0, 8]
  ];

  for (let i = 0; i < 15; i++) {
    const bit = ((formatBits >>> i) & 1) === 1;
    const [fx, fy] = formatCoordsTopLeft[i];
    modules[fy][fx] = bit;

    // And on split copy (bottom-left and top-right)
    if (i < 7) {
      modules[size - 1 - i][8] = bit;
    } else {
      modules[8][size - 15 + i] = bit;
    }
  }

  return { size, modules };
}
