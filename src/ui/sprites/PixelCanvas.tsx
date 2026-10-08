/**
 * Motore di rendering pixel art vero: ogni sprite è una griglia di indici di
 * colore, disegnata su un canvas alla risoluzione NATIVA (es. 16×16) e poi
 * scalata via CSS con `image-rendering: pixelated`. Zero antialiasing, zero
 * curve smussate: è la differenza fra un pixel vero e un'ellissa SVG con la
 * palette giusta ma il contorno sfumato — quest'ultimo è "slop", non 8-bit.
 *
 * Un frame è `readonly (readonly (string | null)[])[]`: ogni cella è un
 * colore esadecimale della palette approvata o `null` (trasparente). Righe
 * di lunghezza diversa non sono ammesse: il renderer usa la larghezza della
 * prima riga per tutte.
 */

import { useEffect, useRef } from 'react';

export type PixelFrame = readonly (readonly (string | null)[])[];

export interface PixelSpriteProps {
  readonly frame: PixelFrame;
  /** Lato di un singolo pixel sorgente, in pixel CSS reali sullo schermo. */
  readonly scale: number;
  readonly className?: string;
  readonly style?: React.CSSProperties;
  readonly title?: string;
}

export function PixelSprite({ frame, scale, className, style, title }: PixelSpriteProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const h = frame.length;
  const w = frame[0]?.length ?? 0;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, w, h);
    for (let y = 0; y < h; y++) {
      const row = frame[y];
      for (let x = 0; x < w; x++) {
        const c = row[x];
        if (c === null) continue;
        ctx.fillStyle = c;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }, [frame, w, h]);

  return (
    <canvas
      ref={ref}
      width={w}
      height={h}
      title={title}
      className={className}
      style={{
        width: w * scale,
        height: h * scale,
        imageRendering: 'pixelated',
        display: 'block',
        ...style,
      }}
    />
  );
}

/**
 * Costruisce un `PixelFrame` da righe di testo compatte: una lettera per
 * pixel, con una mappa lettera→colore. `.` è sempre trasparente, non serve
 * dichiararlo nella mappa. Rende gli sprite leggibili nel sorgente invece di
 * array di stringhe esadecimali ripetute.
 */
export function spriteFromRows(rows: readonly string[], legend: Readonly<Record<string, string>>): PixelFrame {
  return rows.map((row) => [...row].map((ch) => (ch === '.' ? null : (legend[ch] ?? null))));
}
