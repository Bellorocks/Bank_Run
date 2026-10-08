/**
 * Genera l'icona sorgente di DEAL DESK come pixel art 16x16 scalata a 1024x1024.
 * Nessuna dipendenza: encoder PNG scritto a mano su zlib.
 *
 * Uso:  node scripts/make-icon.mjs
 * Poi:  npx tauri icon src-tauri/icons/source.png
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

// Palette 16 colori dello spec §8.
const P = {
  _: null, // trasparente
  a: '#1a1c2c',
  b: '#5d275d',
  c: '#b13e53',
  d: '#ef7d57',
  e: '#ffcd75',
  f: '#a7f070',
  g: '#38b764',
  h: '#257179',
  i: '#29366f',
  j: '#3b5dc9',
  k: '#41a6f6',
  l: '#73eff7',
  m: '#f4f4f4',
  n: '#94b0c2',
  o: '#566c86',
  p: '#333c57',
};

// Monitor 8-bit con un grafico a barre verde: il "deal desk".
const ART = [
  '________________',
  '__pppppppppppp__',
  '__pmmmmmmmmmmp__',
  '__pmaaaaaaaamp__',
  '__pmahaaaaaeamp_'.slice(0, 16),
  '__pmahaaaaeeamp_'.slice(0, 16),
  '__pmahaaggeeamp_'.slice(0, 16),
  '__pmahaaggeeamp_'.slice(0, 16),
  '__pmahffggeeamp_'.slice(0, 16),
  '__pmahffggeeamp_'.slice(0, 16),
  '__pmahhhhhhhamp_'.slice(0, 16),
  '__pmaaaaaaaamp__',
  '__pppppppppppp__',
  '_____poooop_____',
  '___ppppppppppp__',
  '________________',
];

const S = 16;
const SCALE = 64;
const W = S * SCALE;

function hexToRgb(hex) {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

// Scanline RGBA con filtro 0, come richiesto dal formato.
const raw = Buffer.alloc(W * (W * 4 + 1));
let off = 0;
for (let y = 0; y < W; y++) {
  raw[off++] = 0;
  const srcY = Math.floor(y / SCALE);
  for (let x = 0; x < W; x++) {
    const srcX = Math.floor(x / SCALE);
    const key = ART[srcY][srcX];
    const hex = P[key];
    if (hex === null || hex === undefined) {
      raw[off++] = 0;
      raw[off++] = 0;
      raw[off++] = 0;
      raw[off++] = 0;
    } else {
      const [r, g, b] = hexToRgb(hex);
      raw[off++] = r;
      raw[off++] = g;
      raw[off++] = b;
      raw[off++] = 255;
    }
  }
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(W, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // RGBA
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

const out = resolve(HERE, '..', 'src-tauri', 'icons', 'source.png');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, png);
console.log(`scritto ${out} (${W}x${W}, ${(png.length / 1024).toFixed(1)} KB)`);
