// Track generation types for marble race

export type ObstacleType =
  | 'plinkoGrid'
  | 'movingBar'
  | 'brickWall'
  | 'fans'
  | 'maze'
  | 'rotatingCircles'
  | 'funnel'
  | 'finishLine'
  | 'bumpers'
  | 'spinner'
  | 'gravityZone'
  | 'seesaw'
  | 'trianglesWithTeleports';

export interface ObstacleConfig {
  type: ObstacleType;
  x: number;
  y: number;
  width: number;
  height: number;
  params?: Record<string, any>;
}

export interface TrackLayout {
  id: string;
  seed: string;
  width: number;
  height: number;
  obstacles: ObstacleConfig[];
  createdAt: number;
}

export interface TrackGenerationOptions {
  seed: string;
  width: number;
  height: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  obstacleCount?: number;
}
