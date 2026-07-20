// src/trackGenerator.js
// Генератор випадкових трас з комбінацій перешкод

import {
  createBrickWall,
  createMovingBar,
  createPlinkoGrid,
  createFans,
  createMaze,
  createTrianglesWithTeleports,
  createRotatingCircles,
  createVFunnel,
  createFinishZone,
  createBumpers,
  createSpinner,
  createGravityZone,
  createSeesaw
} from './obstacles.js';

// Seedable RNG (з mapGen.js)
function mulberry32(seed) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Типи перешкод з їх параметрами
const OBSTACLE_TYPES = [
  {
    type: 'brickWall',
    create: createBrickWall,
    minHeight: 60,
    maxHeight: 80,
    weight: 1 // Частота появи
  },
  {
    type: 'movingBar',
    create: createMovingBar,
    minHeight: 40,
    maxHeight: 60,
    weight: 1
  },
  {
    type: 'plinko',
    create: createPlinkoGrid,
    minHeight: 200,
    maxHeight: 250,
    weight: 2 // Частіше
  },
  {
    type: 'fans',
    create: createFans,
    minHeight: 80,
    maxHeight: 120,
    weight: 1.5
  },
  {
    type: 'maze',
    create: createMaze,
    minHeight: 180,
    maxHeight: 220,
    weight: 1.5
  },
  {
    type: 'triangles',
    create: createTrianglesWithTeleports,
    minHeight: 150,
    maxHeight: 180,
    weight: 0.8 // Рідше
  },
  {
    type: 'circles',
    create: createRotatingCircles,
    minHeight: 200,
    maxHeight: 240,
    weight: 1
  },
  {
    type: 'funnel',
    create: createVFunnel,
    minHeight: 100,
    maxHeight: 150,
    weight: 1.2
  },
  {
    type: 'bumpers',
    create: createBumpers,
    minHeight: 80,
    maxHeight: 120,
    weight: 1.5 // Часто - весело
  },
  {
    type: 'spinner',
    create: createSpinner,
    minHeight: 120,
    maxHeight: 150,
    weight: 1
  },
  {
    type: 'gravityZone',
    create: createGravityZone,
    minHeight: 100,
    maxHeight: 140,
    weight: 0.8 // Рідше
  },
  {
    type: 'seesaw',
    create: createSeesaw,
    minHeight: 60,
    maxHeight: 80,
    weight: 1.2
  }
];

/**
 * Генерує випадкову трасу з перешкод
 * @param {Object} Matter - Matter.js об'єкт
 * @param {Object} engine - Matter.js engine
 * @param {Object} options - Налаштування
 * @returns {Object} - Згенерована траса
 */
export function generateRandomTrack(Matter, engine, {
  width = 390,
  height = 800,
  obstacleCount = 5,
  seed = null,
  padding = 30,
  spacing = 30, // Збільшено з 20 до 30 для кращого розділення
  includeFinish = true,
  onFinish = null
} = {}) {

  const actualSeed = seed !== null ? seed : Math.floor(Math.random() * 1e9);
  const rng = mulberry32(actualSeed);

  const obstacles = [];
  let currentY = padding + 50; // Початок після spawn зони

  // Вибираємо випадкові перешкоди
  for (let i = 0; i < obstacleCount; i++) {
    const obstacleType = selectRandomObstacle(rng, OBSTACLE_TYPES);
    const obstacleHeight = obstacleType.minHeight +
      Math.floor(rng() * (obstacleType.maxHeight - obstacleType.minHeight));

    // Перевіряємо чи вміщується (з запасом)
    if (currentY + obstacleHeight + spacing + 50 > height - (includeFinish ? 150 : 100)) {
      break;
    }

    const params = {
      x: padding,
      y: currentY + 10, // Додаємо невеликий відступ зверху
      width: width - padding * 2,
      height: obstacleHeight
    };

    // Додаткові параметри для специфічних перешкод
    if (obstacleType.type === 'brickWall') {
      params.rows = 3;
    } else if (obstacleType.type === 'plinko') {
      params.rows = 6;
      params.cols = 6;
    } else if (obstacleType.type === 'fans') {
      params.fanCount = 3 + Math.floor(rng() * 2); // 3-4 вентилятори
    } else if (obstacleType.type === 'maze') {
      params.levels = 3;
    } else if (obstacleType.type === 'circles') {
      params.circleCount = 2;
    } else if (obstacleType.type === 'bumpers') {
      params.bumperCount = 4 + Math.floor(rng() * 3); // 4-6 бамперів
    } else if (obstacleType.type === 'gravityZone') {
      params.gravityMultiplier = rng() > 0.5 ? 2 : 0.5; // Сильна або слабка гравітація
    }

    const obstacle = obstacleType.create(Matter, engine, params);

    obstacles.push({
      obstacle: obstacle,
      type: obstacleType.type,
      y: currentY,
      height: obstacleHeight
    });

    // Збільшуємо spacing для певних перешкод
    let extraSpacing = 0;
    if (obstacleType.type === 'spinner' || obstacleType.type === 'seesaw') {
      extraSpacing = 20; // Більше місця для динамічних перешкод
    } else if (obstacleType.type === 'gravityZone') {
      extraSpacing = 10; // Трохи більше для зони гравітації
    }

    currentY += obstacleHeight + spacing + extraSpacing;
  }

  // Додаємо фініш (ЗАВЖДИ, навіть якщо мало місця)
  let finishZone = null;
  if (includeFinish) {
    const finishY = Math.max(currentY + 20, height - 200); // Мінімум 200px для фінішу
    const finishHeight = height - finishY - padding;

    finishZone = createFinishZone(Matter, engine, {
      x: 0, // Повна ширина (без padding)
      y: finishY,
      width: width, // Повна ширина canvas
      height: finishHeight,
      onFinish: onFinish
    });

    obstacles.push({
      obstacle: finishZone,
      type: 'finishZone',
      y: finishY,
      height: finishHeight
    });
  }

  return {
    seed: actualSeed,
    width: width,
    height: height,
    obstacles: obstacles,
    finishZone: finishZone,
    spawnPoint: { x: width / 2, y: padding + 10 },
    // Функція очищення всієї траси
    cleanup: () => {
      obstacles.forEach(obs => {
        if (obs.obstacle && obs.obstacle.cleanup) {
          obs.obstacle.cleanup();
        }
      });
    }
  };
}

/**
 * Вибирає випадкову перешкоду з урахуванням weight
 */
function selectRandomObstacle(rng, types) {
  const totalWeight = types.reduce((sum, t) => sum + t.weight, 0);
  let random = rng() * totalWeight;

  for (const type of types) {
    random -= type.weight;
    if (random <= 0) {
      return type;
    }
  }

  return types[0]; // Fallback
}

/**
 * Створює збалансовану трасу (гарантує розмаїття)
 */
export function generateBalancedTrack(Matter, engine, options = {}) {
  const {
    width = 390,
    height = 800,
    seed = null,
    padding = 30,
    spacing = 30, // Збільшено з 20 до 30
    onFinish = null
  } = options;

  const actualSeed = seed !== null ? seed : Math.floor(Math.random() * 1e9);
  const rng = mulberry32(actualSeed);

  const obstacles = [];
  let currentY = padding + 50;

  // Фіксований порядок для збалансованої гри
  const sequence = [
    { type: 'plinko', height: 200 },
    { type: 'movingBar', height: 50 },
    { type: 'fans', height: 100 },
    { type: 'maze', height: 180 },
    { type: 'triangles', height: 150 },
    { type: 'circles', height: 200 }
  ];

  sequence.forEach(item => {
    if (currentY + item.height + spacing + 50 > height - 150) {
      return;
    }

    const obstacleType = OBSTACLE_TYPES.find(t => t.type === item.type);
    if (!obstacleType) return;

    const params = {
      x: padding,
      y: currentY + 10, // Додаємо відступ
      width: width - padding * 2,
      height: item.height
    };

    // Додаткові параметри
    if (item.type === 'plinko') {
      params.rows = 6;
      params.cols = 6;
    } else if (item.type === 'fans') {
      params.fanCount = 4;
    } else if (item.type === 'maze') {
      params.levels = 3;
    } else if (item.type === 'circles') {
      params.circleCount = 2;
    }

    const obstacle = obstacleType.create(Matter, engine, params);

    obstacles.push({
      obstacle: obstacle,
      type: item.type,
      y: currentY,
      height: item.height
    });

    currentY += item.height + spacing;
  });

  // Фініш
  const finishZone = createFinishZone(Matter, engine, {
    x: padding,
    y: currentY,
    width: width - padding * 2,
    height: height - currentY - padding,
    onFinish: onFinish
  });

  obstacles.push({
    obstacle: finishZone,
    type: 'finishZone',
    y: currentY,
    height: height - currentY - padding
  });

  return {
    seed: actualSeed,
    width: width,
    height: height,
    obstacles: obstacles,
    finishZone: finishZone,
    spawnPoint: { x: width / 2, y: padding + 10 },
    cleanup: () => {
      obstacles.forEach(obs => {
        if (obs.obstacle && obs.obstacle.cleanup) {
          obs.obstacle.cleanup();
        }
      });
    }
  };
}
