/**
 * Maze Generator - Creates a vertical maze without dead ends
 * Balls fall from top to bottom through platforms and obstacles
 */

import Matter from 'matter-js';

export interface MazeConfig {
  width: number;
  height: number;
  seed: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface MazePlatform {
  x: number;
  y: number;
  width: number;
  body: Matter.Body;
}

export interface MazePeg {
  x: number;
  y: number;
  radius: number;
  body: Matter.Body;
}

export interface MazeResult {
  platforms: MazePlatform[];
  pegs: MazePeg[];
  walls: Matter.Body[];
}

/**
 * Simple seeded random number generator
 */
class SeededRandom {
  private seed: number;

  constructor(seed: string) {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash) + seed.charCodeAt(i);
      hash = hash & hash;
    }
    this.seed = Math.abs(hash);
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}

/**
 * Generate a vertical maze with platforms and pegs
 */
export function generateMaze(config: MazeConfig): MazeResult {
  const { width, height, seed, difficulty } = config;
  const { Bodies } = Matter;
  const rng = new SeededRandom(seed);

  const platforms: MazePlatform[] = [];
  const pegs: MazePeg[] = [];
  const walls: Matter.Body[] = [];

  // Configuration based on difficulty
  const difficultyConfig = {
    easy: { levels: 4, pegsPerLevel: 3, platformGap: 80 },
    medium: { levels: 6, pegsPerLevel: 5, platformGap: 60 },
    hard: { levels: 8, pegsPerLevel: 7, platformGap: 50 },
  }[difficulty];

  const { levels, pegsPerLevel, platformGap } = difficultyConfig;

  // Create walls
  const wallThickness = 10;
  const leftWall = Bodies.rectangle(
    -wallThickness / 2,
    height / 2,
    wallThickness,
    height,
    { isStatic: true, friction: 0.1, render: { fillStyle: '#1a1a2e' } }
  );
  const rightWall = Bodies.rectangle(
    width + wallThickness / 2,
    height / 2,
    wallThickness,
    height,
    { isStatic: true, friction: 0.1, render: { fillStyle: '#1a1a2e' } }
  );
  const bottomWall = Bodies.rectangle(
    width / 2,
    height + wallThickness / 2,
    width,
    wallThickness,
    { isStatic: true, friction: 0.1, render: { fillStyle: '#1a1a2e' } }
  );
  walls.push(leftWall, rightWall, bottomWall);

  // Calculate vertical spacing
  const usableHeight = height - 150; // Leave space at top and bottom
  const levelHeight = usableHeight / levels;

  // Generate zigzag platforms (alternating left-right gaps)
  for (let level = 0; level < levels; level++) {
    const y = 100 + level * levelHeight;
    const isLeftGap = level % 2 === 0;

    // Create platforms with gap
    if (isLeftGap) {
      // Gap on the left, platform on the right
      const platformX = platformGap + 20;
      const platformWidth = width - platformGap - 40;

      const platform = Bodies.rectangle(
        platformX + platformWidth / 2,
        y,
        platformWidth,
        8,
        {
          isStatic: true,
          friction: 0.3,
          render: { fillStyle: '#16213e' },
        }
      );

      platforms.push({
        x: platformX,
        y,
        width: platformWidth,
        body: platform,
      });
    } else {
      // Gap on the right, platform on the left
      const platformWidth = width - platformGap - 40;

      const platform = Bodies.rectangle(
        20 + platformWidth / 2,
        y,
        platformWidth,
        8,
        {
          isStatic: true,
          friction: 0.3,
          render: { fillStyle: '#16213e' },
        }
      );

      platforms.push({
        x: 20,
        y,
        width: platformWidth,
        body: platform,
      });
    }

    // Add pegs (plinko-style) between platforms
    if (level < levels - 1) {
      const pegY = y + levelHeight / 2;
      const pegSpacing = width / (pegsPerLevel + 1);

      for (let i = 1; i <= pegsPerLevel; i++) {
        const pegX = i * pegSpacing + rng.nextInt(-10, 10);
        const pegRadius = 6;

        const peg = Bodies.circle(pegX, pegY, pegRadius, {
          isStatic: true,
          restitution: 0.8,
          render: { fillStyle: '#e94560' },
        });

        pegs.push({
          x: pegX,
          y: pegY,
          radius: pegRadius,
          body: peg,
        });
      }
    }
  }

  return { platforms, pegs, walls };
}

/**
 * Create finish line sensor at the bottom
 */
export function createFinishLine(width: number, height: number): Matter.Body {
  const { Bodies } = Matter;
  const finishY = height - 60;

  return Bodies.rectangle(width / 2, finishY, width, 10, {
    isStatic: true,
    isSensor: true,
    label: 'finishLine',
    render: { fillStyle: '#22c55e' },
  });
}
