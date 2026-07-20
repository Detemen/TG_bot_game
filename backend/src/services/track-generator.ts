// Track generator service
// Generates deterministic track layouts from a seed

import crypto from 'crypto';
import type { TrackLayout, TrackGenerationOptions, ObstacleConfig, ObstacleType } from '../types/track.js';

/**
 * Seeded PRNG using Mulberry32 (better distribution than LCG)
 */
class SeededRandom {
  private state: number;

  constructor(seed: string) {
    this.state = this.hashSeed(seed);
  }

  private hashSeed(seed: string): number {
    const hash = crypto.createHash('sha256').update(seed).digest('hex');
    return parseInt(hash.substring(0, 8), 16);
  }

  next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6D2B79F5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  pick<T>(array: T[]): T {
    return array[Math.floor(this.next() * array.length)];
  }
}

interface ObstacleDef {
  type: ObstacleType;
  weight: number;
  minHeight: number;
}

const OBSTACLE_POOL: ObstacleDef[] = [
  { type: 'plinkoGrid', weight: 3, minHeight: 140 },
  { type: 'movingBar', weight: 2, minHeight: 50 },
  { type: 'brickWall', weight: 2, minHeight: 50 },
  { type: 'fans', weight: 2, minHeight: 80 },
  { type: 'maze', weight: 2, minHeight: 100 },
  { type: 'rotatingCircles', weight: 1, minHeight: 160 },
  { type: 'bumpers', weight: 2, minHeight: 90 },
  { type: 'spinner', weight: 2, minHeight: 100 },
  { type: 'gravityZone', weight: 2, minHeight: 80 },
  { type: 'seesaw', weight: 2, minHeight: 70 },
  { type: 'trianglesWithTeleports', weight: 1, minHeight: 160 },
];

const SPAWN_ZONE = 100; // px reserved at top for ball spawning
const FINISH_HEIGHT = 60; // px for finish line area
const MIN_SPACING = 15; // px between obstacles

/**
 * Generate a deterministic track layout from a seed
 */
export function generateTrackLayout(options: TrackGenerationOptions): TrackLayout {
  const { seed, width, height, difficulty = 'medium', obstacleCount } = options;
  const rng = new SeededRandom(seed);

  const margin = 25;
  const availableWidth = width - margin * 2;

  // Target obstacle count by difficulty
  const targetCount = obstacleCount || { easy: 4, medium: 5, hard: 7 }[difficulty];

  // Budget = total vertical space available for obstacles + spacing
  const budget = height - SPAWN_ZONE - FINISH_HEIGHT;

  // Select obstacles greedily: no same type back-to-back, respect height budget
  const selected: ObstacleDef[] = [];
  let usedHeight = 0;

  for (let i = 0; i < targetCount; i++) {
    const lastType = selected.length > 0 ? selected[selected.length - 1].type : null;

    // Filter: exclude last type, exclude if doesn't fit
    const candidates = OBSTACLE_POOL.filter((o) => {
      if (o.type === lastType) return false;
      const needed = usedHeight + o.minHeight + MIN_SPACING + // this obstacle
        (targetCount - i - 1) * (50 + MIN_SPACING); // minimum for remaining
      return needed <= budget;
    });

    if (candidates.length === 0) break; // can't fit more

    // Weighted random pick
    const totalWeight = candidates.reduce((s, o) => s + o.weight, 0);
    let r = rng.next() * totalWeight;
    let picked = candidates[0];
    for (const c of candidates) {
      r -= c.weight;
      if (r <= 0) { picked = c; break; }
    }

    selected.push(picked);
    usedHeight += picked.minHeight + MIN_SPACING;
  }

  // Distribute remaining vertical space proportionally
  const totalMinHeight = selected.reduce((s, o) => s + o.minHeight, 0);
  const totalMinSpacing = selected.length * MIN_SPACING;
  const extraSpace = Math.max(0, budget - totalMinHeight - totalMinSpacing);

  // Build obstacles
  const obstacles: ObstacleConfig[] = [];
  let currentY = SPAWN_ZONE;

  for (let i = 0; i < selected.length; i++) {
    const def = selected[i];
    // Distribute extra space: each obstacle gets proportional bonus
    const bonus = selected.length > 0
      ? Math.floor(extraSpace / selected.length)
      : 0;
    const obstacleHeight = def.minHeight + Math.min(bonus, 40); // cap bonus at 40px

    const config: ObstacleConfig = {
      type: def.type,
      x: margin,
      y: currentY,
      width: availableWidth,
      height: obstacleHeight,
    };

    // Type-specific parameters
    config.params = generateParams(def.type, rng);

    obstacles.push(config);
    currentY += obstacleHeight + MIN_SPACING;
  }

  // Finish line at bottom
  obstacles.push({
    type: 'finishLine',
    x: 0,
    y: height - FINISH_HEIGHT,
    width,
    height: FINISH_HEIGHT,
  });

  return {
    id: crypto.randomUUID(),
    seed,
    width,
    height,
    obstacles,
    createdAt: Date.now(),
  };
}

function generateParams(type: ObstacleType, rng: SeededRandom): Record<string, any> {
  switch (type) {
    case 'plinkoGrid':
      return { rows: rng.nextInt(4, 6), cols: rng.nextInt(5, 7) };
    case 'movingBar':
      return { amplitude: rng.nextInt(50, 80), period: 2 + rng.next() * 2 };
    case 'brickWall':
      return { rows: rng.nextInt(2, 3) };
    case 'fans':
      return { fanCount: rng.nextInt(2, 4) };
    case 'maze':
      return { levels: rng.nextInt(2, 3) };
    case 'rotatingCircles':
      return { circleCount: rng.nextInt(1, 2) };
    case 'bumpers':
      return { bumperCount: rng.nextInt(4, 6) };
    case 'spinner':
      return { rotationSpeed: 0.015 + rng.next() * 0.01 };
    case 'gravityZone':
      return { gravityMultiplier: 1.5 + rng.next() * 1.5 };
    case 'seesaw':
      return {};
    case 'trianglesWithTeleports':
      return { triangleCount: rng.nextInt(3, 5) };
    default:
      return {};
  }
}

/**
 * Validate track layout
 */
export function validateTrackLayout(layout: TrackLayout): boolean {
  const { obstacles } = layout;

  for (let i = 0; i < obstacles.length - 1; i++) {
    const obs = obstacles[i];
    const next = obstacles[i + 1];
    if (obs.y + obs.height > next.y) {
      return false;
    }
  }

  return true;
}