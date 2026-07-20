// Physics types for Matter.js integration

import Matter from 'matter-js';

/**
 * Base obstacle interface
 */
export interface Obstacle {
  type: string;
  bodies: Matter.Body[];
  cleanup: () => void;
  renderCustom?: (ctx: CanvasRenderingContext2D) => void;
  update?: (time: number, delta: number) => void;
}

/**
 * Obstacle creation parameters
 */
export interface ObstacleParams {
  x: number;
  y: number;
  width: number;
  height: number;
  seed?: number;
  [key: string]: any;
}

/**
 * Track generation options
 */
export interface TrackOptions {
  width: number;
  height: number;
  obstacleCount?: number;
  seed?: number;
  onFinish?: (ballId: number, slot: number, multiplier: number) => void;
}

/**
 * Generated track result
 */
export interface GeneratedTrack {
  obstacles: Obstacle[];
  walls: Matter.Body[];
  cleanup: () => void;
}

/**
 * Ball finish event
 */
export interface FinishEvent {
  ballId: number;
  slot: number;
  multiplier: number;
  time: number;
}
