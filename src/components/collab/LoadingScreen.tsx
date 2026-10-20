import { useEffect, useRef, useState } from "react";
import { GRADIENT_STOPS, LETTERS, LOGO_STROKE, LOGO_VIEWBOX } from "./logo-geometry";

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
  const introEnd = T.awaken + T.snake + T.converge + 220 + T.sweep;
  const letterRefs = useRef<(SVGGElement | null)[]>([]);
  const sweepRef = useRef<SVGRectElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [introDone, setIntroDone] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [userSkip, setUserSkip] = useState(false);
  const skipping = skip || userSkip;

  // Main animation loop (time-based → frame-rate independent).
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const root = rootRef.current;
    if (reduced || skipping) {
      root?.setAttribute("data-state", "static");
      letterRefs.current.forEach((g) => {
        if (!g) return;
        g.setAttribute("transform", "");
        g.style.opacity = "1";
      });
      setIntroDone(true);
      return;
    }
    root?.setAttribute("data-state", "animating");
    const n = LETTERS.length;
    const centre = LOGO_VIEWBOX.w / 2;
    let raf = 0;
    const start = performance.now();

    const frame = (now: number) => {
      const t = now - start;
      const snakeT = t - T.awaken;
      const convergeStart = T.awaken + T.snake;

      LETTERS.forEach((L, i) => {
        const g = letterRefs.current[i];
        if (!g) return;
        const stagger = i * 70;
        // Appear: staggered emergence from the central light.
        const appear = easeOut(clamp((snakeT - stagger) / 380));
        // Converge progress for this letter (also staggered).
        const conv = easeInOut(clamp((t - convergeStart - stagger * 0.6) / T.converge));
        const free = 1 - conv;
        // Travel along an invisible current: compact line drifting right into place.
        const flow = clamp(snakeT / (T.snake + T.converge));
        const spread = 0.45 + 0.55 * easeInOut(flow);
        const baseX = centre + (L.cx - centre) * spread - 60 * (1 - easeOut(flow));
        const phase = snakeT / 260 - i * 0.85;
        const amp = 26 * free;
        const y = Math.sin(phase) * amp;
        const pulse = 1 + 0.08 * Math.sin(phase + Math.PI / 2) * free;
        const rot = Math.cos(phase) * 12 * free;
        const x = (baseX - L.cx) * free;
        const s = (0.6 + 0.4 * appear) * pulse;
        g.setAttribute(
          "transform",
          `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${rot.toFixed(2)} ${L.cx} 70) translate(${L.cx} 70) scale(${s.toFixed(4)}) translate(${-L.cx} -70)`,
        );
        g.style.opacity = appear.toFixed(3);
      });

      // Light sweep across the formed wordmark.
      const sweepP = clamp((t - (convergeStart + T.converge + 220)) / T.sweep);
      if (sweepRef.current) {
        const sx = -200 + easeInOut(sweepP) * (LOGO_VIEWBOX.w + 300);
        sweepRef.current.setAttribute("x", sx.toFixed(1));
        sweepRef.current.style.opacity = sweepP > 0 && sweepP < 1 ? "1" : "0";
      }
      if (root) {
        const glow = sweepP > 0 ? Math.sin(sweepP * Math.PI) : 0;
        root.style.setProperty("--intro-glow", glow.toFixed(3));
      }

      if (t < introEnd) raf = requestAnimationFrame(frame);
      else {
        root?.setAttribute("data-state", "breathing");
        setIntroDone(true);
      }
    };
    raf = requestAnimationFrame(frame);
    void n;
    return () => cancelAnimationFrame(raf);
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
      <g key={`${keyPrefix}${i}`} ref={keyPrefix === "l" ? (el) => (letterRefs.current[i] = el) : undefined}>
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
          {letterShapes("grad", "l")}
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
