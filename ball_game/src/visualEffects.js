// src/visualEffects.js
// Система візуальних ефектів для гри

/**
 * Система частинок для зіткнень
 */
export class CollisionParticleSystem {
  constructor() {
    this.particles = [];
  }

  /**
   * Створює спалах частинок при зіткненні
   */
  createImpact(x, y, color = '#73ffe1', intensity = 1) {
    const particleCount = Math.floor(5 + intensity * 3);

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5;
      const speed = 2 + Math.random() * 3 * intensity;

      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        maxLife: 0.6 + Math.random() * 0.4,
        size: 2 + Math.random() * 2,
        color: color,
        decay: 0.015 + Math.random() * 0.01
      });
    }
  }

  /**
   * Оновлює всі частинки
   */
  update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.2; // Гравітація
      p.vx *= 0.98; // Тертя
      p.vy *= 0.98;
      p.life -= p.decay;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  /**
   * Малює всі частинки
   */
  render(ctx) {
    this.particles.forEach(p => {
      const alpha = Math.max(0, p.life);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  /**
   * Очищає всі частинки
   */
  clear() {
    this.particles = [];
  }
}

/**
 * Система trail ефектів (слід за кулькою)
 */
export class TrailSystem {
  constructor(maxTrailLength = 10) {
    this.trails = new Map(); // ballId -> trail points
    this.maxLength = maxTrailLength;
  }

  /**
   * Додає точку до trail
   */
  addPoint(ballId, x, y, color) {
    if (!this.trails.has(ballId)) {
      this.trails.set(ballId, []);
    }

    const trail = this.trails.get(ballId);
    trail.push({ x, y, color, alpha: 1.0 });

    if (trail.length > this.maxLength) {
      trail.shift();
    }
  }

  /**
   * Оновлює trails (зменшує прозорість старих точок)
   */
  update() {
    this.trails.forEach((trail, ballId) => {
      for (let i = 0; i < trail.length; i++) {
        trail[i].alpha = (i + 1) / trail.length * 0.6;
      }
    });
  }

  /**
   * Малює всі trails
   */
  render(ctx) {
    this.trails.forEach(trail => {
      if (trail.length < 2) return;

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (let i = 1; i < trail.length; i++) {
        const p1 = trail[i - 1];
        const p2 = trail[i];

        const gradient = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
        gradient.addColorStop(0, this.colorWithAlpha(p1.color, p1.alpha));
        gradient.addColorStop(1, this.colorWithAlpha(p2.color, p2.alpha));

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 3 * p2.alpha;

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }

      ctx.restore();
    });
  }

  /**
   * Видаляє trail для кульки
   */
  removeTrail(ballId) {
    this.trails.delete(ballId);
  }

  /**
   * Очищає всі trails
   */
  clear() {
    this.trails.clear();
  }

  /**
   * Додає альфа-канал до кольору
   */
  colorWithAlpha(color, alpha) {
    // Якщо колір у форматі #RRGGBB
    if (color.startsWith('#')) {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return color;
  }
}

/**
 * Система glow ефектів для об'єктів
 */
export class GlowSystem {
  /**
   * Малює glow навколо об'єкту
   */
  static drawGlow(ctx, x, y, radius, color, intensity = 1) {
    const gradient = ctx.createRadialGradient(x, y, radius * 0.5, x, y, radius * 1.5);

    const colorAlpha = this.hexToRgba(color, 0.4 * intensity);
    gradient.addColorStop(0, colorAlpha);
    gradient.addColorStop(0.7, this.hexToRgba(color, 0.1 * intensity));
    gradient.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.save();
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius * 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /**
   * Конвертує hex в rgba
   */
  static hexToRgba(hex, alpha) {
    if (hex.startsWith('#')) {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return `rgba(115, 255, 225, ${alpha})`; // fallback
  }
}

/**
 * Анімований текст (для повідомлень типу +100, FINISH!, тощо)
 */
export class FloatingTextSystem {
  constructor() {
    this.texts = [];
  }

  /**
   * Додає floating текст
   */
  addText(x, y, text, color = '#ffd700', size = 20) {
    this.texts.push({
      x: x,
      y: y,
      text: text,
      color: color,
      size: size,
      life: 1.0,
      vy: -2, // Рухається вгору
      alpha: 1.0
    });
  }

  /**
   * Оновлює всі тексти
   */
  update() {
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];

      t.y += t.vy;
      t.vy *= 0.95; // Сповільнення
      t.life -= 0.02;
      t.alpha = Math.max(0, t.life);

      if (t.life <= 0) {
        this.texts.splice(i, 1);
      }
    }
  }

  /**
   * Малює всі тексти
   */
  render(ctx) {
    this.texts.forEach(t => {
      ctx.save();
      ctx.globalAlpha = t.alpha;
      ctx.font = `bold ${t.size}px system-ui`;
      ctx.fillStyle = t.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Обводка для читабельності
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillText(t.text, t.x, t.y);

      ctx.restore();
    });
  }

  /**
   * Очищає всі тексти
   */
  clear() {
    this.texts = [];
  }
}

/**
 * Головний менеджер всіх візуальних ефектів
 */
export class VisualEffectsManager {
  constructor() {
    this.particles = new CollisionParticleSystem();
    this.trails = new TrailSystem(8);
    this.floatingTexts = new FloatingTextSystem();
    this.leaderBallId = null; // ID кульки-лідера
  }

  /**
   * Оновлює всі системи
   */
  update() {
    this.particles.update();
    this.trails.update();
    this.floatingTexts.update();
  }

  /**
   * Рендерить всі ефекти
   */
  render(ctx) {
    this.trails.render(ctx);
    this.particles.render(ctx);
    this.floatingTexts.render(ctx);
  }

  /**
   * Очищає всі ефекти
   */
  clear() {
    this.particles.clear();
    this.trails.clear();
    this.floatingTexts.clear();
  }

  /**
   * Створює ефект зіткнення
   */
  createCollisionEffect(x, y, color, intensity = 1) {
    this.particles.createImpact(x, y, color, intensity);
  }

  /**
   * Додає точку trail
   */
  addTrailPoint(ballId, x, y, color) {
    this.trails.addPoint(ballId, x, y, color);
  }

  /**
   * Видаляє trail кульки
   */
  removeTrail(ballId) {
    this.trails.removeTrail(ballId);
  }

  /**
   * Показує floating текст
   */
  showText(x, y, text, color, size) {
    this.floatingTexts.addText(x, y, text, color, size);
  }

  /**
   * Встановлює кульку-лідера
   */
  setLeader(ballId) {
    this.leaderBallId = ballId;
  }

  /**
   * Малює корону над лідером
   */
  renderLeaderCrown(ctx, ball) {
    if (!ball || ball.id !== this.leaderBallId) return;

    const x = ball.position.x;
    const y = ball.position.y - 25;
    const size = 12;

    ctx.save();

    // Пульсація
    const pulse = Math.sin(Date.now() / 200) * 0.2 + 1;

    // Корона
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    // Основа корони
    ctx.moveTo(x - size * pulse, y + size * 0.7);
    // Ліва зубчик
    ctx.lineTo(x - size * 0.7 * pulse, y - size * 0.3);
    ctx.lineTo(x - size * 0.4 * pulse, y + size * 0.2);
    // Середній зубчик
    ctx.lineTo(x, y - size * pulse);
    ctx.lineTo(x + size * 0.4 * pulse, y + size * 0.2);
    // Правий зубчик
    ctx.lineTo(x + size * 0.7 * pulse, y - size * 0.3);
    ctx.lineTo(x + size * pulse, y + size * 0.7);
    ctx.closePath();
    ctx.fill();

    // Обводка
    ctx.strokeStyle = '#ffaa00';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Блиск
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.arc(x - size * 0.3, y - size * 0.5, size * 0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
