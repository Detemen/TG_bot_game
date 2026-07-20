// Obstacle implementations for Marble Race
// Converted from ball_game/src/obstacles.js to TypeScript

import Matter from 'matter-js';
import { Obstacle, ObstacleParams } from './types';

/**
 * Create Plinko Grid - Classic plinko pegs in checkerboard pattern
 */
export function createPlinkoGrid(
  engine: Matter.Engine,
  params: ObstacleParams & { rows?: number; cols?: number }
): Obstacle {
  const { x, y, width, height, rows = 6, cols = 6 } = params;
  const { Bodies, World } = Matter;

  const pegs: Matter.Body[] = [];
  const pegRadius = 6;
  const stepY = height / (rows + 1);
  const stepX = width / (cols + 1);

  for (let row = 1; row <= rows; row++) {
    for (let col = 1; col <= cols; col++) {
      const offset = (row % 2) * (stepX / 2); // Checkerboard offset
      const pegX = x + col * stepX + offset;
      const pegY = y + row * stepY;

      if (pegX - pegRadius < x || pegX + pegRadius > x + width) {
        continue;
      }

      const peg = Bodies.circle(pegX, pegY, pegRadius, {
        isStatic: true,
        label: 'peg',
        restitution: 0.8,
        render: {
          fillStyle: '#3b82f6',
        },
      });

      pegs.push(peg);
    }
  }

  World.add(engine.world, pegs);

  return {
    type: 'plinkoGrid',
    bodies: pegs,
    cleanup: () => {
      World.remove(engine.world, pegs);
    },
  };
}

/**
 * Create Moving Bar - Horizontal oscillating platform
 */
export function createMovingBar(
  engine: Matter.Engine,
  params: ObstacleParams & { amplitude?: number; period?: number }
): Obstacle {
  const { x, y, width, height, amplitude = 80, period = 3 } = params;
  const { Bodies, World, Body } = Matter;

  const bar = Bodies.rectangle(x + width / 2, y + height / 2, width * 0.5, 15, {
    isStatic: true,
    label: 'movingBar',
    restitution: 0.9,
    render: {
      fillStyle: '#f59e0b',
    },
  });

  World.add(engine.world, bar);

  const centerX = bar.position.x;
  let time = 0;

  return {
    type: 'movingBar',
    bodies: [bar],
    cleanup: () => {
      World.remove(engine.world, bar);
    },
    update: (totalTime: number, delta: number) => {
      time += delta;
      const phase = Math.sin((time / period) * Math.PI * 2);
      const targetX = centerX + amplitude * phase;
      Body.setPosition(bar, { x: targetX, y: bar.position.y });
    },
  };
}

/**
 * Leaderboard entry for finish tracking
 */
export interface FinishEntry {
  ballIndex: number;
  label: string;
  color: string;
  time: number;
}

/**
 * Create Finish Line - First ball to cross wins
 * IMPORTANT: passes ball INDEX (from label "ball_N") not Matter.js body.id
 */
export function createFinishLine(
  engine: Matter.Engine,
  params: ObstacleParams & {
    onFinish?: (ballIndex: number, time: number) => void;
    onLeaderboardUpdate?: (entries: FinishEntry[]) => void;
    startTime?: number;
  }
): Obstacle {
  const { x, y, width, onFinish, onLeaderboardUpdate, startTime = performance.now() } = params;
  const { Bodies, World, Events } = Matter;

  const finishedBalls = new Set<number>(); // tracks body.id to prevent duplicates
  const leaderboard: FinishEntry[] = [];

  // Sensor spans full width, 4px tall for reliable detection
  const finishSensor = Bodies.rectangle(x + width / 2, y, width, 4, {
    isStatic: true,
    isSensor: true,
    label: 'finishLine',
    render: {
      fillStyle: '#22c55e',
      strokeStyle: '#86efac',
      lineWidth: 2,
    },
  });

  World.add(engine.world, finishSensor);

  const handler = (event: Matter.IEventCollision<Matter.Engine>) => {
    for (const pair of event.pairs) {
      const { bodyA, bodyB } = pair;
      const ball = bodyA.label === 'finishLine' ? bodyB : bodyA;
      const sensor = bodyA.label === 'finishLine' ? bodyA : bodyB;

      if (sensor.label !== 'finishLine' || ball.isStatic || finishedBalls.has(ball.id)) continue;
      if (!ball.label?.startsWith('ball_')) continue;

      // Parse ball index from label "ball_0", "ball_1", etc.
      const ballIndex = parseInt(ball.label.split('_')[1], 10);
      if (isNaN(ballIndex)) continue;

      finishedBalls.add(ball.id);

      const elapsed = (performance.now() - startTime) / 1000;
      const color = (ball.render as any).fillStyle || '#ffffff';

      leaderboard.push({
        ballIndex,
        label: ball.label,
        color,
        time: elapsed,
      });

      // First ball = winner
      if (leaderboard.length === 1) {
        onFinish?.(ballIndex, elapsed);
      }

      onLeaderboardUpdate?.([...leaderboard]);
    }
  };

  Events.on(engine, 'collisionStart', handler);

  return {
    type: 'finishLine',
    bodies: [finishSensor],
    cleanup: () => {
      Events.off(engine, 'collisionStart', handler);
      World.remove(engine.world, finishSensor);
    },
    renderCustom: (ctx: CanvasRenderingContext2D) => {
      ctx.save();

      // Checkered pattern
      const squareSize = 20;
      for (let i = 0; i < width / squareSize; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#000000';
        ctx.fillRect(x + i * squareSize, y - 5, squareSize, 10);
      }

      // "FINISH" text
      ctx.font = 'bold 16px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#22c55e';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.strokeText('FINISH', x + width / 2, y - 20);
      ctx.fillText('FINISH', x + width / 2, y - 20);

      ctx.restore();
    },
  };
}

/**
 * Create Funnel - V-shaped funnel to guide balls
 */
export function createFunnel(engine: Matter.Engine, params: ObstacleParams): Obstacle {
  const { x, y, width, height } = params;
  const { Bodies, World } = Matter;

  const thickness = 8;
  const bottomGap = 80;

  // Left side of funnel
  const leftAngle = Math.atan2(height, (width - bottomGap) / 2);
  const leftLength = Math.sqrt(height * height + ((width - bottomGap) / 2) ** 2);

  const leftWall = Bodies.rectangle(
    x + (width - bottomGap) / 4,
    y + height / 2,
    leftLength,
    thickness,
    {
      isStatic: true,
      angle: -leftAngle,
      label: 'funnelWall',
      restitution: 0.5,
      render: {
        fillStyle: '#8b5cf6',
      },
    }
  );

  // Right side of funnel
  const rightWall = Bodies.rectangle(
    x + width - (width - bottomGap) / 4,
    y + height / 2,
    leftLength,
    thickness,
    {
      isStatic: true,
      angle: leftAngle,
      label: 'funnelWall',
      restitution: 0.5,
      render: {
        fillStyle: '#8b5cf6',
      },
    }
  );

  const bodies = [leftWall, rightWall];
  World.add(engine.world, bodies);

  return {
    type: 'funnel',
    bodies,
    cleanup: () => {
      World.remove(engine.world, bodies);
    },
  };
}

/**
 * Create Brick Wall - Brick wall with HP system
 */
export function createBrickWall(
  engine: Matter.Engine,
  params: ObstacleParams & { rows?: number }
): Obstacle {
  const { x, y, width, height, rows = 3 } = params;
  const { Bodies, World, Events, Body } = Matter;

  const brickWidth = 40;
  const brickHeight = 20;
  const cols = Math.floor(width / brickWidth);

  const bricks: Matter.Body[] = [];
  const brickData = new Map<number, { hp: number; maxHp: number }>();

  for (let row = 0; row < rows; row++) {
    const offsetX = (row % 2) * (brickWidth / 2);
    const brickY = y + row * brickHeight;

    for (let col = 0; col < cols; col++) {
      const brickX = x + offsetX + col * brickWidth + brickWidth / 2;

      if (brickX - brickWidth / 2 < x || brickX + brickWidth / 2 > x + width) {
        continue;
      }

      const brick = Bodies.rectangle(brickX, brickY, brickWidth - 2, brickHeight - 2, {
        isStatic: true,
        label: 'brick',
        restitution: 1.2,
        friction: 0.05,
        frictionStatic: 0.05,
        render: {
          fillStyle: '#ff3333',
        },
      });

      bricks.push(brick);
      brickData.set(brick.id, { hp: 3, maxHp: 3 });
    }
  }

  World.add(engine.world, bricks);

  const brickHandler = (event: Matter.IEventCollision<Matter.Engine>) => {
    event.pairs.forEach((pair) => {
      const { bodyA, bodyB } = pair;
      const brick = bodyA.label === 'brick' ? bodyA : bodyB.label === 'brick' ? bodyB : null;
      const ball = bodyA.label !== 'brick' ? bodyA : bodyB;

      if (brick && brickData.has(brick.id) && !ball.isStatic) {
        const data = brickData.get(brick.id)!;
        data.hp -= 1;

        const dx = ball.position.x - brick.position.x;
        const dy = ball.position.y - brick.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        const nx = dx / dist;
        const ny = dy / dist;

        const minBounceSpeed = 3;
        const currentSpeed = Math.sqrt(ball.velocity.x ** 2 + ball.velocity.y ** 2);

        if (currentSpeed < minBounceSpeed) {
          Body.setVelocity(ball, {
            x: nx * minBounceSpeed,
            y: ny * minBounceSpeed,
          });
        } else {
          Body.applyForce(ball, ball.position, {
            x: nx * 0.004,
            y: ny * 0.004,
          });
        }

        if (data.hp === 2) {
          brick.render.fillStyle = '#ff6b6b';
        } else if (data.hp === 1) {
          brick.render.fillStyle = '#ff9999';
        } else if (data.hp <= 0) {
          brick.render.fillStyle = 'rgba(255, 255, 255, 0.3)';
          setTimeout(() => {
            World.remove(engine.world, brick);
            brickData.delete(brick.id);
          }, 50);
        }
      }
    });
  };

  Events.on(engine, 'collisionStart', brickHandler);

  return {
    type: 'brickWall',
    bodies: bricks,
    cleanup: () => {
      Events.off(engine, 'collisionStart', brickHandler);
      World.remove(engine.world, bricks);
      brickData.clear();
    },
  };
}

/**
 * Create Fans - Invisible wind force with particles
 */
interface Fan {
  x: number;
  y: number;
  force: number;
  radius: number;
  direction: number;
  particles: Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    size: number;
  }>;
}

export function createFans(
  engine: Matter.Engine,
  params: ObstacleParams & { fanCount?: number }
): Obstacle {
  const { x, y, width, height, fanCount = 4 } = params;
  const { Body, Events } = Matter;

  const fans: Fan[] = [];
  const spacing = width / (fanCount + 1);

  for (let i = 0; i < fanCount; i++) {
    const fanX = x + spacing * (i + 1);
    const fanY = y + height / 2;
    const direction = i % 2 === 0 ? 1 : -1;

    fans.push({
      x: fanX,
      y: fanY,
      force: 0.0005 * direction,
      radius: 60,
      direction: direction,
      particles: [],
    });
  }

  const fanHandler = () => {
    const balls = engine.world.bodies.filter(
      (b) => !b.isStatic && b.label?.startsWith('ball_')
    );

    balls.forEach((ball) => {
      fans.forEach((fan) => {
        const dx = ball.position.x - fan.x;
        const dy = ball.position.y - fan.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < fan.radius) {
          Body.applyForce(ball, ball.position, { x: fan.force, y: 0 });
        }
      });
    });

    fans.forEach((fan) => {
      if (Math.random() < 0.3) {
        fan.particles.push({
          x: fan.x + (Math.random() - 0.5) * 20,
          y: fan.y + (Math.random() - 0.5) * fan.radius * 2,
          vx: fan.direction * (2 + Math.random() * 2),
          vy: (Math.random() - 0.5) * 1,
          life: 1.0,
          size: 2 + Math.random() * 3,
        });
      }

      fan.particles = fan.particles.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;
        return p.life > 0 && p.x > x && p.x < x + width;
      });
    });
  };

  Events.on(engine, 'beforeUpdate', fanHandler);

  return {
    type: 'fans',
    bodies: [],
    cleanup: () => {
      Events.off(engine, 'beforeUpdate', fanHandler);
    },
    renderCustom: (ctx: CanvasRenderingContext2D) => {
      fans.forEach((fan) => {
        fan.particles.forEach((p) => {
          ctx.save();
          ctx.globalAlpha = p.life * 0.6;
          ctx.fillStyle = fan.direction > 0 ? '#88ddff' : '#ffaa88';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });

        ctx.save();
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.15)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(fan.x, fan.y, fan.radius, 0, Math.PI * 2);
        ctx.stroke();

        const rotation = (Date.now() * 0.005 * fan.direction) % (Math.PI * 2);
        ctx.translate(fan.x, fan.y);
        ctx.rotate(rotation);
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.4)';
        ctx.lineWidth = 3;
        for (let i = 0; i < 3; i++) {
          const angle = (Math.PI * 2 / 3) * i;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(angle) * 20, Math.sin(angle) * 20);
          ctx.stroke();
        }
        ctx.restore();
      });
    },
  };
}

/**
 * Create Maze - Zigzag horizontal bars
 */
export function createMaze(
  engine: Matter.Engine,
  params: ObstacleParams & { levels?: number }
): Obstacle {
  const { x, y, width, height, levels = 3 } = params;
  const { Bodies, World } = Matter;

  const bars: Matter.Body[] = [];
  const barHeight = 15;
  const barWidth = width * 0.55;
  const levelHeight = height / levels;

  for (let i = 0; i < levels; i++) {
    const barY = y + i * levelHeight + levelHeight / 2;

    const leftBar = Bodies.rectangle(x + barWidth / 2 + 10, barY, barWidth, barHeight, {
      isStatic: true,
      label: 'mazeBar',
      render: { fillStyle: '#44aaff' },
    });

    const rightBar = Bodies.rectangle(
      x + width - barWidth / 2 - 10,
      barY + levelHeight / 2,
      barWidth,
      barHeight,
      {
        isStatic: true,
        label: 'mazeBar',
        render: { fillStyle: '#44aaff' },
      }
    );

    bars.push(leftBar, rightBar);
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
 * Create Rotating Circles - Rotating circular pipes with gaps
 */
interface RotatingCircle {
  x: number;
  y: number;
  radius: number;
  segments: Matter.Body[];
  angle: number;
  direction: number;
  speed: number;
  leftGapStart: number;
  leftGapEnd: number;
  rightGapStart: number;
  rightGapEnd: number;
}

export function createRotatingCircles(
  engine: Matter.Engine,
  params: ObstacleParams & { circleCount?: number }
): Obstacle {
  const { x, y, width, height, circleCount = 2 } = params;
  const { Bodies, World, Body, Events } = Matter;

  const circles: RotatingCircle[] = [];
  const circleRadius = 70;
  const tubeThickness = 8;
  const gapSize = 50;
  const spacing = height / (circleCount + 1);

  for (let i = 0; i < circleCount; i++) {
    const circleY = y + spacing * (i + 1);
    const circleX = x + width / 2;
    const direction = i % 2 === 0 ? -1 : 1;

    const segments: Matter.Body[] = [];
    const segmentCount = 16;
    const gapAngleSize = Math.asin(gapSize / (2 * circleRadius)) * 2;
    const leftGapStart = Math.PI - gapAngleSize / 2;
    const leftGapEnd = Math.PI + gapAngleSize / 2;
    const rightGapStart = -gapAngleSize / 2;
    const rightGapEnd = gapAngleSize / 2;

    for (let j = 0; j < segmentCount; j++) {
      const angle = (j / segmentCount) * Math.PI * 2;
      const nextAngle = ((j + 1) / segmentCount) * Math.PI * 2;

      const isLeftGap = angle >= leftGapStart && angle <= leftGapEnd;
      const isRightGap =
        (angle >= rightGapStart && angle <= rightGapEnd) ||
        angle >= Math.PI * 2 - gapAngleSize / 2;

      if (isLeftGap || isRightGap) {
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
      speed: 0.0006 * direction,
      leftGapStart,
      leftGapEnd,
      rightGapStart,
      rightGapEnd,
    });
  }

  const rotateHandler = () => {
    const delta = 16.666;
    circles.forEach((circle) => {
      circle.angle += circle.speed * delta;

      const segmentCount = 16;

      circle.segments.forEach((segment, index) => {
        let segIndex = 0;
        for (let j = 0; j < segmentCount; j++) {
          const angle = (j / segmentCount) * Math.PI * 2;
          const isLeftGap = angle >= circle.leftGapStart && angle <= circle.leftGapEnd;
          const isRightGap =
            (angle >= circle.rightGapStart && angle <= circle.rightGapEnd) ||
            angle >= Math.PI * 2 - (circle.leftGapEnd - circle.leftGapStart) / 2;

          if (!isLeftGap && !isRightGap) {
            if (segIndex === index) {
              const nextAngle = ((j + 1) / segmentCount) * Math.PI * 2;
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

  Events.on(engine, 'beforeUpdate', rotateHandler);

  return {
    type: 'rotatingCircles',
    bodies: circles.flatMap((c) => c.segments),
    cleanup: () => {
      Events.off(engine, 'beforeUpdate', rotateHandler);
      const allSegments = circles.flatMap((c) => c.segments);
      World.remove(engine.world, allSegments);
    },
    renderCustom: (ctx: CanvasRenderingContext2D) => {
      circles.forEach((circle) => {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
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
