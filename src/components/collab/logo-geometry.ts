// COLLAB wordmark geometry — rounded, monoline construction derived from the
// reference logo. Edit shapes here; animation logic lives in LoadingScreen.
export const LOGO_VIEWBOX = { x: 0, y: 0, w: 556, h: 140 };
export const LOGO_STROKE = 26;

export interface LetterGlyph {
  char: string;
  /** Visual centre x, used as rotation origin. */
  cx: number;
  paths: string[];
}

export const LETTERS: LetterGlyph[] = [
  { char: "C", cx: 58, paths: ["M88.2 43.8 A37 37 0 1 0 88.2 96.2"] },
  { char: "O", cx: 160, paths: ["M160 33 A37 37 0 1 1 159.99 33 Z"] },
  { char: "L", cx: 254, paths: ["M232 33 V107 H278"] },
  { char: "L", cx: 328, paths: ["M306 33 V107 H352"] },
  { char: "A", cx: 414, paths: ["M380 107 L414 33 L448 107", "M396 82 H432"] },
  {
    char: "B",
    cx: 505,
    paths: ["M480 33 V107", "M480 33 H504 A18.5 18.5 0 0 1 504 70 H480", "M480 70 H509 A18.5 18.5 0 0 1 509 107 H480"],
  },
];

export const WORDMARK = LETTERS.map((l) => l.char).join(""); // "COLLAB"

/** Brand gradient stops, cyan → electric blue → indigo → violet → magenta → pink. */
export const GRADIENT_STOPS = [
  { offset: 0, color: "oklch(0.82 0.15 215)" },
  { offset: 0.22, color: "oklch(0.66 0.2 250)" },
  { offset: 0.42, color: "oklch(0.55 0.24 275)" },
  { offset: 0.62, color: "oklch(0.6 0.25 300)" },
  { offset: 0.82, color: "oklch(0.66 0.27 330)" },
  { offset: 1, color: "oklch(0.78 0.15 10)" },
];
