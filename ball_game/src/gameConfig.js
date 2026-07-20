// src/gameConfig.js
// Централізована конфігурація для легкого налаштування гри

export const GameConfig = {
  // Розміри canvas
  canvas: {
    width: 390,
    height: 1200,
    backgroundColor: '#05071a'
  },

  // Налаштування фізики
  physics: {
    gravity: 1.1,
    timeScale: 1,
    constraintIterations: 2,
    positionIterations: 6,
    velocityIterations: 4
  },

  // Параметри кульки
  ball: {
    radius: 12,
    restitution: 0.7,      // Пружність
    friction: 0.05,        // Тертя
    frictionAir: 0.01,     // Опір повітря
    density: 0.002,        // Густина
    colors: [              // Можливі кольори
      '#73ffe1',
      '#75a6ff',
      '#f6ff7a',
      '#ff6bbd',
      '#b07bff',
      '#ff9f68'
    ]
  },

  // Налаштування траси
  track: {
    padding: 30,           // Відступ від країв
    spacing: 20,           // Проміжок між перешкодами
    defaultObstacleCount: 5,
    spawnDelay: 100,       // мс між кульками при масовому spawn
    spawnVariation: 40     // px варіація позиції spawn
  },

  // Множники фінішу
  finish: {
    multipliers: [5, 2, 1.5, 10, 1.5, 2, 5],
    slotColors: {
      10: '#ffd700',       // Золотий для x10
      5: '#ff6b6b',        // Червоний для x5
      2: '#4ecdc4',        // Бірюзовий для x2
      1.5: '#4ecdc4'       // Бірюзовий для x1.5
    }
  },

  // Ваги перешкод для генерації
  obstacleWeights: {
    brickWall: 1,
    movingBar: 1,
    plinko: 2,             // Частіше
    fans: 1.5,
    maze: 1.5,
    triangles: 0.8,        // Рідше
    circles: 1,
    funnel: 1.2
  },

  // Візуальні ефекти
  vfx: {
    // Particles
    particles: {
      minIntensity: 0.3,   // Мінімальна інтенсивність для появи
      baseCount: 5,
      maxCount: 8,
      lifespan: 0.6,
      decay: 0.015
    },

    // Trails
    trails: {
      maxLength: 8,
      enableThreshold: 30, // Вимкнути якщо >30 кульок
      opacity: 0.6
    },

    // Glow
    glow: {
      enableThreshold: 50, // Вимкнути якщо >50 кульок
      intensity: 0.5,
      radius: 1.5          // Множник радіуса
    },

    // Floating text
    floatingText: {
      duration: 1.0,
      riseSpeed: -2,
      fontSize: 24,
      colors: {
        high: '#ffd700',   // x5+
        medium: '#73ffe1', // x2+
        low: '#ffffff'     // x1.5
      }
    }
  },

  // Звукові ефекти
  sound: {
    enabled: false,        // За замовчуванням вимкнено
    masterVolume: 0.3,
    cooldown: 50,          // мс між звуками
    minCollisionIntensity: 0.5
  },

  // Продуктивність
  performance: {
    fpsUpdateInterval: 1000, // мс
    maxBallsRecommended: 50,
    lowEndMode: false      // Автоматично вимикає ефекти
  },

  // Особливі налаштування перешкод
  obstacles: {
    brickWall: {
      rows: 3,
      hp: 3,
      restitution: 1.2,
      minBounceSpeed: 3,
      colors: {
        3: '#4ade80',      // Зелений (3 HP)
        2: '#fbbf24',      // Жовтий (2 HP)
        1: '#ef4444'       // Червоний (1 HP)
      }
    },

    movingBar: {
      speed: 0.05,
      amplitude: 120,
      restitution: 0.9
    },

    plinko: {
      rows: 6,
      cols: 6,
      pegRadius: 6,
      pegColor: '#3b82f6'
    },

    fans: {
      count: 4,
      force: 0.003,
      particleCount: 3,
      particleSpeed: 2
    },

    maze: {
      levels: 3,
      barThickness: 8,
      gap: 60
    },

    triangles: {
      teleportCooldown: 500, // мс
      exitAngleRange: 180,   // градуси
      portalSpeed: 0.03,
      portalAmplitude: 100
    },

    circles: {
      count: 2,
      segmentCount: 12,
      gapSize: 3,            // Кількість сегментів в gap
      rotationSpeed: 0.01
    },

    funnel: {
      bottomGap: 80,
      wallThickness: 10
    }
  },

  // Збалансована траса (фіксована послідовність)
  balancedTrackSequence: [
    { type: 'plinko', height: 200 },
    { type: 'movingBar', height: 50 },
    { type: 'fans', height: 100 },
    { type: 'maze', height: 180 },
    { type: 'triangles', height: 150 },
    { type: 'circles', height: 200 }
  ],

  // Режими гри
  modes: {
    sandbox: {
      name: 'Пісочниця',
      description: 'Вільна гра без обмежень',
      unlimitedBalls: true,
      showStats: true
    },
    race: {
      name: 'Гонка',
      description: 'Одна кулька, один результат',
      ballLimit: 1,
      autoStart: true,
      showStats: false
    },
    multiplayer: {
      name: 'Мультиплеєр',
      description: 'Змагання з іншими гравцями',
      ballLimit: 1,
      requireSeed: true,
      showStats: true
    }
  }
};

/**
 * Застосувати користувацькі налаштування
 */
export function applyConfig(customConfig) {
  return deepMerge(GameConfig, customConfig);
}

/**
 * Глибоке злиття об'єктів
 */
function deepMerge(target, source) {
  const result = { ...target };

  for (const key in source) {
    if (source[key] instanceof Object && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }

  return result;
}

/**
 * Отримати конфіг для конкретного режиму
 */
export function getModeConfig(mode) {
  const baseConfig = { ...GameConfig };
  const modeSettings = GameConfig.modes[mode] || GameConfig.modes.sandbox;

  return {
    ...baseConfig,
    currentMode: modeSettings
  };
}

/**
 * Валідація конфігу
 */
export function validateConfig(config) {
  const errors = [];

  if (config.ball.radius <= 0) {
    errors.push('Ball radius must be positive');
  }

  if (config.finish.multipliers.length === 0) {
    errors.push('At least one finish multiplier required');
  }

  if (config.physics.gravity < 0) {
    errors.push('Gravity cannot be negative');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Експорт конфігу для збереження
 */
export function exportConfig(config) {
  return JSON.stringify(config, null, 2);
}

/**
 * Імпорт конфігу
 */
export function importConfig(jsonString) {
  try {
    const config = JSON.parse(jsonString);
    const validation = validateConfig(config);

    if (!validation.valid) {
      throw new Error(`Invalid config: ${validation.errors.join(', ')}`);
    }

    return config;
  } catch (error) {
    console.error('Failed to import config:', error);
    return GameConfig;
  }
}

// Експортуємо за замовчуванням
export default GameConfig;
