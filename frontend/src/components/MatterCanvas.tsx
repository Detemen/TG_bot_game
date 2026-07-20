/**
 * MatterCanvas - renders marble race using backend TrackLayout
 *
 * Key design decisions:
 * - onFinish/onLeaderboardUpdate stored in refs to prevent engine recreation
 * - Ball label format "ball_N" where N = 0-based index (matches bet order)
 * - Finish line parses label to get index, NOT Matter.js body.id
 * - Bottom wall catches balls that miss finish line
 * - Ball radius = 12 (consistent with gap calculations)
 */

import { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';
import type { TrackLayout } from '../types/track';
import { buildTrackFromLayout } from '../physics/trackBuilder';
import { createAntiJamSystem } from '../physics/obstacles-optimized';
import type { FinishEntry } from '../physics/obstacles';
import styles from './MatterCanvas.module.css';

const BALL_RADIUS = 12;

interface MatterCanvasProps {
  width: number;
  height: number;
  ballCount?: number;
  ballMetadata?: Array<{ label: string; color: string }>;
  trackLayout: TrackLayout;
  onFinish?: (ballIndex: number, time: number) => void;
  onLeaderboardUpdate?: (finishers: FinishEntry[]) => void;
}

export function MatterCanvas({
  width,
  height,
  ballCount = 10,
  ballMetadata = [],
  trackLayout,
  onFinish,
  onLeaderboardUpdate,
}: MatterCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fps, setFps] = useState(60);

  // Store callbacks in refs so engine doesn't recreate when they change
  const onFinishRef = useRef(onFinish);
  const onLeaderboardRef = useRef(onLeaderboardUpdate);
  onFinishRef.current = onFinish;
  onLeaderboardRef.current = onLeaderboardUpdate;

  // Store ballMetadata in ref too (array reference changes every render)
  const ballMetadataRef = useRef(ballMetadata);
  ballMetadataRef.current = ballMetadata;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const startTime = performance.now();

    // Create engine
    const engine = Matter.Engine.create();
    engine.gravity.y = 1;

    // Stable callback wrappers that delegate to refs
    const stableOnFinish = (ballIndex: number, time: number) => {
      onFinishRef.current?.(ballIndex, time);
    };
    const stableOnLeaderboard = (entries: FinishEntry[]) => {
      // Enrich entries with metadata labels
      const enriched = entries.map((e) => {
        const idx = e.ballIndex;
        const meta = ballMetadataRef.current[idx];
        return {
          ...e,
          label: meta?.label || `Ball #${idx + 1}`,
          color: meta?.color || e.color,
        };
      });
      onLeaderboardRef.current?.(enriched);
    };

    // Build track from backend layout
    const obstacles = buildTrackFromLayout(
      engine,
      trackLayout,
      stableOnFinish,
      stableOnLeaderboard,
      startTime
    );

    // Anti-jam system
    const antiJam = createAntiJamSystem(engine);

    // Add walls (left, right, bottom safety net)
    const wallThickness = 20;
    const walls = [
      // Left wall
      Matter.Bodies.rectangle(5, height / 2, 10, height, {
        isStatic: true,
        label: 'wall',
        restitution: 0.8,
        render: { fillStyle: '#1e293b', visible: false },
      }),
      // Right wall
      Matter.Bodies.rectangle(width - 5, height / 2, 10, height, {
        isStatic: true,
        label: 'wall',
        restitution: 0.8,
        render: { fillStyle: '#1e293b', visible: false },
      }),
      // Bottom wall (safety net)
      Matter.Bodies.rectangle(width / 2, height + wallThickness / 2, width, wallThickness, {
        isStatic: true,
        label: 'wall',
        render: { fillStyle: '#1e293b', visible: false },
      }),
    ];
    Matter.World.add(engine.world, walls);

    // Find spawn zone (above first obstacle)
    const nonFinishObstacles = trackLayout.obstacles.filter(o => o.type !== 'finishLine');
    const firstObstacleY = nonFinishObstacles.length > 0
      ? Math.min(...nonFinishObstacles.map(o => o.y))
      : 200;
    const spawnStartY = Math.max(10, firstObstacleY - 80);

    // Create balls after short delay (let engine settle)
    const ballTimer = setTimeout(() => {
      const balls = createBalls(width, ballCount, ballMetadataRef.current, spawnStartY);
      Matter.World.add(engine.world, balls);
    }, 300);

    // Start physics
    const runner = Matter.Runner.create();
    Matter.Runner.run(runner, engine);

    // FPS monitor
    const fpsInterval = setInterval(() => {
      setFps(Math.round(1000 / engine.timing.lastDelta));
    }, 1000);

    // Render loop
    let animationId: number;
    const renderLoop = () => {
      ctx.clearRect(0, 0, width, height);

      // Background
      ctx.fillStyle = '#0a1628';
      ctx.fillRect(0, 0, width, height);

      // Draw all bodies
      const bodies = Matter.Composite.allBodies(engine.world);
      for (const body of bodies) {
        if (body.isSensor && body.label !== 'finishLine') continue;
        if (body.label === 'wall') continue;
        if ((body.render as any).visible === false) continue;

        ctx.save();

        if (body.label === 'finishLine') {
          ctx.restore();
          continue; // Drawn by renderCustom
        } else if (body.label?.startsWith('ball_')) {
          ctx.fillStyle = (body.render as any).fillStyle || '#ff69b4';
          ctx.strokeStyle = '#ffffff44';
          ctx.lineWidth = 1.5;
        } else {
          ctx.fillStyle = (body.render as any).fillStyle || '#1e3a5f';
        }

        ctx.beginPath();

        if (body.circleRadius) {
          ctx.arc(body.position.x, body.position.y, body.circleRadius, 0, Math.PI * 2);
          ctx.fill();
          if (body.label?.startsWith('ball_')) {
            ctx.stroke();
          }
        } else {
          const vertices = body.vertices;
          ctx.moveTo(vertices[0].x, vertices[0].y);
          for (let i = 1; i < vertices.length; i++) {
            ctx.lineTo(vertices[i].x, vertices[i].y);
          }
          ctx.closePath();
          ctx.fill();
        }

        ctx.restore();
      }

      // Custom renders (portals, bumper effects, gravity zone, finish line, etc.)
      for (const obs of obstacles) {
        obs.renderCustom?.(ctx);
      }

      // Update animated obstacles
      const time = performance.now() / 1000;
      for (const obs of obstacles) {
        obs.update?.(time, 16.666);
      }

      animationId = requestAnimationFrame(renderLoop);
    };
    renderLoop();

    // Cleanup
    return () => {
      clearTimeout(ballTimer);
      clearInterval(fpsInterval);
      cancelAnimationFrame(animationId);
      antiJam.cleanup();
      for (const obs of obstacles) obs.cleanup();
      Matter.Runner.stop(runner);
      Matter.World.clear(engine.world, false);
      Matter.Engine.clear(engine);
    };
    // IMPORTANT: only recreate engine when trackLayout changes, NOT on callback changes
  }, [width, height, ballCount, trackLayout]);

  return (
    <div className={styles.wrapper}>
      <canvas ref={canvasRef} className={styles.canvas} />
      <div className={styles.stats}>
        <span>FPS: {fps}</span>
        <span>Balls: {ballCount}</span>
      </div>
    </div>
  );
}

function createBalls(
  width: number,
  count: number,
  metadata: Array<{ label: string; color: string }>,
  spawnStartY: number = 20
): Matter.Body[] {
  const { Bodies } = Matter;
  const balls: Matter.Body[] = [];
  const colors = ['#ff6b9d', '#c69aff', '#ffd93d', '#6bcfff', '#95e1d3', '#ff9a76'];

  for (let i = 0; i < count; i++) {
    // Spread balls in grid pattern with slight randomness
    const col = i % 5;
    const row = Math.floor(i / 5);
    const x = width * 0.25 + col * (width * 0.5 / 5) + (Math.random() - 0.5) * 20;
    const y = spawnStartY + row * (BALL_RADIUS * 3);
    const color = metadata[i]?.color || colors[i % colors.length];

    const ball = Bodies.circle(x, y, BALL_RADIUS, {
      restitution: 0.5,
      friction: 0.05,
      density: 0.004,
      label: `ball_${i}`,
      render: { fillStyle: color } as any,
    });

    balls.push(ball);
  }

  return balls;
}
