# 🎮 Marble Race Game - Physics Sandbox

A physics-based marble racing game built with Matter.js featuring dynamic obstacles, visual effects, and track generation.

## 🌟 Features

### Core Gameplay
- **9 Unique Obstacles**: Brick walls, moving bars, plinko grids, fans, mazes, teleports, rotating circles, funnels, and finish zones
- **Random Track Generation**: Procedural track creation with seedable RNG for reproducibility
- **Balanced Track Mode**: Curated obstacle sequences for competitive gameplay
- **Finish System**: Slot-based finish with multipliers (x1.5 to x10)

### Visual Effects
- **Collision Particles**: Dynamic particle system that responds to collision intensity
- **Ball Trails**: Smooth motion trails following each marble
- **Glow Effects**: Radial glow around marbles for enhanced visibility
- **Floating Text**: Animated multiplier display on finish

### Sound System
- **Web Audio API**: Procedural sound generation
- **Collision Sounds**: Intensity-based impact audio
- **Special Effects**: Unique sounds for brick breaks, teleports, and finish events
- **Performance Optimization**: Sound cooldown system to prevent audio spam

### Performance
- **Optimized for Scale**: Tested with 50+ simultaneous marbles
- **Adaptive Quality**: Automatically reduces visual effects at high ball counts
- **FPS Monitoring**: Real-time performance tracking
- **Efficient Physics**: Tuned Matter.js settings for smooth simulation

## 🎯 Obstacles

### 1. Brick Wall
- 3 HP destructible wall
- Color changes based on HP (green → yellow → red)
- Super bouncy physics (restitution 1.2)
- Guaranteed bounce even at low speeds

### 2. Moving Bar
- Horizontal oscillating platform
- Sinusoidal movement pattern
- High restitution for dynamic bounces

### 3. Plinko Grid
- 6x6 peg grid with checkerboard offset
- Classic plinko mechanics
- Randomized ball paths

### 4. Fans
- 3-4 invisible force fields
- Animated particle system showing air flow
- Horizontal push mechanics

### 5. Maze
- Multi-level labyrinth
- Alternating left/right barriers
- Tests ball navigation skills

### 6. Triangles + Teleports
- Green portal (moving) teleports to red portal (static)
- Random exit angle (0-180°)
- Cooldown system prevents infinite loops

### 7. Rotating Circles
- 2 circular tubes with gaps
- Opposite rotation directions
- Timing-based challenge

### 8. V-Funnel
- Narrowing funnel shape
- 80px bottom gap for passage
- Guides balls toward finish

### 9. Finish Zone
- 7 slots with multipliers: [5, 2, 1.5, **10**, 1.5, 2, 5]
- Color-coded by value (gold/red/cyan)
- Ball detection and scoring

## 📁 Project Structure

```
ball_game/
├── index.html              # Original demo page
├── test-obstacles.html     # Individual obstacle testing
├── full-track.html         # Complete game with track generation
├── finish.html             # Finish zone isolated test
├── src/
│   ├── obstacles.js        # All 9 obstacle implementations
│   ├── trackGenerator.js   # Random/balanced track generation
│   ├── visualEffects.js    # Particle, trail, glow, and text systems
│   ├── soundSystem.js      # Web Audio API sound effects
│   ├── mapGen.js           # Original map generation (legacy)
│   └── finish.js           # Finish zone standalone module
└── README.md               # This file
```

## 🚀 Getting Started

### Prerequisites
- Python 3.x (for local server) or any HTTP server
- Modern web browser with JavaScript enabled

### Installation

1. Clone or download the project:
```bash
cd F:\PY\ball_game
```

2. Start a local HTTP server:
```bash
python -m http.server 8000
```

3. Open in browser:
```
http://localhost:8000/full-track.html
```

## 🎮 Controls

### Main Interface (`full-track.html`)

**Track Generation:**
- 🎲 **Нова випадкова траса** - Generate random obstacle sequence
- ⚖️ **Збалансована траса** - Load curated balanced track

**Ball Spawning:**
- **Кинути кульку** - Drop single marble
- **Кинути 10 кульок** - Drop 10 marbles (100ms delay)
- **Кинути 50 кульок** - Stress test with 50 marbles
- **Canvas Click** - Click anywhere to spawn marble at cursor

**Other:**
- **Очистити кульки** - Remove all marbles
- 🔇/🔊 **Звук** - Toggle sound effects

### Statistics Panel
- **Seed** - Current track generation seed
- **Перешкод** - Number of obstacles in track
- **Кульок** - Active marbles count
- **Фінішували** - Finished marbles count
- **FPS** - Current frame rate

## 🛠️ Technical Details

### Physics Engine
- **Engine**: Matter.js 0.19.0
- **Gravity**: 1.1 (slightly heavier than default)
- **Ball Properties**:
  - Radius: 12px
  - Restitution: 0.7 (bouncy)
  - Friction: 0.05 (low)
  - Density: 0.002 (light)

### Track Generator

#### Random Track
```javascript
generateRandomTrack(Matter, engine, {
  width: 390,
  height: 1200,
  obstacleCount: 5,
  seed: 12345,        // Optional, for reproducibility
  onFinish: callback  // Finish event handler
})
```

**Weighted Selection:**
- Plinko: 2x (most common)
- Fans: 1.5x
- Maze: 1.5x
- Funnel: 1.2x
- Others: 1x
- Triangles: 0.8x (rare)

#### Balanced Track
Fixed sequence: Plinko → Moving Bar → Fans → Maze → Triangles → Circles → Finish

### Visual Effects System

**Collision Particles:**
- Intensity-based particle count (5-8 particles)
- Radial explosion pattern
- Gravity and friction simulation
- Color matches ball

**Trails:**
- 8 points maximum per ball
- Alpha gradient (newest = brightest)
- Automatically disabled for >30 balls

**Glow:**
- Radial gradient around balls
- Disabled for >50 balls (performance)

### Sound System

**Initialization:**
- Lazy init on first user interaction (Web Audio policy)
- Master volume: 0.3

**Sounds:**
- `playCollision(intensity)` - Impact sound, frequency 100-300Hz
- `playBrickBreak()` - Noise burst on brick destruction
- `playTeleport()` - Rising tone 200→800Hz
- `playFinish(multiplier)` - Major chord (C or G based on value)
- `playRotatingCircle()` - Modulated triangle wave
- `playFanSound()` - Filtered white noise

**Optimization:**
- 50ms cooldown between sounds
- Prevents audio spam at high ball counts

## 📊 Performance Optimization

### Adaptive Quality
```javascript
// Automatic quality scaling
if (ballCount > 30) {
  trails = false;      // Disable trails
}
if (ballCount > 50) {
  glow = false;        // Disable glow effects
}
```

### Physics Tuning
```javascript
engine.constraintIterations = 2;
engine.positionIterations = 6;
engine.velocityIterations = 4;
```

### Rendering
- Canvas-based rendering with custom overlays
- Particle pooling for VFX
- Efficient collision detection filtering

## 🎨 Customization

### Adding New Obstacles

1. **Create obstacle function** in `src/obstacles.js`:
```javascript
export function createMyObstacle(Matter, engine, { x, y, width, height }) {
  const { Bodies, World } = Matter;
  const bodies = [];

  // Create static bodies
  const myBody = Bodies.rectangle(x, y, width, height, {
    isStatic: true,
    label: 'myObstacle',
    render: { fillStyle: '#ff0000' }
  });
  bodies.push(myBody);
  World.add(engine.world, bodies);

  return {
    type: 'myObstacle',
    bodies: bodies,
    cleanup: () => World.remove(engine.world, bodies),
    // Optional custom render
    renderCustom: (ctx) => { /* custom drawing */ }
  };
}
```

2. **Add to track generator** in `src/trackGenerator.js`:
```javascript
import { createMyObstacle } from './obstacles.js';

const OBSTACLE_TYPES = [
  // ... existing obstacles
  {
    type: 'myObstacle',
    create: createMyObstacle,
    minHeight: 100,
    maxHeight: 150,
    weight: 1.0
  }
];
```

3. **Add render hook** in `full-track.html`:
```javascript
if (obs.obstacle.renderCustom) {
  obs.obstacle.renderCustom(ctx);
}
```

### Changing Ball Physics
Edit the `createBall()` function in `full-track.html`:
```javascript
const ball = Matter.Bodies.circle(ballX, ballY, r, {
  restitution: 0.8,    // Bounciness (0-1+)
  friction: 0.1,       // Surface friction (0-1)
  frictionAir: 0.01,   // Air resistance (0-1)
  density: 0.002       // Mass per unit area
});
```

### Modifying Finish Multipliers
In `src/obstacles.js` → `createFinishZone()`:
```javascript
const multipliers = [5, 2, 1.5, 10, 1.5, 2, 5]; // Change these values
```

## 🐛 Known Issues & Limitations

- **Performance**: FPS may drop below 30 with 100+ balls on slower devices
- **Mobile**: Touch controls work but may need optimization
- **Safari**: Web Audio may require additional user gesture on iOS
- **Determinism**: Physics simulation is mostly deterministic but may vary slightly across browsers

## 🔮 Future Enhancements

### Planned Features
- [ ] Multiplayer mode with synchronized physics
- [ ] Leaderboard system
- [ ] Betting integration (TON/Stars for TG_bot_game)
- [ ] Ball skin customization
- [ ] Power-ups (speed boost, shield, etc.)
- [ ] Achievement system
- [ ] Replay recording/playback
- [ ] Mobile-optimized UI

### Telegram Bot Integration
This physics sandbox is designed to integrate with `F:\PY\TG_bot_game`:
- Track seeds shared between players for fairness
- Betting on marble races
- Mini-app hosting in Telegram WebApp
- TON blockchain for transactions
- Stars for in-game currency

## 📜 License

This project is part of a learning/development exercise. Feel free to use and modify as needed.

## 🙏 Credits

- **Physics Engine**: [Matter.js](https://brm.io/matter-js/) by Liam Brummitt
- **Concept**: Inspired by Plinko and Marble Race games
- **Development**: Built iteratively with AI assistance

---

**Version**: 1.0
**Last Updated**: 2025-10
**Status**: Feature-complete sandbox, ready for game integration
