const VERSION = 4;
const SIZE = VERSION * 4 + 17;
const DATA_CODEWORDS = 80;
const ECC_CODEWORDS = 20;

function multiply(x: number, y: number): number {
  let product = 0;
  for (let bit = 7; bit >= 0; bit--) {
    product = (product << 1) ^ ((product >>> 7) * 0x11d);
    product ^= ((y >>> bit) & 1) * x;
  }
  return product;
}

function reedSolomon(data: number[]): number[] {
  let divisor = [1];
  let root = 1;
  for (let i = 0; i < ECC_CODEWORDS; i++) {
    const next = Array(divisor.length + 1).fill(0) as number[];
    divisor.forEach((coefficient, index) => {
      next[index] ^= coefficient;
      next[index + 1] ^= multiply(coefficient, root);
    });
    divisor = next;
    root = multiply(root, 2);
  }
  const result = Array(ECC_CODEWORDS).fill(0) as number[];
  for (const byte of data) {
    const factor = byte ^ result[0];
    result.shift();
    result.push(0);
    for (let index = 0; index < ECC_CODEWORDS; index++) result[index] ^= multiply(divisor[index + 1], factor);
  }
  return result;
}

function formatBits(mask: number): number {
  const data = (1 << 3) | mask; // Error correction level L.
  let remainder = data;
  for (let i = 0; i < 10; i++) remainder = (remainder << 1) ^ ((remainder >>> 9) * 0x537);
  return ((data << 10) | remainder) ^ 0x5412;
}

export function qrCodeMatrix(value: string): boolean[][] {
  const bytes = [...new TextEncoder().encode(value)];
  if (!bytes.length || bytes.length > 78) throw new RangeError('QR_VALUE_TOO_LONG');
  const bits: number[] = [];
  const append = (number: number, width: number) => {
    for (let i = width - 1; i >= 0; i--) bits.push((number >>> i) & 1);
  };
  append(0b0100, 4);
  append(bytes.length, 8);
  bytes.forEach(byte => append(byte, 8));
  for (let i = 0; i < 4 && bits.length < DATA_CODEWORDS * 8; i++) bits.push(0);
  while (bits.length % 8) bits.push(0);
  const data: number[] = [];
  for (let i = 0; i < bits.length; i += 8) data.push(bits.slice(i, i + 8).reduce((value, bit) => (value << 1) | bit, 0));
  for (let pad = 0; data.length < DATA_CODEWORDS; pad++) data.push(pad % 2 ? 0x11 : 0xec);
  const codewords = [...data, ...reedSolomon(data)];
  const modules = Array.from({ length: SIZE }, () => Array(SIZE).fill(false) as boolean[]);
  const functions = Array.from({ length: SIZE }, () => Array(SIZE).fill(false) as boolean[]);
  const setFunction = (row: number, col: number, dark: boolean) => {
    if (row >= 0 && row < SIZE && col >= 0 && col < SIZE) {
      modules[row][col] = dark;
      functions[row][col] = true;
    }
  };
  const finder = (top: number, left: number) => {
    for (let row = -1; row <= 7; row++) for (let col = -1; col <= 7; col++) {
      const distance = Math.max(Math.abs(row - 3), Math.abs(col - 3));
      setFunction(top + row, left + col, distance !== 2 && distance !== 4);
    }
  };
  finder(0, 0);
  finder(0, SIZE - 7);
  finder(SIZE - 7, 0);
  for (let i = 8; i < SIZE - 8; i++) {
    setFunction(6, i, i % 2 === 0);
    setFunction(i, 6, i % 2 === 0);
  }
  for (let row = -2; row <= 2; row++) for (let col = -2; col <= 2; col++) {
    setFunction(26 + row, 26 + col, Math.max(Math.abs(row), Math.abs(col)) !== 1);
  }

  let bitIndex = 0;
  let upward = true;
  for (let right = SIZE - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vertical = 0; vertical < SIZE; vertical++) {
      const row = upward ? SIZE - 1 - vertical : vertical;
      for (let offset = 0; offset < 2; offset++) {
        const col = right - offset;
        if (functions[row][col]) continue;
        const byte = codewords[bitIndex >>> 3] ?? 0;
        let dark = ((byte >>> (7 - (bitIndex & 7))) & 1) !== 0;
        if ((row + col) % 2 === 0) dark = !dark;
        modules[row][col] = dark;
        bitIndex++;
      }
    }
    upward = !upward;
  }

  const format = formatBits(0);
  for (let i = 0; i <= 5; i++) setFunction(i, 8, ((format >>> i) & 1) !== 0);
  setFunction(7, 8, ((format >>> 6) & 1) !== 0);
  setFunction(8, 8, ((format >>> 7) & 1) !== 0);
  setFunction(8, 7, ((format >>> 8) & 1) !== 0);
  for (let i = 9; i < 15; i++) setFunction(8, 14 - i, ((format >>> i) & 1) !== 0);
  for (let i = 0; i < 8; i++) setFunction(8, SIZE - 1 - i, ((format >>> i) & 1) !== 0);
  for (let i = 8; i < 15; i++) setFunction(SIZE - 15 + i, 8, ((format >>> i) & 1) !== 0);
  setFunction(SIZE - 8, 8, true);
  return modules;
}

export function qrCodePath(matrix: boolean[][], quietZone = 0): string {
  const paths: string[] = [];
  matrix.forEach((row, y) => row.forEach((dark, x) => {
    if (dark) paths.push(`M${x + quietZone},${y + quietZone}h1v1h-1z`);
  }));
  return paths.join('');
}

export function qrCodeDataUrl(value: string): string {
  const matrix = qrCodeMatrix(value);
  const quiet = 4;
  const dimension = matrix.length + quiet * 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220" viewBox="0 0 ${dimension} ${dimension}" shape-rendering="crispEdges"><rect width="${dimension}" height="${dimension}" fill="#fff"/><path d="${qrCodePath(matrix, quiet)}" fill="#000"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
