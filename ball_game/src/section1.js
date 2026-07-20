// Section 1 — 2 осцилюючі балки + 2 кулі + індикатор
const Matter = window.Matter;
const canvas = document.getElementById("stage");
const W = canvas.width, H = canvas.height;

// ---------- Налаштування БАЛОК (міняйте тут) ----------
const BAR = {
  length: 150,          // довжина балки (px)
  thickness: 30,        // товщина балки (px)
  radius: 15,           // скруглення кутів
  y: H * 0.50,          // базова висота шарнірів (px)
  leftPivotBeyond: 10,  // наскільки шарнір ЛІВОЇ за екраном (px)
  rightPivotBeyond: 10, // наскільки шарнір ПРАВОЇ за екраном (px)
  color: "#58afff",     // колір балок
  maxAngleDeg: 40,      // амплітуда коливання (в градусах)
  speed: 0.002,        // швидкість коливання (чим більше — тим швидше)
  phase: 1              // фазовий зсув (раптом треба синхронізувати з іншими елементами)
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

// Межі (щоб кулі не випадали)
const walls = [
  Matter.Bodies.rectangle(W/2, -50, W, 100, { isStatic: true }),
  Matter.Bodies.rectangle(W/2, H+50, W, 100, { isStatic: true }),
  Matter.Bodies.rectangle(-50,  H/2, 100, H, { isStatic: true }),
  Matter.Bodies.rectangle(W+50, H/2, 100, H, { isStatic: true })
];
Matter.World.add(engine.world, walls);

// ----------- Створення балок ----------
const leftPivot  = { x: -BAR.leftPivotBeyond,      y: BAR.y };
const rightPivot = { x:  W + BAR.rightPivotBeyond, y: BAR.y };

const leftBar  = Matter.Bodies.rectangle(0,0, BAR.length, BAR.thickness, {
  isStatic: true, chamfer: { radius: BAR.radius }, render: { fillStyle: BAR.color }
});
const rightBar = Matter.Bodies.rectangle(0,0, BAR.length, BAR.thickness, {
  isStatic: true, chamfer: { radius: BAR.radius }, render: { fillStyle: BAR.color }
});
Matter.World.add(engine.world, [leftBar, rightBar]);

// Допоміжна: розмістити балку, задано шарнір, кут і сторону
function placeBar(body, pivot, angle, side /* 'left' | 'right' */) {
  // вектор від шарніра до центру балки завдовжки length/2
  // LEFT:  v = ( cos,  sin) — балка направлена вправо від шарніра
  // RIGHT: v = (-cos, -sin) — балка направлена вліво від шарніра
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const dirX = side === 'left' ?  cos : -cos;
  const dirY = side === 'left' ?  sin : -sin;
  const cx = pivot.x + dirX * (BAR.length/2);
  const cy = pivot.y + dirY * (BAR.length/2);
  Matter.Body.setPosition(body, { x: cx, y: cy });
  Matter.Body.setAngle(body, angle);
}

// Осциляція: «V → — → ∧ → — → V …»
const MAX = BAR.maxAngleDeg * Math.PI / 180;
Matter.Events.on(engine, "beforeUpdate", (e) => {
  const theta = Math.sin(e.timestamp * BAR.speed + BAR.phase) * MAX;
  placeBar(leftBar,  leftPivot,  -theta, 'left');   // ліва — віддзеркалена
  placeBar(rightBar, rightPivot, +theta, 'right');  // права — симетрична, обертається навколо ПРАВОГО шарніра
});

// ----------- Гравці (2 кулі) -----------
const R = 14;
const p1 = Matter.Bodies.circle(W*0.45, H*0.15, R, { restitution:0.6, friction:0.05, density:0.002, render:{ fillStyle:"#fff" }});
const p2 = Matter.Bodies.circle(W*0.60, H*0.20, R, { restitution:0.6, friction:0.05, density:0.002, render:{ fillStyle:"#fff" }});
Matter.World.add(engine.world, [p1, p2]);

// Жовтий індикатор над нижчою кулею
Matter.Events.on(render, "afterRender", () => {
  const ctx = render.context;
  const lower = p1.position.y > p2.position.y ? p1 : p2;
  const x = lower.position.x, y = lower.position.y - R - 12;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x-10, y+14); ctx.lineTo(x+10, y+14); ctx.closePath();
  ctx.fillStyle = "#ffd633"; ctx.fill();
});

// Клік — підштовхнути найближчу кулю (зручно для тестів)
canvas.addEventListener("pointerdown", (e) => {
  const r = canvas.getBoundingClientRect();
  const x = (e.clientX - r.left) * (canvas.width  / r.width);
  const y = (e.clientY - r.top ) * (canvas.height / r.height);
  const d = (a,b)=>{const dx=a.x-b.x, dy=a.y-b.y; return dx*dx+dy*dy};
  const t = d(p1.position,{x,y}) < d(p2.position,{x,y}) ? p1 : p2;
  const fx=(x-t.position.x)*0.0004, fy=(y-t.position.y)*0.0004;
  Matter.Body.applyForce(t, t.position, { x:fx, y:fy-0.015 });
});
