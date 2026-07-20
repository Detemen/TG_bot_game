// Optimized obstacles with no-jam guarantees

import Matter from 'matter-js';
import { Obstacle, ObstacleParams } from './types';

/**
 * Create Brick Wall with guaranteed gaps (anti-jam)
 */
export function createBrickWallOptimized(
  engine: Matter.Engine,
  params: ObstacleParams & { rows?: number }
): Obstacle {
  const { x, y, width, height, rows = 2 } = params; // Reduced default rows
  const { Bodies, World, Events, Body } = Matter;

  const brickWidth = 35;
  const brickHeight = 18;
  const cols = Math.floor(width / brickWidth);
  const minGapSize = 60; // Minimum gap for balls (ball radius = 12, so 60 is safe)

  const bricks: Matter.Body[] = [];
  const brickData = new Map<number, { hp: number; maxHp: number }>();

  for (let row = 0; row < rows; row++) {
    const offsetX = (row % 2) * (brickWidth / 2);
    const brickY = y + row * brickHeight;

    // Ensure at least 2 gaps per row
    const gapPositions = [
      Math.floor(cols * 0.3),
      Math.floor(cols * 0.7),
    ];

    for (let col = 0; col < cols; col++) {
      // Skip bricks at gap positions
      if (gapPositions.includes(col)) {
        continue;
      }

      const brickX = x + offsetX + col * brickWidth + brickWidth / 2;

      if (brickX - brickWidth / 2 < x || brickX + brickWidth / 2 > x + width) {
        continue;
      }

      const brick = Bodies.rectangle(brickX, brickY, brickWidth - 4, brickHeight - 4, {
        isStatic: true,
        label: 'brick',
        restitution: 0.7, // Moderate bounce
        friction: 0.1,
        render: {
          fillStyle: '#ff3333',
        },
      });

      bricks.push(brick);
      brickData.set(brick.id, { hp: 2, maxHp: 2 }); // Reduced HP
    }
  }

  World.add(engine.world, bricks);

  const brickOptHandler = (event: Matter.IEventCollision<Matter.Engine>) => {
    event.pairs.forEach((pair) => {
      const { bodyA, bodyB } = pair;
      const brick = bodyA.label === 'brick' ? bodyA : bodyB.label === 'brick' ? bodyB : null;
      const ball = bodyA.label !== 'brick' ? bodyA : bodyB;

      if (brick && brickData.has(brick.id) && !ball.isStatic) {
        const data = brickData.get(brick.id)!;
        data.hp -= 1;

        // Gentle bounce force
        const dx = ball.position.x - brick.position.x;
        const dy = ball.position.y - brick.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const nx = dx / dist;
        const ny = dy / dist;

        Body.applyForce(ball, ball.position, {
          x: nx * 0.002,
          y: ny * 0.002,
        });

        // Update visuals
        if (data.hp === 1) {
          brick.render.fillStyle = '#ff8888';
        } else if (data.hp <= 0) {
          World.remove(engine.world, brick);
          brickData.delete(brick.id);
        }
      }
    });
  };

  Events.on(engine, 'collisionStart', brickOptHandler);

  return {
    type: 'brickWall',
    bodies: bricks,
    cleanup: () => {
      Events.off(engine, 'collisionStart', brickOptHandler);
      World.remove(engine.world, bricks);
      brickData.clear();
    },
  };
}

/**
 * Create Maze with guaranteed zigzag passages
 * Bars alternate left/right on SAME Y-spacing, creating a zigzag path.
 * Gap = 40% of width on alternating sides.
 */
export function createMazeOptimized(
  engine: Matter.Engine,
  params: ObstacleParams & { levels?: number }
): Obstacle {
  const { x, y, width, height, levels = 3 } = params;
  const { Bodies, World } = Matter;

  const bars: Matter.Body[] = [];
  const barHeight = 12;
  const barWidth = width * 0.6; // 60% width — leaves 40% gap
  const levelSpacing = height / (levels + 1);

  for (let i = 0; i < levels; i++) {
    const barY = y + levelSpacing * (i + 1);
    const isLeft = i % 2 === 0;

    // Bar anchored to one side, gap on the other
    const barX = isLeft
      ? x + barWidth / 2  // left-aligned, gap on right
      : x + width - barWidth / 2; // right-aligned, gap on left

    const bar = Bodies.rectangle(barX, barY, barWidth, barHeight, {
      isStatic: true,
      label: 'mazeBar',
      restitution: 0.5,
      friction: 0.1,
      chamfer: { radius: 3 },
      render: { fillStyle: '#4488ff' },
    });
    bars.push(bar);

    // Small lip on gap side to prevent balls rolling off too easily
    const lipX = isLeft ? x + barWidth + 5 : x + width - barWidth - 5;
    const lip = Bodies.rectangle(lipX, barY - barHeight, 6, barHeight * 2, {
      isStatic: true,
      label: 'mazeLip',
      restitution: 0.3,
      render: { fillStyle: '#3377dd' },
    });
    bars.push(lip);
  }

  World.add(engine.world, bars);

  return {
    type: 'maze',
    bodies: bars,
    cleanup: () => {
      World.remove(engine.world, bars);
    },
  };
}

/**
 * Create Rotating Circles with larger gaps
 */
export function createRotatingCirclesOptimized(
  engine: Matter.Engine,
  params: ObstacleParams & { circleCount?: number }
): Obstacle {
  const { x, y, width, height, circleCount = 1 } = params; // Reduced count
  const { Bodies, World, Body, Events } = Matter;

  const circles: any[] = [];
  const circleRadius = 65;
  const tubeThickness = 6;
  const gapSize = 70; // Larger gaps for easier passage
  const spacing = height / (circleCount + 1);

  for (let i = 0; i < circleCount; i++) {
    const circleY = y + spacing * (i + 1);
    const circleX = x + width / 2;
    const direction = i % 2 === 0 ? 1 : -1;

    const segments: Matter.Body[] = [];
    const segmentCount = 12; // Fewer segments = larger gaps
    const gapAngleSize = (gapSize / circleRadius) * 2;
    const leftGapStart = Math.PI - gapAngleSize;
    const leftGapEnd = Math.PI + gapAngleSize;
    const rightGapStart = -gapAngleSize;
    const rightGapEnd = gapAngleSize;

    for (let j = 0; j < segmentCount; j++) {
      const angle = (j / segmentCount) * Math.PI * 2;
      const nextAngle = ((j + 1) / segmentCount) * Math.PI * 2;

      // Check if in gap zones
      const inLeftGap = angle >= leftGapStart && angle <= leftGapEnd;
      const inRightGap =
        (angle >= rightGapStart && angle <= rightGapEnd) ||
        angle >= Math.PI * 2 - gapAngleSize;

      if (inLeftGap || inRightGap) {
        continue;
      }

      const midAngle = (angle + nextAngle) / 2;
      const arcLength = circleRadius * (nextAngle - angle);

      const segX = circleX + Math.cos(midAngle) * circleRadius;
      const segY = circleY + Math.sin(midAngle) * circleRadius;

      const segment = Bodies.rectangle(segX, segY, arcLength, tubeThickness, {
        isStatic: true,
        angle: midAngle + Math.PI / 2,
        label: 'circleSegment',
        chamfer: { radius: 2 },
        restitution: 0.6,
        render: {
          fillStyle: direction === 1 ? '#55dd99' : '#dd9955',
        },
      });

      segments.push(segment);
    }

    World.add(engine.world, segments);

    circles.push({
      x: circleX,
      y: circleY,
      radius: circleRadius,
      segments: segments,
      angle: 0,
      direction: direction,
      speed: 0.0004 * direction, // Slower rotation
      leftGapStart,
      leftGapEnd,
      rightGapStart,
      rightGapEnd,
    });
  }

  const rotateOptHandler = () => {
    const delta = 16.666;
    circles.forEach((circle) => {
      circle.angle += circle.speed * delta;

      circle.segments.forEach((segment: Matter.Body, index: number) => {
        let segIndex = 0;
        for (let j = 0; j < 12; j++) {
          const angle = (j / 12) * Math.PI * 2;
          const inLeftGap = angle >= circle.leftGapStart && angle <= circle.leftGapEnd;
          const inRightGap =
            (angle >= circle.rightGapStart && angle <= circle.rightGapEnd) ||
            angle >= Math.PI * 2 - (circle.leftGapEnd - circle.leftGapStart);

          if (!inLeftGap && !inRightGap) {
            if (segIndex === index) {
              const nextAngle = ((j + 1) / 12) * Math.PI * 2;
              const midAngle = (angle + nextAngle) / 2 + circle.angle;

              const segX = circle.x + Math.cos(midAngle) * circle.radius;
              const segY = circle.y + Math.sin(midAngle) * circle.radius;

              Body.setPosition(segment, { x: segX, y: segY });
              Body.setAngle(segment, midAngle + Math.PI / 2);
              break;
            }
            segIndex++;
          }
        }
      });
    });
  };

  Events.on(engine, 'beforeUpdate', rotateOptHandler);

  return {
    type: 'rotatingCircles',
    bodies: circles.flatMap((c: any) => c.segments),
    cleanup: () => {
      Events.off(engine, 'beforeUpdate', rotateOptHandler);
      const allSegments = circles.flatMap((c: any) => c.segments);
      World.remove(engine.world, allSegments);
    },
    renderCustom: (ctx: CanvasRenderingContext2D) => {
      circles.forEach((circle: any) => {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      });
    },
  };
}

/**
 * Create anti-jam detection system
 */
export function createAntiJamSystem(engine: Matter.Engine): { cleanup: () => void } {
  const { Events, Body } = Matter;

  const ballVelocities = new Map<number, { x: number; y: number; time: number }>();
  const JAM_THRESHOLD = 2000; // 2 seconds without movement = jam
  const MIN_VELOCITY = 0.5; // Minimum velocity to consider "moving"

  const checkInterval = setInterval(() => {
    const balls = engine.world.bodies.filter(
      (b) => !b.isStatic && b.circleRadius && b.label.startsWith('ball')
    );

    balls.forEach((ball) => {
      const velocity = Math.sqrt(ball.velocity.x ** 2 + ball.velocity.y ** 2);
      const now = Date.now();

      if (velocity < MIN_VELOCITY) {
        // Ball is stuck
        const lastMovement = ballVelocities.get(ball.id);
        if (!lastMovement) {
          ballVelocities.set(ball.id, { x: ball.position.x, y: ball.position.y, time: now });
        } else {
          const timeSinceMovement = now - lastMovement.time;
          if (timeSinceMovement > JAM_THRESHOLD) {
            // Apply downward force to un-jam
            Body.applyForce(ball, ball.position, {
              x: (Math.random() - 0.5) * 0.005,
              y: 0.01,
            });
            ballVelocities.delete(ball.id);
          }
        }
      } else {
        // Ball is moving, update last movement
        ballVelocities.set(ball.id, { x: ball.position.x, y: ball.position.y, time: now });
      }
    });
  }, 500);

  return {
    cleanup: () => {
      clearInterval(checkInterval);
      ballVelocities.clear();
    },
  };
}
