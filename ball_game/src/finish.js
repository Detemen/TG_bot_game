// Сцена: нижній блок + 2 ромби. Додає сповіщення "Перемога!".
// Надійний запуск: чекає DOM, підвантажує Matter (за потреби), створює canvas/стилі якщо їх немає.
(function () {
  const MATTER_CDN = 'https://cdn.jsdelivr.net/npm/matter-js@0.19.0/build/matter.min.js';

  // --- Утиліти ---
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }
  function ensureStyle() {
    if (document.getElementById('scene-style')) return;
    const s = document.createElement('style');
    s.id = 'scene-style';
    s.textContent = `
      body{background:#0a0e27}
      .msg{position:fixed;inset:auto 0 24px 0;margin:auto;width:max-content;
        background:#111;color:#fff;font:600 18px/1.2 system-ui;
        padding:10px 16px;border-radius:12px;box-shadow:0 6px 24px rgba(0,0,0,.35);
        opacity:0;transform:translateY(8px);transition:.25s ease;}
      .msg.show{opacity:1;transform:none;}
      canvas#stage{display:block;margin:0 auto;border-radius:14px;box-shadow:0 0 0 1px rgba(255,255,255,.06) inset}
    `;
    document.head.appendChild(s);
  }
  function ensureCanvas() {
    let c = document.getElementById('stage');
    if (!c) {
      c = document.createElement('canvas');
      c.id = 'stage';
      c.width = 390;
      c.height = 700;
      document.body.appendChild(c);
    }
    return c;
  }
  function ensureMsg() {
    let el = document.getElementById('finishMsg');
    if (!el) {
      el = document.createElement('div');
      el.id = 'finishMsg';
      el.className = 'msg';
      el.textContent = 'Перемога!';
      document.body.appendChild(el);
    }
    return el;
  }
  function showWin(text = 'Перемога!') {
    const el = ensureMsg();
    el.textContent = text;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 1600);
  }
  function ensureMatter(cb) {
    if (window.Matter) return cb(window.Matter);
    const s = document.createElement('script');
    s.src = MATTER_CDN;
    s.onload = () => cb(window.Matter);
    s.onerror = () => console.error('Не вдалося завантажити Matter.js з CDN:', MATTER_CDN);
    document.head.appendChild(s);
  }

  // --- Старт ---
  ready(() => {
    ensureStyle();
    const canvas = ensureCanvas();
    ensureMsg();
    ensureMatter(() => start(canvas));
  });

  function start(canvas) {
    const Matter = window.Matter;
    const W = canvas.width, H = canvas.height;

    // ---- Конфіг ---- (ВАШІ розміри - без змін)
    const CFG = {
      rectTopY: 520,
      rectHeight: 180,
      slotWidth: 40,
      rectColor: '#4b4bf9',
      finishStripeH: 18,
      get finishY(){ return this.rectTopY + this.rectHeight * 0.5; },
      rhombColor: '#4b4bf9',
      rhombSize: 300,
      rhombAngle: Math.PI/4,
      rhombLift: 0,
      rhombInset: 238,
      ballR: 12,
      ballColor: '#ffffff',
      spawn: { x: W/2, y: 360 },
    };

    // ---- Двигун / Рендер ----
    const engine = Matter.Engine.create();
    engine.world.gravity.y = 1.06;

    const render = Matter.Render.create({
      canvas, engine,
      options: { width:W, height:H, wireframes:false, background:'#0a0e27', pixelRatio:devicePixelRatio }
    });
    Matter.Engine.run(engine);
    Matter.Render.run(render);

    // ---- Рамки ----
    Matter.World.add(engine.world, [
      Matter.Bodies.rectangle(W/2,H+50, W,100,{isStatic:true}),
      Matter.Bodies.rectangle(-50,H/2,100,H,{isStatic:true}),
      Matter.Bodies.rectangle(W+50,H/2,100,H,{isStatic:true}),
    ]);

    // ---- Нижній блок з прорізом ----
    const top = CFG.rectTopY;
    const h   = CFG.rectHeight;
    const gap = CFG.slotWidth;

    const rectL = Matter.Bodies.rectangle((W/2 - gap/2)/2, top + h/2, (W/2 - gap/2), h, {
      isStatic:true, render:{ fillStyle: CFG.rectColor }
    });
    const rectR = Matter.Bodies.rectangle((W/2 + gap/2 + W)/2, top + h/2, (W/2 - gap/2), h, {
      isStatic:true, render:{ fillStyle: CFG.rectColor }
    });

    // Сенсор фінішу (по смузі, лише в прорізі)
    const finishSensor = Matter.Bodies.rectangle(W/2, CFG.finishY, gap, 2, {
      isStatic:true, isSensor:true, render:{ visible:false }
    });

    Matter.World.add(engine.world, [rectL, rectR, finishSensor]);

    // ---- Два «ромби» як направляючі ----
    const cy = top - CFG.rhombLift;
    const cxL = W/2 - CFG.rhombInset;
    const cxR = W/2 + CFG.rhombInset;

    function makeRhomb(cx, cy, size, angle){
      const body = Matter.Bodies.rectangle(cx, cy, size, size, {
        isStatic: true,
        chamfer: 0,
        render: { fillStyle: CFG.rhombColor }
      });
      Matter.Body.setAngle(body, angle);
      return body;
    }

    const rhL = makeRhomb(cxL, cy, CFG.rhombSize,  Math.PI/4);
    const rhR = makeRhomb(cxR, cy, CFG.rhombSize, -Math.PI/4);

    const nudge = 6; // невеликий зазор до прорізу
    Matter.Body.translate(rhL, { x: +nudge, y: 0 });
    Matter.Body.translate(rhR, { x: -nudge, y: 0 });

    Matter.World.add(engine.world, [rhL, rhR]);

    // ---- Куля ----
    const ball = Matter.Bodies.circle(CFG.spawn.x, CFG.spawn.y, CFG.ballR, {
      restitution: 0.6, friction: 0.05, density: 0.002, render: { fillStyle: CFG.ballColor }
    });
    Matter.World.add(engine.world, ball);

    // ---- Подія фінішу після перетину смуги ----
    let finished = false;

    Matter.Events.on(engine, 'collisionStart', ({ pairs })=>{
      if (finished) return;
      for (const p of pairs){
        if (p.bodyA===finishSensor || p.bodyB===finishSensor){
          const b = p.bodyA===finishSensor ? p.bodyB : p.bodyA;
          if (b === ball){
            finished = true;
            showWin('Перемога!');
            // Невеликий відскок для ефекту
            Matter.Body.setVelocity(ball, { x: ball.velocity.x * 0.95, y: ball.velocity.y * 0.3 });
          }
        }
      }
    });

    // ---- Візуал: нижні блоки + шахматка ----
    const ctx = render.context;
    function drawCheckeredStripe(x, y, w, h, cell=8){
      ctx.save();
      ctx.translate(x, y - h/2);
      const cols = Math.ceil(w / cell);
      const rows = Math.ceil(h / cell);
      for (let r=0; r<rows; r++){
        for (let c=0; c<cols; c++){
          const on = (r + c) % 2 === 0;
          ctx.fillStyle = on ? '#111' : '#eee';
          ctx.fillRect(c*cell, r*cell, cell, cell);
        }
      }
      ctx.restore();
    }
    Matter.Events.on(render, 'afterRender', ()=>{
      ctx.fillStyle = CFG.rectColor;
      ctx.fillRect(0, top, (W-gap)/2, h);
      ctx.fillRect(W-(W-gap)/2, top, (W-gap)/2, h);
      const stripeY = CFG.finishY;
      const stripeH = CFG.finishStripeH;
      drawCheckeredStripe(0, stripeY, (W-gap)/2, stripeH);
      drawCheckeredStripe(W-(W-gap)/2, stripeY, (W-gap)/2, stripeH);
    });

    // ---- Управління ----
    canvas.addEventListener('pointerdown', (e)=>{
      const r = canvas.getBoundingClientRect();
      const x = (e.clientX - r.left) * (canvas.width / r.width);
      const y = (e.clientY - r.top ) * (canvas.height/ r.height);
      const fx=(x-ball.position.x)*0.0004;
      const fy=(y-ball.position.y)*0.0004;
      Matter.Body.applyForce(ball, ball.position, { x: fx, y: fy-0.015 });
    });
    window.addEventListener('keydown', (e)=>{
      if (e.key.toLowerCase() === 'r'){
        finished = false;
        const el = document.getElementById('finishMsg'); if (el) el.classList.remove('show');
        const t  = document.getElementById('winToast');  if (t)  t.style.opacity = '0';
        Matter.Body.setPosition(ball, { x: CFG.spawn.x, y: CFG.spawn.y });
        Matter.Body.setVelocity(ball, { x: 0, y: 0 });
        Matter.Body.setAngularVelocity(ball, 0);
      }
    });
  }
})();
