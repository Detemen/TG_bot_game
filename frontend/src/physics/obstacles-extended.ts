// Extended obstacle implementations - ported from ball_game/src/obstacles.js

import Matter from 'matter-js';
import { Obstacle, ObstacleParams } from './types';

/**
 * Create Bumpers - Circular bumpers with high restitution and collision flash
 */
export function createBumpers(
  engine: Matter.Engine,
  params: ObstacleParams & { bumperCount?: number }
): Obstacle {
  const { x, y, width, height, bumperCount = 5 } = params;
  const { Bodies, World, Events, Body } = Matter;

  const bumpers: Matter.Body[] = [];
  const bumperRadius = 15;
  const bumperData = new Map<number, { active: boolean; activeTime: number }>();

  const rows = 2;
  const cols = Math.ceil(bumperCount / rows);
  const spacingX = width / (cols + 1);
  const spacingY = height / (rows + 1);

  let count = 0;
  for (let row = 0; row < rows && count < bumperCount; row++) {
    for (let col = 0; col < cols && count < bumperCount; col++) {
      const bumperX = x + spacingX * (col + 1);
      const bumperY = y + spacingY * (row + 1);

      const bumper = Bodies.circle(bumperX, bumperY, bumperRadius, {
        isStatic: true,
        label: 'bumper',
        restitution: 1.8,
        friction: 0,
        render: { fillStyle: '#ff6b6b' },
      });

      bumpers.push(bumper);
      bumperData.set(bumper.id, { active: false, activeTime: 0 });
      count++;
    }
  }

  World.add(engine.world, bumpers);

  const bumperHandler = (event: Matter.IEventCollision<Matter.Engine>) => {
    event.pairs.forEach((pair) => {
      const { bodyA, bodyB } = pair;
      const bumper =
        bodyA.label === 'bumper' ? bodyA : bodyB.label === 'bumper' ? bodyB : null;
      const ball =
        bodyA.label !== 'bumper' && !bodyA.isStatic
          ? bodyA
          : bodyB.label !== 'bumper' && !bodyB.isStatic
            ? bodyB
            : null;

      if (bumper && ball && bumperData.has(bumper.id)) {
        const data = bumperData.get(bumper.id)!;
        data.active = true;
        data.activeTime = Date.now();

        const dx = ball.position.x - bumper.position.x;
        const dy = ball.position.y - bumper.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const nx = dx / dist;
        const ny = dy / dist;

        Body.applyForce(ball, ball.position, { x: nx * 0.015, y: ny * 0.015 });
      }
    });
  };

  Events.on(engine, 'collisionStart', bumperHandler);

  return {
    type: 'bumpers',
    bodies: bumpers,
    cleanup: () => {
      Events.off(engine, 'collisionStart', bumperHandler);
      World.remove(engine.world, bumpers);
      bumperData.clear();
    },
    renderCustom: (ctx: CanvasRenderingContext2D) => {
      const now = Date.now();
      bumpers.forEach((bumper) => {
        const data = bumperData.get(bumper.id);
        if (!data) return;

        // Flash animation on hit
        if (data.active && now - data.activeTime < 200) {
          const progress = (now - data.activeTime) / 200;
          const scale = 1 + (1 - progress) * 0.5;
          ctx.save();
          ctx.fillStyle = '#ffff00';
          ctx.globalAlpha = 1 - progress;
          ctx.beginPath();
          ctx.arc(bumper.position.x, bumper.position.y, bumperRadius * scale, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else {
          data.active = false;
        }

        // Pulsing glow
        const pulse = Math.sin(now / 200) * 0.1 + 0.9;
        ctx.save();
        ctx.fillStyle = '#ff6b6b';
        ctx.globalAlpha = pulse;
        ctx.beginPath();
        ctx.arc(bumper.position.x, bumper.position.y, bumperRadius + 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    },
  };
}

/**
 * Create Spinner - 4 rotating blades around center
 */
export function createSpinner(
  engine: Matter.Engine,
  params: ObstacleParams & { rotationSpeed?: number }
): Obstacle {
  const { x, y, width, height, rotationSpeed = 0.02 } = params;
  const { Bodies, World, Body, Events } = Matter;

  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const bladeLength = Math.min(width, height) * 0.4;
  const bladeWidth = 8;
  const blades: Matter.Body[] = [];

  for (let i = 0; i < 4; i++) {
    const angle = (Math.PI / 2) * i;
    const blade = Bodies.rectangle(centerX, centerY, bladeLength, bladeWidth, {
      isStatic: true,
      label: 'spinner',
      angle,
      restitution: 0.8,
      render: { fillStyle: '#9b59b6' },
    });
    blades.push(blade);
  }

  const center = Bodies.circle(centerX, centerY, 10, {
    isStatic: true,
    label: 'spinnerCenter',
    render: { fillStyle: '#8e44ad' },
  });

  World.add(engine.world, [...blades, center]);

  let currentAngle = 0;

  const spinnerHandler = () => {
    currentAngle += rotationSpeed;
    blades.forEach((blade, i) => {
      const targetAngle = currentAngle + (Math.PI / 2) * i;
      const bladeX = centerX + Math.cos(targetAngle) * bladeLength / 2;
      const bladeY = centerY + Math.sin(targetAngle) * bladeLength / 2;
      Body.setPosition(blade, { x: bladeX, y: bladeY });
      Body.setAngle(blade, targetAngle);
      Body.setVelocity(blade, { x: 0, y: 0 });
      Body.setAngularVelocity(blade, 0);
    });
  };

  Events.on(engine, 'beforeUpdate', spinnerHandler);

  return {
    type: 'spinner',
    bodies: [...blades, center],
    cleanup: () => {
      Events.off(engine, 'beforeUpdate', spinnerHandler);
      World.remove(engine.world, [...blades, center]);
    },
  };
}

/**
 * Create Gravity Zone - Invisible zone that applies extra gravity force
 */
export function createGravityZone(
  engine: Matter.Engine,
  params: ObstacleParams & { gravityMultiplier?: number }
): Obstacle {
  const { x, y, width, height, gravityMultiplier = 2 } = params;
  const { Events, Body } = Matter;

  const gravityHandler = () => {
    const balls = engine.world.bodies.filter(
      (b) => !b.isStatic && b.label?.startsWith('ball_')
    );

    balls.forEach((ball) => {
      const inZone =
        ball.position.x > x &&
        ball.position.x < x + width &&
        ball.position.y > y &&
        ball.position.y < y + height;

      if (inZone) {
        const extraGravity = engine.gravity.y * (gravityMultiplier - 1) * ball.mass;
        Body.applyForce(ball, ball.position, { x: 0, y: extraGravity * 0.001 });
      }
    });
  };

  Events.on(engine, 'beforeUpdate', gravityHandler);

  return {
    type: 'gravityZone',
    bodies: [],
    cleanup: () => {
      Events.off(engine, 'beforeUpdate', gravityHandler);
    },
    renderCustom: (ctx: CanvasRenderingContext2D) => {
      ctx.save();

      // Animated arrows showing gravity direction
      const arrows = 4;
      const arrowSpacing = height / (arrows + 1);
      for (let i = 1; i <= arrows; i++) {
        const arrowY = y + arrowSpacing * i;
        const alpha = Math.sin(Date.now() / 300 + i) * 0.3 + 0.5;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = gravityMultiplier > 1 ? '#e74c3c' : '#3498db';
        const direction = gravityMultiplier > 1 ? 1 : -1;
        ctx.beginPath();
        ctx.moveTo(x + width / 2, arrowY);
        ctx.lineTo(x + width / 2 - 8, arrowY - 10 * direction);
        ctx.lineTo(x + width / 2 + 8, arrowY - 10 * direction);
        ctx.closePath();
        ctx.fill();
      }

      // Zone border
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = gravityMultiplier > 1 ? '#e74c3c' : '#3498db';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(x, y, width, height);

      ctx.restore();
    },
  };
}

/**
 * Create Seesaw - Balanced platform on pivot constraint
 */
export function createSeesaw(engine: Matter.Engine, params: ObstacleParams): Obstacle {
  const { x, y, width, height } = params;
  const { Bodies, World, Constraint } = Matter;

  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const platformWidth = width * 0.8;
  const platformHeight = 10;

  const platform = Bodies.rectangle(centerX, centerY, platformWidth, platformHeight, {
    isStatic: false,
    label: 'seesaw',
    density: 0.001,
    friction: 0.8,
    restitution: 0.3,
    render: { fillStyle: '#f39c12' },
  });

  // Triangle support
  const supportHeight = 20;
  const supportVerts = [
    { x: centerX, y: centerY + platformHeight / 2 + 2 },
    { x: centerX - 15, y: centerY + platformHeight / 2 + supportHeight },
    { x: centerX + 15, y: centerY + platformHeight / 2 + supportHeight },
  ];
  const support = Bodies.fromVertices(
    centerX,
    centerY + platformHeight / 2 + supportHeight / 2,
    [supportVerts],
    {
      isStatic: true,
      label: 'seesawSupport',
      render: { fillStyle: '#e67e22' },
    }
  );

  const pivot = Constraint.create({
    bodyA: support,
    bodyB: platform,
    pointA: { x: 0, y: -supportHeight / 2 },
    pointB: { x: 0, y: 0 },
    length: 0,
    stiffness: 1,
  });

  World.add(engine.world, [platform, support, pivot]);

  return {
    type: 'seesaw',
    bodies: [platform, support],
    cleanup: () => {
      World.remove(engine.world, [platform, support, pivot]);
    },
  };
}

/**
 * Create Triangles with Teleports - Triangles + moving green portal + static red portal
 */
export function createTrianglesWithTeleports(
  engine: Matter.Engine,
  params: ObstacleParams & { triangleCount?: number }
): Obstacle {
  const { x, y, width, height, triangleCount = 4 } = params;
  const { Bodies, World, Body, Events } = Matter;

  const triangles: Matter.Body[] = [];
  const triangleSize = 35;
  const spacing = (width - triangleCount * triangleSize) / (triangleCount + 1);

  for (let i = 0; i < triangleCount; i++) {
    const triX = x + spacing + i * (triangleSize + spacing) + triangleSize / 2;
    const triY = y + 60;

    const r = triangleSize / 2;
    const h = r * Math.sqrt(3);
    const verts = [
      { x: triX, y: triY - h / 2 },
      { x: triX + r, y: triY + h / 2 },
      { x: triX - r, y: triY + h / 2 },
    ];

    const triangle = Bodies.fromVertices(triX, triY, [verts], {
      isStatic: true,
      label: 'triangle',
      render: { fillStyle: '#5599ff' },
    }, true);

    triangles.push(triangle);
  }

  // Green portal (moving, below triangles)
  const greenPortalWidth = 48;
  const greenPortalHeight = 8;
  const greenPortalY = y + height - 50;

  const greenPortal = Bodies.rectangle(x + width / 2, greenPortalY, greenPortalWidth, greenPortalHeight, {
    isStatic: true,
    isSensor: true,
    label: 'greenPortal',
    render: { visible: false } as any,
  });

  // Red portal (static, full width, above green)
  const redPortalY = greenPortalY - 80;
  const redPortal = Bodies.rectangle(x + width / 2, redPortalY, width, 8, {
    isStatic: true,
    isSensor: true,
    label: 'redPortal',
    render: { visible: false } as any,
  });

  World.add(engine.world, [redPortal, greenPortal, ...triangles]);

  // Green portal movement
  const portalSpeed = 0.0015;
  const portalAmplitude = (width - greenPortalWidth) / 2;

  const portalMoveHandler = (event: any) => {
    const offsetX = Math.sin(event.timestamp * portalSpeed) * portalAmplitude;
    Body.setPosition(greenPortal, { x: x + width / 2 + offsetX, y: greenPortalY });
  };

  Events.on(engine, 'beforeUpdate', portalMoveHandler);

  // Teleportation on collision with green portal
  const teleportCooldown = new Map<number, number>();

  const teleportHandler = (event: Matter.IEventCollision<Matter.Engine>) => {
    event.pairs.forEach((pair) => {
      const { bodyA, bodyB } = pair;
      const portal =
        bodyA.label === 'greenPortal' ? bodyA : bodyB.label === 'greenPortal' ? bodyB : null;
      const ball =
        bodyA.label === 'greenPortal' ? bodyB : bodyB.label === 'greenPortal' ? bodyA : null;

      if (portal && ball && !ball.isStatic) {
        const now = Date.now();
        const lastTeleport = teleportCooldown.get(ball.id) || 0;

        if (now - lastTeleport > 1000) {
          const angle = Math.random() * Math.PI;
          const speed = 5 + Math.random() * 3;
          const vx = Math.cos(angle) * speed;
          const vy = -Math.sin(angle) * speed;

          Body.setPosition(ball, { x: x + width / 2, y: redPortalY - 30 });
          Body.setVelocity(ball, { x: vx, y: vy });
          teleportCooldown.set(ball.id, now);
        }
      }
    });
  };

  Events.on(engine, 'collisionStart', teleportHandler);

  return {
    type: 'trianglesWithTeleports',
    bodies: [...triangles, greenPortal, redPortal],
    cleanup: () => {
      Events.off(engine, 'beforeUpdate', portalMoveHandler);
      Events.off(engine, 'collisionStart', teleportHandler);
      World.remove(engine.world, [...triangles, greenPortal, redPortal]);
      teleportCooldown.clear();
    },
    renderCustom: (ctx: CanvasRenderingContext2D) => {
      // Red portal
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#ff3366';
      ctx.fillRect(redPortal.position.x - width / 2, redPortal.position.y - 4, width, 8);
      ctx.restore();

      // Green portal
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#00ff88';
      ctx.fillRect(
        greenPortal.position.x - greenPortalWidth / 2,
        greenPortal.position.y - 4,
        greenPortalWidth,
        8
      );
      ctx.restore();
    },
  };
}
