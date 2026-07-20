// src/mapGen.js
// Генератор карти + будівельник тіл для Matter.js

// RNG (seedable)
function mulberry32(seed){ return function(){
  let t = seed += 0x6D2B79F5; t = Math.imul(t ^ t>>>15, t | 1);
  t ^= t + Math.imul(t ^ t>>>7, t | 61);
  return ((t ^ t>>>14) >>> 0) / 4294967296;
}}
const rand = (rng,a,b)=> a + (b-a)*rng();
const irand = (rng,a,b)=> Math.floor(rand(rng,a,b+1));

function aabbRect(cx,cy,w,h,ang){
  const c=Math.cos(ang), s=Math.sin(ang), hw=w/2, hh=h/2;
  const xs=[-hw, hw, hw,-hw], ys=[-hh,-hh,hh,hh];
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  for(let i=0;i<4;i++){
    const x=cx + xs[i]*c - ys[i]*s, y=cy + xs[i]*s + ys[i]*c;
    minX=Math.min(minX,x); maxX=Math.max(maxX,x);
    minY=Math.min(minY,y); maxY=Math.max(maxY,y);
  }
  return {minX,minY,maxX,maxY};
}
const aabbOverlap = (a,b)=> !(a.maxX<b.minX||a.minX>b.maxX||a.maxY<b.minY||a.minY>b.maxY);

// Генератор карти
export function generateMap({width=360,height=520,count=6,padding=28,seed=null}={}){
  const s = seed!=null && seed!=='' ? Number(seed)>>>0 : (Math.random()*1e9)>>>0;
  const rng = mulberry32(s);

  const shapes=[], aabbs=[];
  const enabled = ['bars','triangles','circles','stars'];

  let tries=0, maxTries=count*80;
  while(shapes.length<count && tries<maxTries){
    tries++;
    const type = enabled[ irand(rng,0,enabled.length-1) ];
    const cx = rand(rng,padding,width-padding);
    const cy = rand(rng,padding,height-padding);
    const angle = rand(rng,-0.6,0.6);
    let shp, aabb;

    if(type==='bars'){
      const w = rand(rng,width*0.22,width*0.52);
      const h = rand(rng,height*0.035,height*0.07);
      aabb = aabbRect(cx,cy,w,h,angle);
      shp = { kind:'bar', cx,cy, w,h, angle };
    } else if(type==='triangles'){
      const size = Math.min(width,height)*rand(rng,0.12,0.18);
      aabb = aabbRect(cx,cy,size,size,angle);
      shp = { kind:'triangle', cx,cy, size, angle };
    } else if(type==='circles'){
      const r = Math.min(width,height)*rand(rng,0.06,0.10);
      aabb = {minX:cx-r,maxX:cx+r,minY:cy-r,maxY:cy+r};
      shp = { kind:'circle', cx,cy, r };
    } else { // stars
      const R = Math.min(width,height)*rand(rng,0.075,0.12);
      const r = R*0.45;
      aabb = aabbRect(cx,cy,R*2,R*2,angle);
      shp = { kind:'star', cx,cy, R,r, spikes:5, angle };
    }

    if(aabbs.every(b=>!aabbOverlap(aabb,b))){
      shapes.push(shp); aabbs.push(aabb);
    }
  }

  const spawn = { x: width*0.5, y: 10 }; // спавн кулі зверху
  return { seed:s, width, height, padding, shapes, spawn };
}

// Побудова тіл у Matter.js
export function buildMatterFromMap(Matter, engine, map){
  const { Bodies, Body, World } = Matter;
  const world = engine.world;

  // очистка світу (без гравітації)
  World.clear(world, false);
  engine.events = {};

  // межі
  const t = 40;
  const walls = [
    Bodies.rectangle(map.width/2, -t/2, map.width, t, { isStatic:true }),
    Bodies.rectangle(map.width/2, map.height+t/2, map.width, t, { isStatic:true }),
    Bodies.rectangle(-t/2, map.height/2, t, map.height, { isStatic:true }),
    Bodies.rectangle(map.width+t/2, map.height/2, t, map.height, { isStatic:true }),
  ];
  World.add(world, walls);

  // перешкоди
  const obs=[];
  for(const s of map.shapes){
    if(s.kind==='bar'){
      const b = Bodies.rectangle(s.cx,s.cy,s.w,s.h,{ isStatic:true, render:{ fillStyle:'#000' }});
      Body.rotate(b, s.angle); obs.push(b);
    } else if(s.kind==='triangle'){
      const r = s.size/2, h = r*Math.sqrt(3);
      const verts = [{x:0,y:-h/2},{x:+r,y:h/2},{x:-r,y:h/2}];
      const b = Bodies.fromVertices(s.cx,s.cy,[verts],{ isStatic:true, render:{ fillStyle:'#000' }},true);
      Body.rotate(b, s.angle); obs.push(b);
    } else if(s.kind==='circle'){
      const b = Bodies.circle(s.cx,s.cy,s.r,{ isStatic:true, render:{ fillStyle:'#000' }});
      obs.push(b);
    } else if(s.kind==='star'){
      const verts = starVerts(s.R,s.r,s.spikes);
      const b = Bodies.fromVertices(s.cx,s.cy,[verts],{ isStatic:true, render:{ fillStyle:'#000' }},true);
      Body.rotate(b, s.angle); obs.push(b);
    }
  }
  World.add(world, obs);

  return { walls, obstacles:obs };
}

function starVerts(R,r,spikes=5){
  const out=[]; let ang=-Math.PI/2, step=Math.PI/spikes;
  for(let i=0;i<spikes;i++){
    out.push({x:Math.cos(ang)*R,y:Math.sin(ang)*R}); ang+=step;
    out.push({x:Math.cos(ang)*r,y:Math.sin(ang)*r}); ang+=step;
  }
  return out;
}
