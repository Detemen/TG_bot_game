// Section 2 — Лабіринт з вентиляторами
const Matter = window.Matter;
const canvas = document.getElementById("stage");
const W = canvas.width, H = canvas.height;

// ---------- Налаштування ЛАБІРИНТУ + ВЕНТИЛЯТОРІВ ----------
const CFG = {
  levels: 3,              // кількість рівнів лабіринту
  barWidth: W * 0.55,     // довжина бар
  barHeight: 15,          // товщина бар
  barColor: "#44aaff",    // колір бар
  fanForce: 0.0005,       // сила вентиляторів
  fanRadius: 60,          // радіус дії вентиляторів
  fanBladeLength: 28,     // довжина лопатей
  fanSpeed: 0.008,        // швидкість обертання лопатей
  ballR: 14,              // радіус кулі
  ballColor: "#ffffff",   // колір кулі
  spawnX: W / 2,
  spawnY: 50
};
// -------------------------------------------------------

const engine = Matter.Engine.create();
engine.world.gravity.y = 1.1;

const render = Matter.Render.create({
  canvas, engine,
  options: { width: W, height: H, wireframes: false, background: "#05071a", pixelRatio: devicePixelRatio }
});
Matter.Engine.run(engine);
Matter.Render.run(render);

// Межі
const walls = [
  Matter.Bodies.rectangle(W/2, -50, W, 100, { isStatic: true }),
  Matter.Bodies.rectangle(W/2, H+50, W, 100, { isStatic: true }),
  Matter.Bodies.rectangle(-50,  H/2, 100, H, { isStatic: true }),
  Matter.Bodies.rectangle(W+50, H/2, 100, H, { isStatic: true })
];
Matter.World.add(engine.world, walls);

// ----------- Створення лабіринту ----------
const bars = [];
const fans = [];
const levelHeight = (H - 100) / CFG.levels; // Віднімаємо трохи для зони спавну

for (let i = 0; i < CFG.levels; i++) {
  const baseY = 100 + i * levelHeight;
  const barY = baseY + levelHeight / 3;
  const fanY = baseY + levelHeight / 2;

  // Чергуємо: ліва балка на парних, права на непарних
  if (i % 2 === 0) {
    // Ліва балка
    const leftBar = Matter.Bodies.rectangle(
      CFG.barWidth / 2 + 20,
      barY,
      CFG.barWidth,
      CFG.barHeight,
      {
        isStatic: true,
        chamfer: { radius: 6 },
        render: { fillStyle: CFG.barColor }
      }
    );
    bars.push(leftBar);

    // Вентилятор зліва (дме вправо)
    fans.push({
      x: 40,
      y: fanY,
      force: CFG.fanForce,
      radius: CFG.fanRadius,
      direction: 'right'
    });
  } else {
    // Права балка
    const rightBar = Matter.Bodies.rectangle(
      W - CFG.barWidth / 2 - 20,
      barY,
      CFG.barWidth,
      CFG.barHeight,
      {
        isStatic: true,
        chamfer: { radius: 6 },
        render: { fillStyle: CFG.barColor }
      }
    );
    bars.push(rightBar);

    // Вентилятор справа (дме вліво)
    fans.push({
      x: W - 40,
      y: fanY,
      force: -CFG.fanForce,
      radius: CFG.fanRadius,
      direction: 'left'
    });
  }
}

Matter.World.add(engine.world, bars);

// ----------- Куля -----------
const ball = Matter.Bodies.circle(CFG.spawnX, CFG.spawnY, CFG.ballR, {
  restitution: 0.6, friction: 0.05, density: 0.002,
  render: { fillStyle: CFG.ballColor }
});
Matter.World.add(engine.world, ball);

// ----------- Застосування сили від вентиляторів -----------
Matter.Events.on(engine, 'beforeUpdate', () => {
  fans.forEach(fan => {
    const dx = ball.position.x - fan.x;
    const dy = ball.position.y - fan.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < fan.radius) {
      // Застосовуємо горизонтальну силу
      Matter.Body.applyForce(ball, ball.position, { x: fan.force, y: 0 });
    }
  });
});

// ----------- Відображення вентиляторів -----------
Matter.Events.on(render, 'afterRender', () => {
  const ctx = render.context;

  fans.forEach(fan => {
    ctx.save();
    ctx.translate(fan.x, fan.y);

    // Зона дії вентилятора (напівпрозорий круг)
    ctx.fillStyle = fan.direction === 'right' ? 'rgba(100, 200, 255, 0.08)' : 'rgba(255, 200, 100, 0.08)';
    ctx.beginPath();
    ctx.arc(0, 0, fan.radius, 0, Math.PI * 2);
    ctx.fill();

    // Лопаті вентилятора (обертаються)
    const rotation = (Date.now() * CFG.fanSpeed) % (Math.PI * 2);
    ctx.rotate(rotation);

    ctx.strokeStyle = fan.direction === 'right' ? 'rgba(100, 200, 255, 0.7)' : 'rgba(255, 200, 100, 0.7)';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';

    // 4 лопаті
    for (let i = 0; i < 4; i++) {
      const angle = (Math.PI / 2) * i;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(
        Math.cos(angle) * CFG.fanBladeLength,
        Math.sin(angle) * CFG.fanBladeLength
      );
      ctx.stroke();
    }

    // Центральний круг
    ctx.fillStyle = fan.direction === 'right' ? 'rgba(100, 200, 255, 0.5)' : 'rgba(255, 200, 100, 0.5)';
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Стрілка напрямку вітру
    ctx.save();
    ctx.fillStyle = fan.direction === 'right' ? 'rgba(100, 200, 255, 0.4)' : 'rgba(255, 200, 100, 0.4)';
    const arrowX = fan.x + (fan.direction === 'right' ? 25 : -25);
    const arrowY = fan.y;
    const dir = fan.direction === 'right' ? 1 : -1;

    ctx.beginPath();
    ctx.moveTo(arrowX, arrowY);
    ctx.lineTo(arrowX - dir * 10, arrowY - 8);
    ctx.lineTo(arrowX - dir * 10, arrowY + 8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  });
});

// ----------- Управління -----------
// Клік — підштовхнути кулю
canvas.addEventListener("pointerdown", (e) => {
  const r = canvas.getBoundingClientRect();
  const x = (e.clientX - r.left) * (canvas.width  / r.width);
  const y = (e.clientY - r.top ) * (canvas.height / r.height);
  const fx = (x - ball.position.x) * 0.0004;
  const fy = (y - ball.position.y) * 0.0004;
  Matter.Body.applyForce(ball, ball.position, { x: fx, y: fy - 0.015 });
});

// R — рестарт
window.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() === 'r') {
    Matter.Body.setPosition(ball, { x: CFG.spawnX, y: CFG.spawnY });
    Matter.Body.setVelocity(ball, { x: 0, y: 0 });
    Matter.Body.setAngularVelocity(ball, 0);
  }
});
