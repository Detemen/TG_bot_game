// src/obstacles.js
// Модульна система перешкод для Marble Race

// ============================================================
// BRICK WALL - Цегляна стіна з HP системою
// ============================================================
export function createBrickWall(Matter, engine, { x, y, width, height, rows = 3 }) {
  const { Bodies, World, Events, Body } = Matter;
  const brickWidth = 40;
  const brickHeight = 20;
  const cols = Math.floor(width / brickWidth);

  const bricks = [];
  const brickData = new Map(); // Зберігаємо HP кожного кирпича

  for (let row = 0; row < rows; row++) {
    const offsetX = (row % 2) * (brickWidth / 2); // Офсет для цегляної кладки
    const brickY = y + row * brickHeight;

    for (let col = 0; col < cols; col++) {
      const brickX = x + offsetX + col * brickWidth + brickWidth / 2;

      // Пропускаємо кирпичі що виходять за межі
      if (brickX - brickWidth / 2 < x || brickX + brickWidth / 2 > x + width) {
        continue;
      }

      const brick = Bodies.rectangle(brickX, brickY, brickWidth - 2, brickHeight - 2, {
        isStatic: true,
        label: 'brick',
        restitution: 1.2, // Дуже висока пружність (більше 1 = відскакує сильніше)
        friction: 0.05,
        frictionStatic: 0.05,
        render: {
          fillStyle: '#ff3333' // Починаємо з червоного
        }
      });

      bricks.push(brick);
      brickData.set(brick.id, { hp: 3, maxHp: 3 }); // Кожен кирпич має 3 HP
    }
  }

  World.add(engine.world, bricks);

  // Обробник зіткнень
  Events.on(engine, 'collisionStart', (event) => {
    event.pairs.forEach(pair => {
      const { bodyA, bodyB } = pair;
      const brick = bodyA.label === 'brick' ? bodyA : bodyB.label === 'brick' ? bodyB : null;
      const ball = bodyA.label !== 'brick' ? bodyA : bodyB;

      if (brick && brickData.has(brick.id) && !ball.isStatic) {
        const data = brickData.get(brick.id);
        data.hp -= 1;

        // Гарантований відскок: встановлюємо мінімальну швидкість
        const dx = ball.position.x - brick.position.x;
        const dy = ball.position.y - brick.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        // Нормалізований вектор відскоку
        const nx = dx / dist;
        const ny = dy / dist;

        // Мінімальна швидкість відскоку
        const minBounceSpeed = 3;
        const currentSpeed = Math.sqrt(ball.velocity.x ** 2 + ball.velocity.y ** 2);

        // Якщо швидкість мала - примусово встановлюємо мінімальну
        if (currentSpeed < minBounceSpeed) {
          Body.setVelocity(ball, {
            x: nx * minBounceSpeed,
            y: ny * minBounceSpeed
          });
        } else {
          // Додатковий імпульс
          Body.applyForce(ball, ball.position, {
            x: nx * 0.004,
            y: ny * 0.004
          });
        }

        // Оновлюємо колір залежно від HP з плавним переходом
        if (data.hp === 2) {
          brick.render.fillStyle = '#ff6b6b'; // Середній червоний
        } else if (data.hp === 1) {
          brick.render.fillStyle = '#ff9999'; // Світлий червоний
        } else if (data.hp <= 0) {
          // Видаляємо кирпич з невеликою затримкою для ефекту
          brick.render.fillStyle = 'rgba(255, 255, 255, 0.3)';
          setTimeout(() => {
            World.remove(engine.world, brick);
            brickData.delete(brick.id);
          }, 50);
        }
      }
    });
  });

  return {
    type: 'brickWall',
    bodies: bricks,
    data: brickData,
    cleanup: () => {
      World.remove(engine.world, bricks);
      brickData.clear();
    }
  };
}


// ============================================================
// MOVING BAR - Рухома горизонтальна балка
// ============================================================
export function createMovingBar(Matter, engine, { x, y, width, barWidth = 120, barHeight = 20, speed = 0.002, amplitude = null }) {
  const { Bodies, World, Body, Events } = Matter;

  const actualAmplitude = amplitude || (width - barWidth) / 2;
  const centerX = x + width / 2;

  const bar = Bodies.rectangle(centerX, y, barWidth, barHeight, {
    isStatic: true,
    label: 'movingBar',
    chamfer: { radius: 8 },
    restitution: 0.9, // Висока пружність для відскоку
    friction: 0.3,
    render: {
      fillStyle: '#fbbf24'
    }
  });

  World.add(engine.world, bar);

  // Анімація руху
  Events.on(engine, 'beforeUpdate', (event) => {
    const offsetX = Math.sin(event.timestamp * speed) * actualAmplitude;
    Body.setPosition(bar, { x: centerX + offsetX, y: y });
  });

  return {
    type: 'movingBar',
    bodies: [bar],
    cleanup: () => {
      World.remove(engine.world, bar);
    }
  };
}


// ============================================================
// PLINKO GRID - Сітка пегів (класична плінко)
// ============================================================
export function createPlinkoGrid(Matter, engine, { x, y, width, height, rows = 6, cols = 6 }) {
  const { Bodies, World, Events } = Matter;

  const pegs = [];
  const pegData = new Map();
  const pegRadius = 6;
  const stepY = height / (rows + 1);
  const stepX = width / (cols + 1);

  for (let row = 1; row <= rows; row++) {
    for (let col = 1; col <= cols; col++) {
      const offset = (row % 2) * (stepX / 2); // Шахматний порядок
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
          fillStyle: '#3b82f6'
        }
      });

      pegs.push(peg);
      pegData.set(peg.id, { hitTime: 0 });
    }
  }

  World.add(engine.world, pegs);

  // Детекція зіткнень для візуального ефекту
  Events.on(engine, 'collisionStart', (event) => {
    event.pairs.forEach(pair => {
      const { bodyA, bodyB } = pair;
      const peg = bodyA.label === 'peg' ? bodyA : bodyB.label === 'peg' ? bodyB : null;

      if (peg && pegData.has(peg.id)) {
        const data = pegData.get(peg.id);
        data.hitTime = Date.now();
      }
    });
  });

  return {
    type: 'plinkoGrid',
    bodies: pegs,
    cleanup: () => {
      World.remove(engine.world, pegs);
    },
    renderPlinko: (ctx) => {
      const now = Date.now();
      pegs.forEach(peg => {
        const data = pegData.get(peg.id);
        if (!data) return;

        // Підсвічуємо пег при зіткненні
        if (now - data.hitTime < 150) {
          const progress = (now - data.hitTime) / 150;
          ctx.save();
          ctx.fillStyle = '#60a5fa';
          ctx.globalAlpha = 1 - progress;
          ctx.beginPath();
          ctx.arc(peg.position.x, peg.position.y, pegRadius + 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      });
    }
  };
}


// ============================================================
// FANS - Вентилятори (невидима сила з частинками)
// ============================================================
export function createFans(Matter, engine, { x, y, width, height, fanCount = 4 }) {
  const { Body, Events } = Matter;

  const fans = [];
  const spacing = width / (fanCount + 1);

  for (let i = 0; i < fanCount; i++) {
    const fanX = x + spacing * (i + 1);
    const fanY = y + height / 2;
    const direction = (i % 2 === 0) ? 1 : -1; // Чергуємо напрямок

    fans.push({
      x: fanX,
      y: fanY,
      force: 0.0005 * direction,
      radius: 60,
      direction: direction,
      particles: [] // Масив частинок для візуалізації
    });
  }

  // Застосування сили від вентиляторів
  Events.on(engine, 'beforeUpdate', () => {
    const balls = engine.world.bodies.filter(b => !b.isStatic && b.label !== 'brick' && b.label !== 'peg');

    balls.forEach(ball => {
      fans.forEach(fan => {
        const dx = ball.position.x - fan.x;
        const dy = ball.position.y - fan.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < fan.radius) {
          Body.applyForce(ball, ball.position, { x: fan.force, y: 0 });
        }
      });
    });

    // Оновлюємо частинки
    fans.forEach(fan => {
      // Додаємо нові частинки
      if (Math.random() < 0.3) {
        fan.particles.push({
          x: fan.x + (Math.random() - 0.5) * 20,
          y: fan.y + (Math.random() - 0.5) * fan.radius * 2,
          vx: fan.direction * (2 + Math.random() * 2),
          vy: (Math.random() - 0.5) * 1,
          life: 1.0,
          size: 2 + Math.random() * 3
        });
      }

      // Оновлюємо позиції та життя частинок
      fan.particles = fan.particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;
        return p.life > 0 && p.x > x && p.x < x + width;
      });
    });
  });

  return {
    type: 'fans',
    bodies: [],
    fans: fans,
    cleanup: () => {
      // Очищаємо event listeners (Matter.js автоматично це робить)
    },
    // Функція для відображення вентиляторів та частинок
    renderFans: (ctx) => {
      fans.forEach(fan => {
        // Малюємо частинки потоку повітря
        fan.particles.forEach(p => {
          ctx.save();
          ctx.globalAlpha = p.life * 0.6;
          ctx.fillStyle = fan.direction > 0 ? '#88ddff' : '#ffaa88';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });

        // Малюємо зону дії вентилятора (слабкий круг)
        ctx.save();
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.15)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(fan.x, fan.y, fan.radius, 0, Math.PI * 2);
        ctx.stroke();

        // Іконка вентилятора (спіраль)
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
    }
  };
}


// ============================================================
// MAZE - Лабіринт (тільки перешкоди, без вентиляторів)
// ============================================================
export function createMaze(Matter, engine, { x, y, width, height, levels = 3 }) {
  const { Bodies, World } = Matter;

  const bars = [];
  const barHeight = 15;
  const barWidth = width * 0.55;
  const levelHeight = height / levels;

  for (let i = 0; i < levels; i++) {
    const barY = y + i * levelHeight + levelHeight / 2;

    // Лівий та правий бар на кожному рівні (зигзаг)
    const leftBar = Bodies.rectangle(
      x + barWidth / 2 + 10,
      barY,
      barWidth,
      barHeight,
      {
        isStatic: true,
        label: 'mazeBar',
        render: { fillStyle: '#44aaff' }
      }
    );

    const rightBar = Bodies.rectangle(
      x + width - barWidth / 2 - 10,
      barY + levelHeight / 2,
      barWidth,
      barHeight,
      {
        isStatic: true,
        label: 'mazeBar',
        render: { fillStyle: '#44aaff' }
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
    }
  };
}


// ============================================================
// TRIANGLES + TELEPORTS - Трикутники з телепортацією
// ============================================================
export function createTrianglesWithTeleports(Matter, engine, { x, y, width, height }) {
  const { Bodies, World, Body, Events } = Matter;

  const triangles = [];
  const triangleCount = 4;
  const triangleSize = 35;
  const spacing = (width - triangleCount * triangleSize) / (triangleCount + 1);

  // Створюємо трикутники
  for (let i = 0; i < triangleCount; i++) {
    const triX = x + spacing + i * (triangleSize + spacing) + triangleSize / 2;
    const triY = y + 60;

    const r = triangleSize / 2;
    const h = r * Math.sqrt(3);
    const verts = [
      { x: triX, y: triY - h / 2 },
      { x: triX + r, y: triY + h / 2 },
      { x: triX - r, y: triY + h / 2 }
    ];

    const triangle = Bodies.fromVertices(triX, triY, [verts], {
      isStatic: true,
      label: 'triangle',
      render: { fillStyle: '#5599ff' }
    }, true);

    triangles.push(triangle);
  }

  // Зелений портал (рухомий, внизу під трикутниками)
  const ballRadius = 12;
  const greenPortalWidth = ballRadius * 4;
  const greenPortalHeight = 8; // Тонший
  const greenPortalY = y + height - 50;

  const greenPortal = Bodies.rectangle(x + width / 2, greenPortalY, greenPortalWidth, greenPortalHeight, {
    isStatic: true,
    isSensor: true,
    label: 'greenPortal',
    render: {
      visible: false // Приховуємо від стандартного рендеру
    }
  });

  // Червоний портал (статичний, на всю ширину, НАД зеленим але ПІД трикутниками)
  const redPortalY = greenPortalY - 80;
  const redPortal = Bodies.rectangle(x + width / 2, redPortalY, width, 8, {
    isStatic: true,
    isSensor: true,
    label: 'redPortal',
    render: {
      visible: false // Приховуємо від стандартного рендеру
    }
  });

  // Додаємо в правильному порядку: червоний → зелений → трикутники
  // Це забезпечує що трикутники будуть зверху візуально
  World.add(engine.world, redPortal);
  World.add(engine.world, greenPortal);
  World.add(engine.world, triangles);

  // Рух зеленого порталу
  const portalSpeed = 0.0015;
  const portalAmplitude = (width - greenPortalWidth) / 2;

  Events.on(engine, 'beforeUpdate', (event) => {
    const offsetX = Math.sin(event.timestamp * portalSpeed) * portalAmplitude;
    Body.setPosition(greenPortal, {
      x: x + width / 2 + offsetX,
      y: greenPortalY
    });
  });

  // Телепортація
  const teleportCooldown = new Map(); // Запобігаємо множинній телепортації

  Events.on(engine, 'collisionStart', (event) => {
    event.pairs.forEach(pair => {
      const { bodyA, bodyB } = pair;
      const portal = bodyA.label === 'greenPortal' ? bodyA : bodyB.label === 'greenPortal' ? bodyB : null;
      const ball = bodyA.label === 'greenPortal' ? bodyB : bodyB.label === 'greenPortal' ? bodyA : null;

      if (portal && ball && !ball.isStatic) {
        const now = Date.now();
        const lastTeleport = teleportCooldown.get(ball.id) || 0;

        if (now - lastTeleport > 1000) { // Cooldown 1 секунда
          // Телепортуємо НАД червоним порталом (над трикутниками)
          const angle = Math.random() * Math.PI; // 0 до 180 градусів
          const speed = 5 + Math.random() * 3;
          const vx = Math.cos(angle) * speed;
          const vy = -Math.sin(angle) * speed; // Вгору

          Body.setPosition(ball, {
            x: x + width / 2,
            y: redPortalY - 30
          });

          Body.setVelocity(ball, { x: vx, y: vy });

          teleportCooldown.set(ball.id, now);
        }
      }
    });
  });

  return {
    type: 'trianglesWithTeleports',
    bodies: [...triangles, greenPortal, redPortal],
    greenPortal,
    redPortal,
    cleanup: () => {
      World.remove(engine.world, [...triangles, greenPortal, redPortal]);
      teleportCooldown.clear();
    },
    // Custom рендер для правильного порядку
    renderPortals: (ctx) => {
      // Малюємо червоний портал
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#ff3366';
      ctx.fillRect(
        redPortal.position.x - width / 2,
        redPortal.position.y - 4,
        width,
        8
      );
      ctx.restore();

      // Малюємо зелений портал
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
    }
  };
}


// ============================================================
// ROTATING CIRCLES - Обертаючі кругові труби (як на фото)
// ============================================================
export function createRotatingCircles(Matter, engine, { x, y, width, height, circleCount = 2 }) {
  const { Bodies, World, Body, Events } = Matter;

  const circles = [];
  const circleRadius = 70;
  const tubeThickness = 8;
  const gapSize = 50; // Розмір отворів (ширина)
  const spacing = height / (circleCount + 1);

  for (let i = 0; i < circleCount; i++) {
    const circleY = y + spacing * (i + 1);
    const circleX = x + width / 2;
    const direction = i % 2 === 0 ? -1 : 1; // Лівий проти, правий за годинниковою

    // Створюємо круг з дугових сегментів з отворами зліва і справа
    const segments = [];
    const segmentCount = 16; // Кількість сегментів для плавності
    const gapAngleSize = Math.asin(gapSize / (2 * circleRadius)) * 2; // Кут отвору
    const leftGapStart = Math.PI - gapAngleSize / 2;
    const leftGapEnd = Math.PI + gapAngleSize / 2;
    const rightGapStart = -gapAngleSize / 2;
    const rightGapEnd = gapAngleSize / 2;

    for (let j = 0; j < segmentCount; j++) {
      const angle = (j / segmentCount) * Math.PI * 2;
      const nextAngle = ((j + 1) / segmentCount) * Math.PI * 2;

      // Пропускаємо сегменти в місцях отворів
      const isLeftGap = angle >= leftGapStart && angle <= leftGapEnd;
      const isRightGap = (angle >= rightGapStart && angle <= rightGapEnd) || angle >= (Math.PI * 2 - gapAngleSize / 2);

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
          fillStyle: direction === 1 ? '#55dd99' : '#dd9955'
        }
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
      rightGapEnd
    });
  }

  // Обертання
  Events.on(engine, 'beforeUpdate', (event) => {
    circles.forEach(circle => {
      circle.angle += circle.speed * event.delta;

      const segmentCount = 16;
      const angleStep = (Math.PI * 2) / segmentCount;

      circle.segments.forEach((segment, index) => {
        // Знаходимо початковий кут сегмента
        let segIndex = 0;
        for (let j = 0; j < segmentCount; j++) {
          const angle = (j / segmentCount) * Math.PI * 2;
          const isLeftGap = angle >= circle.leftGapStart && angle <= circle.leftGapEnd;
          const isRightGap = (angle >= circle.rightGapStart && angle <= circle.rightGapEnd) || angle >= (Math.PI * 2 - (circle.leftGapEnd - circle.leftGapStart) / 2);

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
  });

  return {
    type: 'rotatingCircles',
    bodies: circles.flatMap(c => c.segments),
    circles: circles,
    cleanup: () => {
      const allSegments = circles.flatMap(c => c.segments);
      World.remove(engine.world, allSegments);
    },
    // Функція для відображення контурів кіл
    renderCircles: (ctx) => {
      circles.forEach(circle => {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      });
    }
  };
}


// ============================================================
// V-FUNNEL - Воронка для фінішу
// ============================================================
export function createVFunnel(Matter, engine, { x, y, width, height }) {
  const { Bodies, World, Vertices } = Matter;

  const topWidth = width - 40;
  const bottomGap = 80; // Прохід знизу
  const wallThickness = 15;

  // Координати для лівої стінки (трапеція)
  const leftVertices = [
    { x: x + 20, y: y }, // Верхній лівий
    { x: x + 20 + wallThickness, y: y }, // Верхній правий
    { x: x + width / 2 - bottomGap / 2, y: y + height }, // Нижній правий
    { x: x + width / 2 - bottomGap / 2 - wallThickness, y: y + height } // Нижній лівий
  ];

  // Координати для правої стінки (трапеція)
  const rightVertices = [
    { x: x + width - 20 - wallThickness, y: y }, // Верхній лівий
    { x: x + width - 20, y: y }, // Верхній правий
    { x: x + width / 2 + bottomGap / 2 + wallThickness, y: y + height }, // Нижній правий
    { x: x + width / 2 + bottomGap / 2, y: y + height } // Нижній лівий
  ];

  const leftWall = Bodies.fromVertices(
    x + width / 4,
    y + height / 2,
    [leftVertices],
    {
      isStatic: true,
      render: { fillStyle: '#6699ff' }
    },
    true
  );

  const rightWall = Bodies.fromVertices(
    x + width * 3 / 4,
    y + height / 2,
    [rightVertices],
    {
      isStatic: true,
      render: { fillStyle: '#6699ff' }
    },
    true
  );

  World.add(engine.world, [leftWall, rightWall]);

  return {
    type: 'vFunnel',
    bodies: [leftWall, rightWall],
    cleanup: () => {
      World.remove(engine.world, [leftWall, rightWall]);
    }
  };
}


// ============================================================
// FINISH ZONE - Фінішна зона з детекцією переможця
// ============================================================
export function createFinishZone(Matter, engine, { x, y, width, height, onFinish }) {
  const { Bodies, World, Events } = Matter;

  const finishY = y + height - 60;
  const walls = [];

  // Ліва стінка
  const leftWall = Bodies.rectangle(x, finishY + 30, 3, 60, {
    isStatic: true,
    render: { fillStyle: '#ffd700' }
  });
  walls.push(leftWall);

  // Права стінка
  const rightWall = Bodies.rectangle(x + width, finishY + 30, 3, 60, {
    isStatic: true,
    render: { fillStyle: '#ffd700' }
  });
  walls.push(rightWall);

  // Нижня база
  const base = Bodies.rectangle(x + width / 2, finishY + 65, width, 10, {
    isStatic: true,
    render: { fillStyle: '#ffd700' }
  });
  walls.push(base);

  World.add(engine.world, walls);

  // Один слот для переможця
  const finishZone = {
    x: x + width / 2,
    y: finishY + 30,
    width: width,
    height: 60
  };

  let winner = null; // Тільки один переможець!

  // Детекція фінішу - тільки перша кулька виграє!
  Events.on(engine, 'beforeUpdate', () => {
    if (winner) return; // Вже є переможець

    const balls = engine.world.bodies.filter(b =>
      !b.isStatic &&
      b.label !== 'brick' &&
      b.label !== 'peg' &&
      b.label !== 'mazeBar'
    );

    balls.forEach(ball => {
      if (ball.position.y >= finishY && !winner) {
        // Перша кулька що досягла фінішу - ПЕРЕМОЖЕЦЬ!
        winner = ball.id;

        if (onFinish) {
          onFinish({
            ballId: ball.id,
            color: ball.render.fillStyle,
            x: ball.position.x,
            y: ball.position.y,
            isWinner: true
          });
        }

        // Зупиняємо кульку-переможця
        Matter.Body.setVelocity(ball, { x: 0, y: 0 });
        Matter.Body.setStatic(ball, true);
      }
    });
  });

  return {
    type: 'finishZone',
    bodies: walls,
    finishZone: finishZone,
    winner: winner,
    cleanup: () => {
      World.remove(engine.world, walls);
      winner = null;
    },
    // Функція для відображення фінішу
    renderFinish: (ctx) => {
      ctx.save();

      // Фон фінішної зони (золотий)
      ctx.fillStyle = '#ffd700';
      ctx.globalAlpha = 0.2;
      ctx.fillRect(finishZone.x - finishZone.width / 2, finishZone.y - 30, finishZone.width, 60);

      // Текст "FINISH"
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 28px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('FINISH', finishZone.x, finishZone.y);

      // Якщо є переможець, показуємо
      if (winner) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px Arial';
        ctx.fillText('🏆 ПЕРЕМОЖЕЦЬ!', finishZone.x, finishZone.y - 25);
      }

      ctx.restore();
    }
  };
}


// ============================================================
// BUMPERS - Пружні бампери що відштовхують кульки
// ============================================================
export function createBumpers(Matter, engine, { x, y, width, height, bumperCount = 5 }) {
  const { Bodies, World, Events, Body } = Matter;
  const bumpers = [];
  const bumperRadius = 15;
  const bumperData = new Map();

  // Розміщуємо бампери в шаховому порядку
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
        restitution: 1.8, // Дуже пружний!
        friction: 0,
        render: {
          fillStyle: '#ff6b6b'
        }
      });

      bumpers.push(bumper);
      bumperData.set(bumper.id, { active: false, activeTime: 0 });
      count++;
    }
  }

  World.add(engine.world, bumpers);

  // Обробник зіткнень - активація бампера
  Events.on(engine, 'collisionStart', (event) => {
    event.pairs.forEach(pair => {
      const { bodyA, bodyB } = pair;
      const bumper = bodyA.label === 'bumper' ? bodyA : bodyB.label === 'bumper' ? bodyB : null;
      const ball = bodyA.label !== 'bumper' && !bodyA.isStatic ? bodyA :
                   bodyB.label !== 'bumper' && !bodyB.isStatic ? bodyB : null;

      if (bumper && ball && bumperData.has(bumper.id)) {
        const data = bumperData.get(bumper.id);
        data.active = true;
        data.activeTime = Date.now();

        // Сильний відштовх від центру бампера
        const dx = ball.position.x - bumper.position.x;
        const dy = ball.position.y - bumper.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const nx = dx / dist;
        const ny = dy / dist;

        Body.applyForce(ball, ball.position, {
          x: nx * 0.015,
          y: ny * 0.015
        });
      }
    });
  });

  return {
    type: 'bumpers',
    bodies: bumpers,
    cleanup: () => World.remove(engine.world, bumpers),
    renderBumpers: (ctx) => {
      const now = Date.now();
      bumpers.forEach(bumper => {
        const data = bumperData.get(bumper.id);
        if (!data) return;

        // Анімація при активації
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

        // Пульсуючий ефект
        const pulse = Math.sin(now / 200) * 0.1 + 0.9;
        ctx.save();
        ctx.fillStyle = '#ff6b6b';
        ctx.globalAlpha = pulse;
        ctx.beginPath();
        ctx.arc(bumper.position.x, bumper.position.y, bumperRadius + 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }
  };
}

// ============================================================
// SPINNER - Обертова перешкода з лопатями
// ============================================================
export function createSpinner(Matter, engine, { x, y, width, height }) {
  const { Bodies, World, Body } = Matter;
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const bladeLength = Math.min(width, height) * 0.4;
  const bladeWidth = 8;
  const blades = [];

  // Створюємо 4 лопаті
  for (let i = 0; i < 4; i++) {
    const angle = (Math.PI / 2) * i;
    const bladeX = centerX + Math.cos(angle) * bladeLength / 2;
    const bladeY = centerY + Math.sin(angle) * bladeLength / 2;

    const blade = Bodies.rectangle(bladeX, bladeY, bladeLength, bladeWidth, {
      isStatic: false,
      label: 'spinner',
      angle: angle,
      density: 0.001,
      friction: 0.1,
      restitution: 0.8,
      render: {
        fillStyle: '#9b59b6'
      }
    });

    // Фіксуємо лопать в центрі
    Body.setPosition(blade, { x: centerX, y: centerY });
    Body.setAngle(blade, angle);

    blades.push(blade);
  }

  // Центральна вісь
  const center = Bodies.circle(centerX, centerY, 10, {
    isStatic: true,
    render: { fillStyle: '#8e44ad' }
  });

  World.add(engine.world, [...blades, center]);

  let currentAngle = 0;
  const rotationSpeed = 0.02;

  // Обертання
  Events.on(engine, 'beforeUpdate', () => {
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
  });

  return {
    type: 'spinner',
    bodies: [...blades, center],
    cleanup: () => World.remove(engine.world, [...blades, center])
  };
}

// ============================================================
// GRAVITY ZONE - Зона зі зміненою гравітацією
// ============================================================
export function createGravityZone(Matter, engine, { x, y, width, height, gravityMultiplier = 2 }) {
  const { Bodies, World, Events, Body } = Matter;

  // Невидимі стінки для визначення зони
  const zone = {
    x: x + width / 2,
    y: y + height / 2,
    width: width,
    height: height,
    gravityMultiplier: gravityMultiplier
  };

  const walls = [];

  // Обробник гравітації
  Events.on(engine, 'beforeUpdate', () => {
    const balls = engine.world.bodies.filter(b =>
      !b.isStatic &&
      b.label !== 'brick' &&
      b.label !== 'spinner'
    );

    balls.forEach(ball => {
      // Перевіряємо чи кулька в зоні
      const inZone =
        ball.position.x > x &&
        ball.position.x < x + width &&
        ball.position.y > y &&
        ball.position.y < y + height;

      if (inZone) {
        // Застосовуємо додаткову гравітацію
        const extraGravity = engine.world.gravity.y * (gravityMultiplier - 1) * ball.mass;
        Body.applyForce(ball, ball.position, {
          x: 0,
          y: extraGravity * 0.001
        });
      }
    });
  });

  return {
    type: 'gravityZone',
    bodies: walls,
    zone: zone,
    cleanup: () => {}, // Нічого не треба видаляти
    renderGravityZone: (ctx) => {
      ctx.save();

      // Напрямок гравітації
      const arrows = 4;
      const arrowSpacing = height / (arrows + 1);

      for (let i = 1; i <= arrows; i++) {
        const arrowY = y + arrowSpacing * i;
        const alpha = Math.sin(Date.now() / 300 + i) * 0.3 + 0.5;

        ctx.globalAlpha = alpha;
        ctx.fillStyle = gravityMultiplier > 1 ? '#e74c3c' : '#3498db';

        // Стрілка вниз або вгору
        const direction = gravityMultiplier > 1 ? 1 : -1;
        ctx.beginPath();
        ctx.moveTo(x + width / 2, arrowY);
        ctx.lineTo(x + width / 2 - 8, arrowY - 10 * direction);
        ctx.lineTo(x + width / 2 + 8, arrowY - 10 * direction);
        ctx.closePath();
        ctx.fill();
      }

      // Рамка зони
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = gravityMultiplier > 1 ? '#e74c3c' : '#3498db';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(x, y, width, height);

      ctx.restore();
    }
  };
}

// ============================================================
// SEESAW - Гойдалка (балансуюча платформа)
// ============================================================
export function createSeesaw(Matter, engine, { x, y, width, height }) {
  const { Bodies, World, Constraint, Body } = Matter;
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const platformWidth = width * 0.8;
  const platformHeight = 10;

  // Платформа
  const platform = Bodies.rectangle(centerX, centerY, platformWidth, platformHeight, {
    isStatic: false,
    label: 'seesaw',
    density: 0.001,
    friction: 0.8,
    restitution: 0.3,
    render: {
      fillStyle: '#f39c12'
    }
  });

  // Підставка (трикутник)
  const supportHeight = 20;
  const support = Bodies.triangle(centerX, centerY + platformHeight / 2 + supportHeight / 2, 30, supportHeight, {
    isStatic: true,
    render: { fillStyle: '#e67e22' }
  });

  // З'єднання платформи з підставкою
  const pivot = Constraint.create({
    bodyA: support,
    bodyB: platform,
    pointA: { x: 0, y: -supportHeight / 2 },
    pointB: { x: 0, y: 0 },
    length: 0,
    stiffness: 1
  });

  World.add(engine.world, [platform, support, pivot]);

  return {
    type: 'seesaw',
    bodies: [platform, support],
    cleanup: () => {
      World.remove(engine.world, [platform, support, pivot]);
    }
  };
}

// ============================================================
// HELPER: Очистка всіх перешкод
// ============================================================
export function cleanupObstacle(obstacle) {
  if (obstacle && obstacle.cleanup) {
    obstacle.cleanup();
  }
}
