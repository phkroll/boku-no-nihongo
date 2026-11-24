// Writes the app icons (white square, red circle) as PNG using only node:zlib.
import { deflateSync, crc32 } from 'node:zlib';
import { writeFileSync } from 'node:fs';

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function icon(size) {
  const rows = [];
  const c = size / 2;
  const r = size * 0.3;
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3); // filter byte 0, then RGB
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x + 0.5 - c, y + 0.5 - c);
      const t = Math.min(1, Math.max(0, r + 0.5 - d)); // anti-aliased edge
      const px = [247, 245, 242].map((bg, i) => Math.round(bg + ([200, 50, 60][i] - bg) * t));
      px.forEach((v, i) => { row[1 + x * 3 + i] = v; });
    }
    rows.push(row);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const size of [180, 512]) writeFileSync(new URL(`../icons/icon-${size}.png`, import.meta.url), icon(size));
