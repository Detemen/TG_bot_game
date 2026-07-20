// Build Matter.js track from backend track layout

import Matter from 'matter-js';
import type { Obstacle } from './types';
import type { TrackLayout, ObstacleConfig } from '../types/track';
import {
  createPlinkoGrid,
  createMovingBar,
  createFans,
  createFunnel,
  createFinishLine,
} from './obstacles';
import {
  createBrickWallOptimized,
  createMazeOptimized,
  createRotatingCirclesOptimized,
} from './obstacles-optimized';
import {
  createBumpers,
  createSpinner,
  createGravityZone,
  createSeesaw,
  createTrianglesWithTeleports,
} from './obstacles-extended';

/**
 * Build track obstacles from backend layout
 */
export function buildTrackFromLayout(
  engine: Matter.Engine,
  layout: TrackLayout,
  onFinish?: (ballIndex: number, time: number) => void,
  onLeaderboardUpdate?: (entries: any[]) => void,
  startTime?: number
): Obstacle[] {
  const obstacles: Obstacle[] = [];

  // Walls are added by MatterCanvas, not here

  // Create obstacles from layout
  for (const config of layout.obstacles) {
    const obstacle = createObstacleFromConfig(engine, config, onFinish, onLeaderboardUpdate, startTime);
    if (obstacle) {
      obstacles.push(obstacle);
    }
  }

  return obstacles;
}

/**
 * Create a single obstacle from config
 */
function createObstacleFromConfig(
  engine: Matter.Engine,
  config: ObstacleConfig,
  onFinish?: (ballIndex: number, time: number) => void,
  onLeaderboardUpdate?: (entries: any[]) => void,
  startTime?: number
): Obstacle | null {
  const { type, x, y, width, height, params = {} } = config;

  try {
    switch (type) {
      case 'plinkoGrid':
        return createPlinkoGrid(engine, {
          x,
          y,
          width,
          height,
          rows: params.rows,
          cols: params.cols,
        });

      case 'movingBar':
        return createMovingBar(engine, {
          x,
          y,
          width,
          height,
          amplitude: params.amplitude,
          period: params.period,
        });

      case 'brickWall':
        // Use optimized version with guaranteed gaps
        return createBrickWallOptimized(engine, {
          x,
          y,
          width,
          height,
          rows: params.rows,
        });

      case 'fans':
        return createFans(engine, {
          x,
          y,
          width,
          height,
          fanCount: params.fanCount,
        });

      case 'maze':
        // Use optimized version with no dead ends
        return createMazeOptimized(engine, {
          x,
          y,
          width,
          height,
          levels: params.levels,
        });

      case 'rotatingCircles':
        // Use optimized version with larger gaps
        return createRotatingCirclesOptimized(engine, {
          x,
          y,
          width,
          height,
          circleCount: params.circleCount,
        });

      case 'funnel':
        return createFunnel(engine, {
          x,
          y,
          width,
          height,
        });

      case 'finishLine':
        return createFinishLine(engine, {
          x,
          y,
          width,
          height,
          onFinish,
          onLeaderboardUpdate,
          startTime,
        });

      case 'bumpers':
        return createBumpers(engine, {
          x,
          y,
          width,
          height,
          bumperCount: params.bumperCount,
        });

      case 'spinner':
        return createSpinner(engine, {
          x,
          y,
          width,
          height,
          rotationSpeed: params.rotationSpeed,
        });

      case 'gravityZone':
        return createGravityZone(engine, {
          x,
          y,
          width,
          height,
          gravityMultiplier: params.gravityMultiplier,
        });

      case 'seesaw':
        return createSeesaw(engine, {
          x,
          y,
          width,
          height,
        });

      case 'trianglesWithTeleports':
        return createTrianglesWithTeleports(engine, {
          x,
          y,
          width,
          height,
          triangleCount: params.triangleCount,
        });

      default:
        console.warn(`Unknown obstacle type: ${type}`);
        return null;
    }
  } catch (error) {
    console.error(`Failed to create obstacle ${type}:`, error);
    return null;
  }
}
