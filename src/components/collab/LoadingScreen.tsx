import { useEffect, useRef, useState } from "react";
import { buildWormPaths } from "./worm-paths";
import { GRADIENT_STOPS, LETTERS, LOGO_STROKE, LOGO_VIEWBOX } from "./logo-geometry";

const WORMS = buildWormPaths();
const LETTER_SUBPATHS = LETTERS.flatMap((l) => l.paths);

export interface LoadingTiming {
  awaken: number; // light appears
  snake: number; // letters flowing
  converge: number; // letters lock in
  sweep: number; // light sweep
  minHold: number; // minimum visible time of the finished mark
  fade: number; // exit dissolve
}

export const DEFAULT_TIMING: LoadingTiming = {
  awaken: 450,
  snake: 1250,
  converge: 650,
  sweep: 700,
  minHold: 250,
  fade: 600,
};

interface Props {
  /** True once the application is ready. The screen exits after the intro completes. */
  ready: boolean;
  /** Called after the exit fade finishes. */
  onDone: () => void;
  timing?: Partial<LoadingTiming>;
  /** Skip remaining animation immediately (e.g. app was already cached). */
  skip?: boolean;
}

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export function LoadingScreen({ ready, onDone, timing, skip }: Props) {
  const T = { ...DEFAULT_TIMING, ...timing };
  const introEnd = T.awaken + T.snake + T.converge + 120 + T.sweep;
  const letterRefs = useRef<(SVGGElement | null)[]>([]);
  const wormRefs = useRef<(SVGPathElement | null)[]>([]);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const sweepRef = useRef<SVGRectElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [introDone, setIntroDone] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [userSkip, setUserSkip] = useState(false);
  const skipping = skip || userSkip;

  // Worm animation loop (time-based → frame-rate independent).
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const root = rootRef.current;
    const svg = svgRef.current;
    const els = wormRefs.current.filter(Boolean) as SVGPathElement[];
    // Measure each worm: total path length and the final letter-stroke length.
    const NS = "http://www.w3.org/2000/svg";
    const lens = els.map((el, k) => {
      const total = el.getTotalLength();
      const probe = document.createElementNS(NS, "path");
      probe.setAttribute("d", LETTER_SUBPATHS[k]);
      svg?.appendChild(probe);
      const seg = probe.getTotalLength();
      probe.remove();
      el.style.strokeDasharray = `${seg} ${total * 2}`;
      return { total, seg };
    });
    const place = (k: number, p: number) => {
      const { total, seg } = lens[k];
      // p=0: worm hidden before the path start; p=1: worm rests exactly on the letter.
      const s = -seg + p * (total);
      els[k].style.strokeDashoffset = (-(s)).toFixed(2);
    };
    const settle = () => {
      els.forEach((el, k) => {
        place(k, 1);
        el.style.strokeWidth = "";
      });
      letterRefs.current.forEach((g) => g && (g.style.opacity = "1"));
    };

    if (reduced || skipping) {
      root?.setAttribute("data-state", "static");
      settle();
      setIntroDone(true);
      return;
    }
    root?.setAttribute("data-state", "animating");
    letterRefs.current.forEach((g) => g && (g.style.opacity = "1"));
    els.forEach((_, k) => place(k, 0));
    const wormEnd = T.awaken + T.snake + T.converge;
    let raf = 0;
    const start = performance.now();

    const frame = (now: number) => {
      const t = now - start;
      els.forEach((el, k) => {
        const li = WORMS[k].letter;
        const begin = T.awaken + li * 110 + (k % 2) * 40;
        const dur = T.snake + T.converge - LETTERS.length * 110;
        const p = clamp((t - begin) / dur);
        place(k, easeInOut(p));
        // Pulse travels along the snake from letter to letter, fading on arrival.
        const pulse = Math.sin(t / 140 - li * 0.9) * (1 - easeOut(p)) * (p > 0 ? 1 : 0);
        el.style.strokeWidth = (LOGO_STROKE * (1 + 0.28 * pulse)).toFixed(2);
      });

      const sweepP = clamp((t - (wormEnd + 120)) / T.sweep);
      if (sweepRef.current) {
        const sx = -200 + easeInOut(sweepP) * (LOGO_VIEWBOX.w + 300);
        sweepRef.current.setAttribute("x", sx.toFixed(1));
        sweepRef.current.style.opacity = sweepP > 0 && sweepP < 1 ? "1" : "0";
      }
      if (root) root.style.setProperty("--intro-glow", (sweepP > 0 ? Math.sin(sweepP * Math.PI) : 0).toFixed(3));

      if (t < introEnd) raf = requestAnimationFrame(frame);
      else {
        settle();
        root?.setAttribute("data-state", "breathing");
        setIntroDone(true);
      }
    };
    raf = requestAnimationFrame(frame);
    // Safety net: if frames are throttled (hidden tab/iframe), still show the final mark.
    const fallback = window.setTimeout(() => {
      cancelAnimationFrame(raf);
      settle();
      root?.setAttribute("data-state", "breathing");
      setIntroDone(true);
    }, introEnd + 800);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(fallback);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skipping]);

  // Exit when both intro and app are ready.
  useEffect(() => {
    if (!introDone || !ready || exiting) return;
    const hold = setTimeout(() => setExiting(true), skipping ? 0 : T.minHold);
    return () => clearTimeout(hold);
  }, [introDone, ready, exiting, skipping, T.minHold]);

  useEffect(() => {
    if (!exiting) return;
    const id = setTimeout(onDone, T.fade);
    return () => clearTimeout(id);
  }, [exiting, onDone, T.fade]);

  // Allow skipping via click / key.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") setUserSkip(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const { x, y, w, h } = LOGO_VIEWBOX;
  const letterShapes = (stroke: string, keyPrefix: string) =>
    LETTERS.map((L, i) => (
      <g key={`${keyPrefix}${i}`} ref={keyPrefix === "l" ? (el) => { letterRefs.current[i] = el; } : undefined}>
        {L.paths.map((d, j) => (
          <path key={j} d={d} />
        ))}
      </g>
    ));

  return (
    <div
      ref={rootRef}
      className="collab-loader"
      data-exiting={exiting || undefined}
      style={{ ["--fade-ms" as string]: `${T.fade}ms` }}
      role="status"
      aria-live="polite"
      aria-label="Loading COLLAB"
      onClick={() => setUserSkip(true)}
    >
      <div className="collab-loader__light" aria-hidden />
      <div className="collab-loader__particles" aria-hidden>
        {Array.from({ length: 7 }).map((_, i) => (
          <span key={i} style={{ ["--i" as string]: i }} />
        ))}
      </div>
      <svg
        ref={svgRef}
        className="collab-loader__mark"
        viewBox={`${x - 40} ${y - 40} ${w + 80} ${h + 80}`}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
      >
        <defs>
          <linearGradient id="collab-grad" gradientUnits="userSpaceOnUse" x1="0" y1="20" x2={w} y2="120">
            {GRADIENT_STOPS.map((s) => (
              <stop key={s.offset} offset={s.offset} stopColor={s.color} />
            ))}
          </linearGradient>
          <linearGradient id="collab-gloss" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="white" stopOpacity="0.35" />
            <stop offset="0.45" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="collab-sweep" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="oklch(0.9 0.12 210)" stopOpacity="0" />
            <stop offset="0.5" stopColor="oklch(0.95 0.08 280)" stopOpacity="0.85" />
            <stop offset="1" stopColor="oklch(0.8 0.18 300)" stopOpacity="0" />
          </linearGradient>
          <mask id="collab-mask" maskUnits="userSpaceOnUse">
            <g fill="none" stroke="white" strokeWidth={LOGO_STROKE} strokeLinecap="round" strokeLinejoin="round">
              {letterShapes("white", "m")}
            </g>
          </mask>
        </defs>
        <g
          className="collab-loader__letters"
          fill="none"
          stroke="url(#collab-grad)"
          strokeWidth={LOGO_STROKE}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {LETTERS.map((_, li) => (
            <g key={li} ref={(el) => { letterRefs.current[li] = el; }}>
              {WORMS.map((w, k) =>
                w.letter === li ? (
                  <path key={k} d={w.d} ref={(el) => { wormRefs.current[k] = el; }} />
                ) : null,
              )}
            </g>
          ))}
        </g>
        <g mask="url(#collab-mask)">
          <rect x={x} y={y} width={w} height={h * 0.55} fill="url(#collab-gloss)" />
          <rect ref={sweepRef} x={-200} y={y} width={180} height={h} fill="url(#collab-sweep)" opacity={0} />
          <rect className="collab-loader__breath" x={x} y={y} width={w} height={h} fill="url(#collab-sweep)" />
        </g>
      </svg>
      <span className="sr-only">Loading COLLAB</span>
    </div>
  );
}
