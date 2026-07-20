// src/main.js
// Використовуємо глобальну змінну Matter з index.html
const Matter = window.Matter;

import { generateMap, buildMatterFromMap } from "./src/mapGen.js";

const canvas = document.getElementById('stage');
const W = Number(document.getElementById('w').value);
const H = Number(document.getElementById('h').value);
canvas.width = W; canvas.height = H;

const engine = Matter.Engine.create();
const render = Matter.Render.create({
  canvas, engine,
  options: { width:W, height:H, wireframes:false, background:'#f6f6f6' }
});
Matter.Engine.run(engine);
Matter.Render.run(render);

// стартова мапа
let currentMap = generateMap({
  width: W, height: H,
  count: Number(document.getElementById('count').value),
  seed: seedValue()
});
buildMatterFromMap(Matter, engine, currentMap);

// гравітація
engine.world.gravity.y = 1.1;

function seedValue(){
  const s = document.getElementById('seed').value.trim();
  return s === '' ? null : Number(s);
}

function regen(){
  const width = Number(document.getElementById('w').value)||W;
  const height = Number(document.getElementById('h').value)||H;
  canvas.width = width; canvas.height = height;
  render.options.width = width; render.options.height = height;

  currentMap = generateMap({
    width, height,
    count: Number(document.getElementById('count').value)||6,
    seed: seedValue()
  });
  buildMatterFromMap(Matter, engine, currentMap);
}

// UI
document.getElementById('newMap').addEventListener('click', regen);

document.getElementById('dropBall').addEventListener('click', ()=>{
  const r = 12;
  const b = Matter.Bodies.circle(currentMap.spawn.x, currentMap.spawn.y, r, {
    restitution:0.65, friction:0.1, density:0.002, render:{ fillStyle:'#333' }
  });
  Matter.World.add(engine.world, b);
});

document.getElementById('clearBalls').addEventListener('click', ()=>{
  const nonStatic = engine.world.bodies.filter(b=>!b.isStatic);
  Matter.World.remove(engine.world, nonStatic);
});

canvas.addEventListener('pointerdown', e=>{
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width/rect.width);
  const y = (e.clientY - rect.top) * (canvas.height/rect.height);
  const r = 12;
  const ball = Matter.Bodies.circle(x, y, r, {
    restitution:0.65, friction:0.1, density:0.002, render:{ fillStyle:'#333' }
  });
  Matter.World.add(engine.world, ball);
});
