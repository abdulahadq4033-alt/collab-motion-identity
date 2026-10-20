import { LETTERS } from "./logo-geometry";

/**
 * Builds "worm" paths: a winding, snake-like approach curve that flows straight
 * into each letter stroke. The animation slides a stroke segment exactly as long
 * as the letter stroke along this path, so each worm crawls in and comes to rest
 * precisely on the letter geometry.
 */
export interface WormPath {
  letter: number;
  d: string;
}

function startPoint(d: string): [number, number] {
  const m = d.match(/^M\s*([-\d.]+)[\s,]+([-\d.]+)/);
  return m ? [parseFloat(m[1] ?? "0"), parseFloat(m[2] ?? "0")] : [0, 0];
}

export function buildWormPaths(): WormPath[] {
  const out: WormPath[] = [];
  LETTERS.forEach((L, li) => {
    L.paths.forEach((d, pi) => {
      const [ex, ey] = startPoint(d);
      const side = (li + pi) % 2 === 0 ? 1 : -1; // alternate from below / above
      const sx = ex - 180 + li * 14;
      const sy = ey + side * 170;
      const pts: string[] = [`M${sx.toFixed(1)} ${sy.toFixed(1)}`];
      const N = 48;
      const waves = 2.5;
      for (let k = 1; k <= N; k++) {
        const t = k / N;
        const e = t * t * (3 - 2 * t); // smooth approach
        const bx = sx + (ex - sx) * t;
        const by = sy + (ey - sy) * e;
        const amp = 30 * (1 - t); // wiggle fades as it arrives
        const wx = Math.sin(t * Math.PI * 2 * waves + li) * amp;
        pts.push(`L${(bx + wx * 0.6).toFixed(1)} ${(by + wx).toFixed(1)}`);
      }
      const rest = d.replace(/^M\s*[-\d.]+[\s,]+[-\d.]+/, "");
      out.push({ letter: li, d: `${pts.join(" ")} ${rest}` });
    });
  });
  return out;
}
