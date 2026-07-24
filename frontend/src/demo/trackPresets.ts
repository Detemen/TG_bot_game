import type { TrackLayout, ObstacleConfig } from "../types/track";

/**
 * Client-side track generator for the standalone (backend-free) demo.
 *
 * Production tracks come from the backend's commit–reveal seed pipeline; this
 * mirrors that shape closely enough to showcase the physics, while varying the
 * obstacle stack per seed so every "New race" feels different.
 */

// Small deterministic PRNG (mulberry32) so a given seed always plays the same.
function mulberry32(seedStr: string): () => number {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const WIDTH = 420;
const SIDE_MARGIN = 30;
const INNER_WIDTH = WIDTH - SIDE_MARGIN * 2;

type Band = (rand: () => number, y: number) => { obstacle: ObstacleConfig; height: number };

const BANDS: Band[] = [
  (rand, y) => ({
    obstacle: {
      type: "plinkoGrid",
      x: SIDE_MARGIN,
      y,
      width: INNER_WIDTH,
      height: 150,
      params: { rows: 4 + Math.floor(rand() * 3), cols: 5 + Math.floor(rand() * 2) },
    },
    height: 150,
  }),
  (rand, y) => ({
    obstacle: {
      type: "bumpers",
      x: SIDE_MARGIN,
      y,
      width: INNER_WIDTH,
      height: 110,
      params: { bumperCount: 4 + Math.floor(rand() * 3) },
    },
    height: 110,
  }),
  (_rand, y) => ({
    obstacle: { type: "spinner", x: SIDE_MARGIN, y, width: INNER_WIDTH, height: 120 },
    height: 120,
  }),
  (rand, y) => ({
    obstacle: {
      type: "brickWall",
      x: SIDE_MARGIN,
      y,
      width: INNER_WIDTH,
      height: 70,
      params: { rows: 2 + Math.floor(rand() * 2) },
    },
    height: 70,
  }),
  (rand, y) => ({
    obstacle: {
      type: "fans",
      x: SIDE_MARGIN,
      y,
      width: INNER_WIDTH,
      height: 100,
      params: { fanCount: 2 + Math.floor(rand() * 3) },
    },
    height: 100,
  }),
  (rand, y) => ({
    obstacle: {
      type: "gravityZone",
      x: SIDE_MARGIN,
      y,
      width: INNER_WIDTH,
      height: 100,
      params: { gravityMultiplier: 2 + rand() * 1.5 },
    },
    height: 100,
  }),
];

export function generateTrackLayout(seed: string): TrackLayout {
  const rand = mulberry32(seed);

  // Shuffle the band pool, then take 5–6 for this track.
  const pool = [...BANDS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const bandCount = 5 + Math.floor(rand() * 2);

  const obstacles: ObstacleConfig[] = [];
  let y = 120; // leave room at the top for the marbles to drop
  for (let i = 0; i < bandCount; i++) {
    const { obstacle, height } = pool[i % pool.length](rand, y);
    obstacles.push(obstacle);
    y += height + 24;
  }

  const finishY = y + 20;
  obstacles.push({
    type: "finishLine",
    x: 0,
    y: finishY,
    width: WIDTH,
    height: 80,
  });

  return {
    id: seed,
    seed,
    width: WIDTH,
    height: finishY + 100,
    obstacles,
    createdAt: Date.now(),
  };
}

export function randomSeed(): string {
  return Math.random().toString(36).slice(2, 10);
}
