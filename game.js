/**
 * NEON RUNNER - 2D Endless Runner Game
 * A modular Canvas-based game with physics, parallax backgrounds, and responsive controls
 */

// ============================================
// GAME CONFIGURATION
// ============================================
const CONFIG = {
  // Physics
  GRAVITY: 0.8,
  JUMP_FORCE: -15,
  DOUBLE_JUMP_FORCE: -12,
  SLIDE_DURATION: 500,

  // Player
  PLAYER_WIDTH: 50,
  PLAYER_HEIGHT: 80,
  PLAYER_SLIDE_HEIGHT: 40,
  PLAYER_X_POSITION: 100,

  // Game Speed
  // Game Speed
  INITIAL_SPEED: 6,
  SPEEDS: { SLOW: 5, MEDIUM: 8, FAST: 12 },
  MAX_SPEED: 25, // Increased max speed
  SPEED_INCREMENT: 0.001,

  // Obstacles
  MIN_OBSTACLE_GAP: 500, // Increased gap
  MAX_OBSTACLE_GAP: 900, // Increased gap
  OBSTACLE_TYPES: ["ground", "air", "double", "tall", "long"],

  // Scoring
  SCORE_MULTIPLIER: 0.1,

  // Power-ups
  POWERUP_CHANCE: 0.02,
  SHIELD_DURATION: 5000,
  MULTIPLIER_DURATION: 8000, // 8 seconds double score

  // Level Settings
  LEVEL_DURATION: 1000, // Score points per level
  SPEED_INCREMENT_PER_LEVEL: 1.5,
  MAX_LEVEL: 10,

  // Colors (Neon Theme)
  COLORS: {
    player: "#00f0ff",
    playerGlow: "rgba(0, 240, 255, 0.5)",
    obstacle: "#ff00aa",
    obstacleGlow: "rgba(255, 0, 170, 0.5)",
    ground: "#1a1a2e",
    groundLine: "#7b2dff",
    powerupShield: "#00ff88",
    powerupDoubleJump: "#ffaa00",
    powerupMultiplier: "#ff00ff", // Purple for Multiplier
    levelText: "#ff00ff", // New color for level text
  },
};

// ============================================
// GAME STATE
// ============================================
const GameState = {
  START: "start",
  PLAYING: "playing",
  PAUSED: "paused",
  GAMEOVER: "gameover",
};

// ============================================
// UTILITY FUNCTIONS
// ============================================
const Utils = {
  random: (min, max) => Math.random() * (max - min) + min,
  randomInt: (min, max) => Math.floor(Utils.random(min, max + 1)),
  lerp: (start, end, t) => start + (end - start) * t,
  clamp: (value, min, max) => Math.max(min, Math.min(max, value)),

  // Collision detection using AABB
  checkCollision: (rect1, rect2) => {
    return (
      rect1.x < rect2.x + rect2.width &&
      rect1.x + rect1.width > rect2.x &&
      rect1.y < rect2.y + rect2.height &&
      rect1.y + rect1.height > rect2.y
    );
  },
};

// ============================================
// STORAGE MANAGER (localStorage)
// ============================================
const Storage = {
  KEY: "neonrunner_highscore",
  LB_KEY: "neonrunner_leaderboard",

  getHighScore: () => {
    try {
      return parseInt(localStorage.getItem(Storage.KEY)) || 0;
    } catch (e) {
      return 0;
    }
  },

  setHighScore: (score) => {
    try {
      localStorage.setItem(Storage.KEY, score.toString());
    } catch (e) {
      console.warn("Could not save high score");
    }
  },

  getLeaderboard: () => {
    try {
      const lb = localStorage.getItem(Storage.LB_KEY);
      return lb ? JSON.parse(lb) : [];
    } catch (e) {
      return [];
    }
  },

  saveToLeaderboard: (score) => {
    try {
      let lb = Storage.getLeaderboard();
      lb.push({ score: Math.floor(score), date: new Date().toLocaleDateString() });
      lb.sort((a, b) => b.score - a.score);
      lb = lb.slice(0, 5); // Keep top 5
      localStorage.setItem(Storage.LB_KEY, JSON.stringify(lb));
      return lb;
    } catch (e) {
      console.warn("Could not save to leaderboard");
      return [];
    }
  },
};

// ============================================
// PARTICLE SYSTEM (Visual Effects)
// ============================================
class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.size = Utils.random(2, 6);
    this.speedX = Utils.random(-3, 3);
    this.speedY = Utils.random(-5, -1);
    this.life = 1;
    this.decay = Utils.random(0.02, 0.05);
  }

  update() {
    this.x += this.speedX;
    this.y += this.speedY;
    this.speedY += 0.1; // Gravity
    this.life -= this.decay;
  }

  draw(ctx) {
    ctx.globalAlpha = this.life;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  emit(x, y, color, count = 10) {
    for (let i = 0; i < count; i++) {
      this.particles.push(new Particle(x, y, color));
    }
  }

  update() {
    this.particles = this.particles.filter((p) => {
      p.update();
      return p.life > 0;
    });
  }

  draw(ctx) {
    this.particles.forEach((p) => p.draw(ctx));
  }

  clear() {
    this.particles = [];
  }
}

// ============================================
// FLOATING TEXT SYSTEM
// ============================================
class FloatingText {
    constructor(x, y, text, color) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.life = 1.0;
        this.velocityY = -2;
    }

    update() {
        this.y += this.velocityY;
        this.life -= 0.02;
    }

    draw(ctx) {
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.font = "bold 20px " + "var(--font-display)";
        ctx.fillStyle = this.color;
        ctx.strokeStyle = "black";
        ctx.lineWidth = 2;
        ctx.strokeText(this.text, this.x, this.y);
        ctx.fillText(this.text, this.x, this.y);
        ctx.globalAlpha = 1;
    }
}

// ============================================
// COIN CLASS
// ============================================
class Coin {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.collected = false;
        this.rotation = 0;
    }

    update(gameSpeed) {
        this.x -= gameSpeed;
        this.rotation += 0.1;
    }

    draw(ctx) {
        if (this.collected) return;
        
        ctx.save();
        ctx.translate(this.x + this.width/2, this.y + this.height/2);
        ctx.rotate(this.rotation);
        
        ctx.shadowColor = "#FFFF00";
        ctx.shadowBlur = 10;
        ctx.fillStyle = "#FFD700";
        ctx.beginPath();
        ctx.rect(-10, -10, 20, 20);
        ctx.fill();
        
        // Inner detail
        ctx.fillStyle = "#FFF";
        ctx.beginPath();
        ctx.rect(-4, -4, 8, 8);
        ctx.fill();
        
        ctx.restore();
    }
}

// ============================================
// PARALLAX BACKGROUND
// ============================================
class ParallaxLayer {
  constructor(speed, color, height, yOffset, pattern) {
    this.speed = speed;
    this.color = color;
    this.height = height;
    this.yOffset = yOffset;
    this.pattern = pattern; // 'buildings', 'mountains', 'stars', 'grid', 'image'
    this.offset = 0;
    this.elements = [];
    this.initialized = false;
    
    if (this.pattern === 'image') {
        this.image = new Image();
        this.image.src = "background.png"; // User provided image
        this.imageLoaded = false;
        this.image.onload = () => {
            this.imageLoaded = true;
        };
    }
  }

  init(canvasWidth, canvasHeight) {
    this.elements = [];
    const groundY = canvasHeight - 60;

    if (this.pattern === "stars") {
      for (let i = 0; i < 100; i++) {
        this.elements.push({
          x: Utils.random(0, canvasWidth),
          y: Utils.random(0, groundY - 100),
          size: Utils.random(1, 3),
          twinkle: Utils.random(0, Math.PI * 2),
        });
      }
    } else if (this.pattern === "addis") {
        let x = 0;
        // Generate skylines with specific landmarks
        while (x < canvasWidth + 300) {
            const isLandmark = Math.random() < 0.3; // 30% chance of landmark
            if (isLandmark) {
                // Determine which landmark
                const type = Math.random() < 0.5 ? 'cbe' : 'au';
                if (type === 'cbe') {
                     this.elements.push({ x: x, type: 'cbe', width: 60, height: 250 });
                     x += 100;
                } else {
                     this.elements.push({ x: x, type: 'au', width: 80, height: 120 });
                     x += 120;
                }
            } else {
                // Filler buildings
                const width = Utils.randomInt(30, 60);
                const height = Utils.randomInt(50, 150);
                this.elements.push({
                    x: x,
                    type: 'normal',
                    width: width,
                    height: height,
                    windows: this.generateWindows(width, height),
                });
                x += width + Utils.randomInt(5, 20);
            }
        }
    } else if (this.pattern === "mountains") {
      let x = 0;
      while (x < canvasWidth + 300) {
        this.elements.push({
          x: x,
          width: Utils.randomInt(100, 250),
          height: Utils.randomInt(80, 150),
        });
        x += Utils.randomInt(80, 150);
      }
    }

    this.initialized = true;
  }

  generateWindows(buildingWidth, buildingHeight) {
    const windows = [];
    const cols = Math.floor(buildingWidth / 15);
    const rows = Math.floor(buildingHeight / 20);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (Math.random() > 0.3) {
          windows.push({ col: c, row: r, lit: Math.random() > 0.5 });
        }
      }
    }
    return windows;
  }

  update(gameSpeed) {
    this.offset += gameSpeed * this.speed;
  }

  draw(ctx, canvasWidth, canvasHeight) {
    const groundY = canvasHeight - 60;

    if (this.pattern === "stars") {
      ctx.fillStyle = "#ffffff";
      this.elements.forEach((star) => {
        const twinkle = Math.sin(star.twinkle + Date.now() * 0.003) * 0.5 + 0.5;
        ctx.globalAlpha = twinkle;
        ctx.beginPath();
        ctx.arc(
          (star.x - this.offset * 0.1) % canvasWidth,
          star.y,
          star.size,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    } else if (this.pattern === "mountains") {
      ctx.fillStyle = this.color;
      this.elements.forEach((mountain) => {
        const x = ((mountain.x - this.offset) % (canvasWidth + 300)) - 150;
        ctx.beginPath();
        ctx.moveTo(x, groundY);
        ctx.lineTo(x + mountain.width / 2, groundY - mountain.height);
        ctx.lineTo(x + mountain.width, groundY);
        ctx.closePath();
        ctx.fill();
      });
    } else if (this.pattern === "addis") {
      this.elements.forEach((building) => {
        const x = ((building.x - this.offset) % (canvasWidth + 300)) - 100;
        const groundY = canvasHeight - 60;

        ctx.fillStyle = this.color;
        
        if (building.type === 'cbe') {
            // Commercial Bank of Ethiopia (Diamond/Tapered)
            ctx.beginPath();
            ctx.moveTo(x, groundY);
            ctx.lineTo(x, groundY - building.height * 0.7);
            ctx.lineTo(x + building.width / 2, groundY - building.height);
            ctx.lineTo(x + building.width, groundY - building.height * 0.7);
            ctx.lineTo(x + building.width, groundY);
            ctx.fill();
            
            // Glass effect lines
            ctx.strokeStyle = "rgba(100, 200, 255, 0.3)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x + building.width/2, groundY - building.height);
            ctx.lineTo(x + building.width/2, groundY);
            ctx.stroke();

        } else if (building.type === 'au') {
            // African Union (Main Tower cylinder)
            ctx.fillRect(x, groundY - building.height, building.width, building.height);
            // Dome/Top
            ctx.beginPath();
            ctx.arc(x + building.width/2, groundY - building.height, building.width/2, Math.PI, 0);
            ctx.fill();
            
        } else {
            // Normal building
            ctx.fillRect(x, groundY - building.height, building.width, building.height);
            // Windows
            building.windows.forEach((win) => {
              const winX = x + 5 + win.col * 15;
              const winY = groundY - building.height + 10 + win.row * 20;
              ctx.fillStyle = win.lit
                ? "rgba(255, 200, 100, 0.8)"
                : "rgba(50, 50, 80, 0.5)";
              ctx.fillRect(winX, winY, 8, 12);
            });
        }
      });
    } else if (this.pattern === "image") {
        if (this.imageLoaded) {
            // Draw image repeating
            const aspect = this.image.width / this.image.height;
            const drawHeight = canvasHeight; // Full height
            const drawWidth = drawHeight * aspect;
            
            let x = -this.offset % drawWidth;
            if (x > 0) x -= drawWidth;
            
            while (x < canvasWidth) {
                // Dim the image slightly for background feel
                ctx.globalAlpha = 0.6;
                ctx.drawImage(this.image, x, 0, drawWidth, drawHeight);
                x += drawWidth;
            }
            ctx.globalAlpha = 1;
        } else {
             // Fallback while loading (or if missing) - simplified mountains
             ctx.fillStyle = "#1a1a2e";
             ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        }
    } else if (this.pattern === "grid") {
      // Neon grid floor
      ctx.strokeStyle = CONFIG.COLORS.groundLine;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.3;

      const gridSize = 50;
      const perspectiveY = groundY;

      // Vertical lines
      for (let x = -this.offset % gridSize; x < canvasWidth; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, perspectiveY);
        ctx.lineTo(x, canvasHeight);
        ctx.stroke();
      }

      // Horizontal lines
      for (let y = perspectiveY; y < canvasHeight; y += 15) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvasWidth, y);
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
    }
  }
}

class Background {
  constructor() {
    this.layers = [
      // Image background replaces stars/mountains/buildings for a cleaner photo look
       new ParallaxLayer(0.2, "transparent", 0, 0, "image"),
       new ParallaxLayer(1, "transparent", 0, 0, "grid"),
    ];
  }

  init(canvasWidth, canvasHeight) {
    this.layers.forEach((layer) => layer.init(canvasWidth, canvasHeight));
  }

  update(gameSpeed) {
    this.layers.forEach((layer) => layer.update(gameSpeed));
  }

  draw(ctx, canvasWidth, canvasHeight) {
    this.layers.forEach((layer) => layer.draw(ctx, canvasWidth, canvasHeight));
  }

  reset() {
    this.layers.forEach((layer) => {
      layer.offset = 0;
      layer.initialized = false;
    });
  }
}

// ============================================
// SOUND MANAGER (Web Audio API Synthesizer)
// ============================================
class SoundManager {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.3; // Lower volume
        this.masterGain.connect(this.ctx.destination);
        this.enabled = false; // Game sounds disabled to prioritize background music
    }

    resume() {
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playTone(freq, type, duration, startTime = 0) {
        if (!this.enabled) return;
        
        // Resume context if suspended (browser policy)
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type; // 'sine', 'square', 'sawtooth', 'triangle'
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + startTime);
        
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime + startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + startTime + duration);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(this.ctx.currentTime + startTime);
        osc.stop(this.ctx.currentTime + startTime + duration);
    }

    playJump() {
        this.playTone(400, 'square', 0.1);
        this.playTone(600, 'square', 0.1, 0.05);
    }

    playDoubleJump() {
        this.playTone(600, 'sawtooth', 0.1);
        this.playTone(900, 'sawtooth', 0.1, 0.05);
    }

    playCoin() {
        this.playTone(1500, 'sine', 0.08); // High coin ping
        this.playTone(2500, 'sine', 0.1, 0.05);
    }

    playSlide() {
        this.playTone(200, 'triangle', 0.15);
        this.playTone(150, 'triangle', 0.15, 0.05);
    }

    playCollect() {
        this.playTone(1200, 'sine', 0.1);
        this.playTone(1800, 'sine', 0.2, 0.05);
    }

    playCrash() {
        this.playTone(150, 'sawtooth', 0.3);
        this.playTone(100, 'sawtooth', 0.4, 0.1);
        this.playTone(50, 'square', 0.4, 0.2);
    }

    playLevelUp() {
        this.playTone(400, 'sine', 0.1);
        this.playTone(600, 'sine', 0.1, 0.1);
        this.playTone(800, 'sine', 0.3, 0.2);
    }
}

// ============================================
// PLAYER CLASS
// ============================================
class Player {
  constructor(groundY) {
    this.groundY = groundY;
    this.reset();
  }

  reset(game) {
    this.game = game; // Reference to game for sounds
    this.x = CONFIG.PLAYER_X_POSITION;
    this.y = this.groundY - CONFIG.PLAYER_HEIGHT;
    this.width = CONFIG.PLAYER_WIDTH;
    this.height = CONFIG.PLAYER_HEIGHT;
    this.velocityY = 0;
    this.isJumping = false;
    this.isSliding = false;
    this.canDoubleJump = false;
    this.hasDoubleJumped = false;
    this.slideTimer = 0;
    this.hasShield = false;
    this.shieldTimer = 0;
    this.hasDoubleJumpPower = false;
    this.scoreMultiplier = 1;
    this.multiplierTimer = 0;
    this.runFrame = 0;
    this.frameTimer = 0;
    this.trailTimer = 0;
  }

  jump() {
    if (!this.isJumping) {
      // First jump
      this.velocityY = CONFIG.JUMP_FORCE;
      this.isJumping = true;
      this.isSliding = false;
      this.hasDoubleJumped = false;
      if (this.game && this.game.sound) this.game.sound.playJump();
      return true;
    } else if (this.hasDoubleJumpPower && !this.hasDoubleJumped) {
      // Double jump (power-up)
      this.velocityY = CONFIG.DOUBLE_JUMP_FORCE;
      this.hasDoubleJumped = true;
      if (this.game && this.game.sound) this.game.sound.playDoubleJump();
      return true;
    }
    return false;
  }

  slide() {
    if (!this.isJumping && !this.isSliding) {
      this.isSliding = true;
      this.slideTimer = CONFIG.SLIDE_DURATION;
      this.height = CONFIG.PLAYER_SLIDE_HEIGHT;
      this.y = this.groundY - CONFIG.PLAYER_SLIDE_HEIGHT;
      if (this.game && this.game.sound) this.game.sound.playSlide();
      return true;
    }
    return false;
  }

  update(deltaTime) {
    // Apply gravity
    this.velocityY += CONFIG.GRAVITY;
    this.y += this.velocityY;

    // Ground collision
    const currentGroundY =
      this.groundY -
      (this.isSliding ? CONFIG.PLAYER_SLIDE_HEIGHT : CONFIG.PLAYER_HEIGHT);
    if (this.y >= currentGroundY) {
      this.y = currentGroundY;
      this.velocityY = 0;
      this.isJumping = false;
      this.hasDoubleJumped = false;
    }

    // Slide timer
    if (this.isSliding) {
      this.slideTimer -= deltaTime;
      if (this.slideTimer <= 0) {
        this.isSliding = false;
        this.height = CONFIG.PLAYER_HEIGHT;
        this.y = this.groundY - CONFIG.PLAYER_HEIGHT;
      }
    }

    // Shield timer
    if (this.hasShield) {
      this.shieldTimer -= deltaTime;
      if (this.shieldTimer <= 0) {
        this.hasShield = false;
        // Revert color implemented in draw
      }
    }

    // Multiplier timer
    if (this.multiplierTimer > 0) {
      this.multiplierTimer -= deltaTime;
      if (this.multiplierTimer <= 0) {
        this.scoreMultiplier = 1;
      }
    }

    // Particle Trail - emit while running on ground
    if (!this.isJumping && !this.isSliding) {
        this.trailTimer += deltaTime;
        if (this.trailTimer > 50) { // Emit every 50ms
            this.trailTimer = 0;
            this.game.particles.emit(this.x, this.y + this.height, CONFIG.COLORS.player, 1);
        }
    }

    // Animation frame
    this.frameTimer += deltaTime;
    if (this.frameTimer > 100) {
      this.frameTimer = 0;
      this.runFrame = (this.runFrame + 1) % 4;
    }
  }

  draw(ctx) {
    ctx.save();

    // Shield effect
    if (this.hasShield) {
      ctx.strokeStyle = CONFIG.COLORS.powerupShield;
      ctx.lineWidth = 3;
      ctx.shadowColor = CONFIG.COLORS.powerupShield;
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(
        this.x + this.width / 2,
        this.y + this.height / 2,
        Math.max(this.width, this.height) / 2 + 10,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Player color changes based on state
    let playerColor = CONFIG.COLORS.player;
    if (this.hasShield) playerColor = CONFIG.COLORS.powerupShield;
    else if (this.scoreMultiplier > 1) playerColor = CONFIG.COLORS.powerupMultiplier;

    ctx.fillStyle = playerColor;
    ctx.shadowColor = playerColor;
    ctx.shadowBlur = 15;

    if (this.isSliding) {
      // Sliding pose - horizontal rectangle
      ctx.fillRect(this.x, this.y, this.width + 10, this.height);
      // Head
      ctx.beginPath();
      ctx.arc(
        this.x + this.width,
        this.y + this.height / 2,
        15,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    } else {
      // Running/Jumping character
      const bodyX = this.x + this.width / 2;
      const bodyY = this.y;

      // Body
      ctx.fillRect(this.x + 10, this.y + 25, 30, 35);

      // Head
      ctx.beginPath();
      ctx.arc(bodyX, bodyY + 15, 15, 0, Math.PI * 2);
      ctx.fill();

      // Legs (animated when running)
      const legOffset = this.isJumping
        ? 0
        : Math.sin((this.runFrame * Math.PI) / 2) * 10;
      ctx.fillRect(this.x + 12, this.y + 55, 10, 25 + legOffset);
      ctx.fillRect(this.x + 28, this.y + 55, 10, 25 - legOffset);

      // Double jump indicator
      if (this.hasDoubleJumpPower) {
        ctx.strokeStyle = CONFIG.COLORS.powerupDoubleJump;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(bodyX, bodyY + this.height / 2, 35, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    ctx.restore();
  }

  getCollisionBox() {
    // Slightly smaller hitbox for fair collision
    const padding = 8;
    return {
      x: this.x + padding,
      y: this.y + padding,
      width: this.width - padding * 2,
      height: this.height - padding * 2,
    };
  }

  activateShield() {
    this.hasShield = true;
    this.shieldTimer = CONFIG.SHIELD_DURATION;
  }

  activateDoubleJump() {
    this.hasDoubleJumpPower = true;
  }

  activateMultiplier() {
      this.scoreMultiplier = 2;
      this.multiplierTimer = CONFIG.MULTIPLIER_DURATION;
  }
}

// ============================================
// OBSTACLE CLASS
// ============================================
class Obstacle {
  constructor(x, type, groundY) {
    this.x = x;
    this.type = type;
    this.groundY = groundY;
    this.passed = false;

    // Set dimensions based on type
    switch (type) {
      case "ground":
        this.width = Utils.randomInt(30, 50);
        this.height = Utils.randomInt(40, 70);
        this.y = groundY - this.height;
        break;
      case "air":
        this.width = Utils.randomInt(60, 100);
        this.height = 30;
        this.y = groundY - 100;
        break;
      case "double":
        // Two obstacles - ground and air
        this.width = 40;
        this.height = 50;
        this.y = groundY - this.height;
        this.airY = groundY - 120;
        this.airHeight = 25;
        break;
      case "tall":
        // Requires sliding
        this.width = 60;
        this.height = 130;
        this.y = groundY - this.height;
        break;
      case "long":
        // Longer ground obstacle
        this.width = 150;
        this.height = 40;
        this.y = groundY - this.height;
        break;
    }
  }

  update(gameSpeed) {
    this.x -= gameSpeed;
  }

  draw(ctx) {
    ctx.save();
    ctx.shadowColor = CONFIG.COLORS.obstacleGlow;
    ctx.shadowBlur = 10;
    ctx.fillStyle = CONFIG.COLORS.obstacle;

    if (this.type === "ground") {
      // Spike/Crystal obstacle
      ctx.beginPath();
      ctx.moveTo(this.x, this.groundY);
      ctx.lineTo(this.x + this.width / 2, this.y);
      ctx.lineTo(this.x + this.width, this.groundY);
      ctx.closePath();
      ctx.fill();

      // Inner glow line
      ctx.strokeStyle = "#ff66cc";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(this.x + this.width / 2, this.y + 10);
      ctx.lineTo(this.x + this.width / 2, this.groundY - 10);
      ctx.stroke();
    } else if (this.type === "air") {
      // Floating barrier
      ctx.fillRect(this.x, this.y, this.width, this.height);

      // Warning stripes
      ctx.fillStyle = "#ff0066";
      for (let i = 0; i < this.width; i += 20) {
        ctx.fillRect(this.x + i, this.y, 10, this.height);
      }
    } else if (this.type === "double") {
      // Ground obstacle
      ctx.beginPath();
      ctx.moveTo(this.x, this.groundY);
      ctx.lineTo(this.x + this.width / 2, this.y);
      ctx.lineTo(this.x + this.width, this.groundY);
      ctx.closePath();
      ctx.fill();

      // Air obstacle
      ctx.fillRect(this.x - 10, this.airY, this.width + 20, this.airHeight);
    } else if (this.type === "tall") {
        // High block - must slide under
        ctx.fillRect(this.x, this.y, this.width, this.height - 40);
        ctx.fillStyle = "#ffcc00";
        ctx.fillRect(this.x, this.y + this.height - 45, this.width, 5);
    } else if (this.type === "long") {
        // Wide spike pit / long barrier
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.fillStyle = "#ff3300";
        for (let i=0; i<this.width; i+=30) {
            ctx.beginPath();
            ctx.moveTo(this.x + i, this.y);
            ctx.lineTo(this.x + i + 15, this.y - 15);
            ctx.lineTo(this.x + i + 30, this.y);
            ctx.fill();
        }
    }

    ctx.restore();
  }

  getCollisionBoxes() {
    const boxes = [];
    const padding = 5;

    if (this.type === "double") {
      // Ground hitbox
      boxes.push({
        x: this.x + padding,
        y: this.y + padding,
        width: this.width - padding * 2,
        height: this.height - padding,
      });
      // Air hitbox
      boxes.push({
        x: this.x - 10 + padding,
        y: this.airY + padding,
        width: this.width + 20 - padding * 2,
        height: this.airHeight - padding * 2,
      });
    } else if (this.type === "tall") {
        boxes.push({
            x: this.x + padding,
            y: this.y + padding,
            width: this.width - padding * 2,
            height: this.height - 40, // Gap for sliding
        });
    } else {
      boxes.push({
        x: this.x + padding,
        y: this.y + padding,
        width: this.width - padding * 2,
        height: this.height - padding * 2,
      });
    }

    return boxes;
  }

  isOffScreen() {
    return this.x + this.width < 0;
  }
}

// ============================================
// POWER-UP CLASS
// ============================================
class PowerUp {
  constructor(x, type, groundY) {
    this.x = x;
    this.type = type; // 'shield' or 'doubleJump'
    this.y = groundY - 80;
    this.width = 30;
    this.height = 30;
    this.collected = false;
    this.bobOffset = 0;
  }

  update(gameSpeed) {
    this.x -= gameSpeed;
    this.bobOffset = Math.sin(Date.now() * 0.005) * 10;
  }

  draw(ctx) {
    if (this.collected) return;

    const displayY = this.y + this.bobOffset;

    ctx.save();
    ctx.shadowBlur = 20;

    if (this.type === "shield") {
      ctx.shadowColor = CONFIG.COLORS.powerupShield;
      ctx.fillStyle = CONFIG.COLORS.powerupShield;

      // Shield icon
      ctx.beginPath();
      ctx.moveTo(this.x + 15, this.y - 15 + this.bobOffset);
      ctx.lineTo(this.x + 30, displayY);
      ctx.lineTo(this.x + 25, displayY + 20);
      ctx.lineTo(this.x + 15, displayY + 28);
      ctx.lineTo(this.x + 5, displayY + 20);
      ctx.lineTo(this.x, displayY);
      ctx.closePath();
      ctx.fill();
      ctx.fill();
    } else if (this.type === "doubleJump") {
      ctx.shadowColor = CONFIG.COLORS.powerupDoubleJump;
      ctx.fillStyle = CONFIG.COLORS.powerupDoubleJump;

      // Double arrow icon
      ctx.beginPath();
      ctx.moveTo(this.x + 15, displayY - 10);
      ctx.lineTo(this.x + 25, displayY);
      ctx.lineTo(this.x + 20, displayY);
      ctx.lineTo(this.x + 20, displayY + 5);
      ctx.lineTo(this.x + 25, displayY + 5);
      ctx.lineTo(this.x + 15, displayY + 15);
      ctx.lineTo(this.x + 5, displayY + 5);
      ctx.lineTo(this.x + 10, displayY + 5);
      ctx.lineTo(this.x + 10, displayY);
      ctx.lineTo(this.x + 5, displayY);
      ctx.closePath();
      ctx.fill();
    } else if (this.type === "multiplier") {
        ctx.shadowColor = CONFIG.COLORS.powerupMultiplier;
        ctx.fillStyle = CONFIG.COLORS.powerupMultiplier;
        // 'X2' text or symbol
        ctx.font = "bold 20px " + "var(--font-display)"; // Using css var font
        ctx.textAlign = "center";
        ctx.fillText("X2", this.x + 15, displayY + 20);
    }

    ctx.restore();
  }

  getCollisionBox() {
    return {
      x: this.x,
      y: this.y + this.bobOffset - 15,
      width: this.width,
      height: this.height + 15,
    };
  }

  isOffScreen() {
    return this.x + this.width < 0;
  }
}

// ============================================
// OBSTACLE MANAGER
// ============================================
class ObstacleManager {
  constructor(groundY, canvasWidth) {
    this.groundY = groundY;
    this.canvasWidth = canvasWidth;
    this.obstacles = [];
    this.powerUps = [];
    this.coins = [];
    this.nextObstacleX = canvasWidth + 200;
    this.difficulty = 1;
  }

  reset() {
    this.obstacles = [];
    this.powerUps = [];
    this.coins = [];
    this.nextObstacleX = this.canvasWidth + 200;
    this.difficulty = 1;
  }

  update(gameSpeed, score, level) { // Added level parameter
    // Update difficulty based on level instead of just score
    this.difficulty = 1 + (level * 0.15); // Increase difficulty with level

    // Update existing obstacles
    this.obstacles.forEach((obs) => obs.update(gameSpeed));
    this.obstacles = this.obstacles.filter((obs) => !obs.isOffScreen());

    // Update power-ups
    this.powerUps.forEach((pu) => pu.update(gameSpeed));
    this.powerUps = this.powerUps.filter(
      (pu) => !pu.isOffScreen() && !pu.collected,
    );

    // Update coins
    this.coins.forEach((c) => c.update(gameSpeed));
    this.coins = this.coins.filter((c) => c.x + c.width > 0 && !c.collected);

    // Spawn new obstacles
    this.nextObstacleX -= gameSpeed;
    if (this.nextObstacleX <= this.canvasWidth) {
      this.spawnObstacle(level);
    }

    // Random power-up spawn
    if (
      Math.random() <
      CONFIG.POWERUP_CHANCE * (gameSpeed / CONFIG.INITIAL_SPEED)
    ) {
      this.spawnPowerUp();
    }
  }

  spawnObstacle(level) {
    let type;
    const rand = Math.random();
    
    // Progressive complexity based on level
    if (level === 1) {
      type = "ground";
    } else if (level === 2) {
      type = rand < 0.7 ? "ground" : "air";
    } else if (level === 3) {
      if (rand < 0.5) type = "ground";
      else if (rand < 0.8) type = "air";
      else type = "double";
    } else if (level === 4) {
      if (rand < 0.4) type = "ground";
      else if (rand < 0.7) type = "air";
      else if (rand < 0.85) type = "double";
      else type = "tall";
    } else {
      // Level 5+ uses all types
      if (rand < 0.3) type = "ground";
      else if (rand < 0.5) type = "air";
      else if (rand < 0.7) type = "double";
      else if (rand < 0.85) type = "tall";
      else type = "long";
    }

    this.obstacles.push(
      new Obstacle(this.canvasWidth + 50, type, this.groundY),
    );

    // Calculate gap until next obstacle (decreases with difficulty)
    const minGap = Math.max(
      200,
      CONFIG.MIN_OBSTACLE_GAP - this.difficulty * 30,
    );
    const maxGap = Math.max(
      300,
      CONFIG.MAX_OBSTACLE_GAP - this.difficulty * 50,
    );
    const gap = Utils.random(minGap, maxGap);
    this.nextObstacleX = this.canvasWidth + gap;

    // Spawn Coins in the gap!
    if (gap > 350 && Math.random() < 0.7) {
        this.spawnCoinPattern(this.canvasWidth + 100, gap - 100);
    }
  }

  spawnPowerUp() {
    const rand = Math.random();
    let type = 'shield';
    if (rand < 0.4) type = 'shield';
    else if (rand < 0.7) type = 'doubleJump';
    else type = 'multiplier';
    
    const x = this.canvasWidth + Utils.random(100, 300);
    this.powerUps.push(new PowerUp(x, type, this.groundY));
  }

  spawnCoinPattern(startX, availableWidth) {
      // Simple line of coins or arc
      const pattern = Math.random() > 0.5 ? 'line' : 'arc';
      const coinCount = Math.min(5, Math.floor(availableWidth / 50));
      
      for(let i=0; i<coinCount; i++) {
          let x = startX + i * 50;
          let y = this.groundY - 50; // Ground level default
          
          if (pattern === 'arc') {
              // Parabola arc for jumping
               y = this.groundY - 50 - Math.sin((i / (coinCount-1 || 1)) * Math.PI) * 150;
          }
          
          this.coins.push(new Coin(x, y));
      }
  }

  draw(ctx) {
    this.obstacles.forEach((obs) => obs.draw(ctx));
    this.powerUps.forEach((pu) => pu.draw(ctx));
    this.coins.forEach((c) => c.draw(ctx));
  }

  checkCollisions(player, particles) {
    const playerBox = player.getCollisionBox();

    // Check Coin Collisions
    for (let i = this.coins.length - 1; i >= 0; i--) {
        const coin = this.coins[i];
        if (coin.collected) continue;
        
        // Simple circle/box collision
        if (player.x < coin.x + coin.width &&
            player.x + player.width > coin.x &&
            player.y < coin.y + coin.height &&
            player.y + player.height > coin.y) {
                
                coin.collected = true;
                player.game.sound.playCoin();
                player.game.score += 50; // Bonus score
                player.game.floatingTexts.push(
                    new FloatingText(coin.x, coin.y, "+50", "#FFFF00")
                );
            }
    }

    // Check obstacle collisions
    for (const obstacle of this.obstacles) {
      const boxes = obstacle.getCollisionBoxes();
      for (const box of boxes) {
        if (Utils.checkCollision(playerBox, box)) {
          // Shatter particles regardless of outcome
          particles.emit(
             box.x + box.width/2, 
             box.y + box.height/2, 
             CONFIG.COLORS.obstacle, 
             15
          );

          if (player.hasShield) {
            player.hasShield = false;
            player.game.sound.playCrash(); // Shield break
            particles.emit(
              player.x + player.width / 2,
              player.y + player.height / 2,
              CONFIG.COLORS.powerupShield,
              20,
            );
            return false;
          }
          return true; // Collision!
        }
      }
    }

    // Check power-up collisions
    for (const powerUp of this.powerUps) {
      if (
        !powerUp.collected &&
        Utils.checkCollision(playerBox, powerUp.getCollisionBox())
      ) {
        powerUp.collected = true;
        player.game.sound.playCollect();
        if (powerUp.type === "shield") {
          player.activateShield();
          player.game.floatingTexts.push(new FloatingText(player.x, player.y, "SHIELD!", CONFIG.COLORS.powerupShield));
        } else if (powerUp.type === "doubleJump") {
          player.activateDoubleJump();
          player.game.floatingTexts.push(new FloatingText(player.x, player.y, "DBL JUMP!", CONFIG.COLORS.powerupDoubleJump));
        } else {
            player.activateMultiplier();
            player.game.floatingTexts.push(new FloatingText(player.x, player.y, "2X SCORE!", CONFIG.COLORS.powerupMultiplier));
        }
        particles.emit(
          powerUp.x + powerUp.width / 2,
          powerUp.y,
          powerUp.type === "shield"
            ? CONFIG.COLORS.powerupShield
            : (powerUp.type === "multiplier" ? CONFIG.COLORS.powerupMultiplier : CONFIG.COLORS.powerupDoubleJump),
          15,
        );
      }
    }

    return false;
  }
}

// ============================================
// INPUT HANDLER
// ============================================
class InputHandler {
  constructor(game) {
    this.game = game;
    this.touchStartY = 0;
    this.setupKeyboardControls();
    this.setupTouchControls();
  }

  setupKeyboardControls() {
    document.addEventListener("keydown", (e) => {
      if (this.game.state === GameState.PLAYING) {
        switch (e.code) {
          case "Space":
          case "ArrowUp":
          case "KeyW":
            e.preventDefault();
            this.game.playerJump();
            break;
          case "ArrowDown":
          case "KeyS":
            e.preventDefault();
            this.game.playerSlide();
            break;
          case "Escape":
          case "KeyP":
            this.game.togglePause();
            break;
        }
      } else if (this.game.state === GameState.PAUSED) {
        if (e.code === "Escape" || e.code === "KeyP") {
          this.game.togglePause();
        }
      } else if (this.game.state === GameState.START) {
        if (e.code === "Space" || e.code === "Enter") {
          this.game.startGame();
        }
      } else if (this.game.state === GameState.GAMEOVER) {
        if (e.code === "Space" || e.code === "Enter") {
          this.game.restartGame();
        }
      }
    });
  }

  setupTouchControls() {
    // Specific touch areas
    const jumpArea = document.getElementById("touch-area-jump");
    const slideArea = document.getElementById("touch-area-slide");

    if (jumpArea) {
        jumpArea.addEventListener("touchstart", (e) => {
            e.preventDefault();
            if (this.game.state === GameState.PLAYING) {
                this.game.playerJump();
            } else if (this.game.state === GameState.START || this.game.state === GameState.GAMEOVER) {
                 // Tap jump area to start/restart too for convenience
                 if (this.game.state === GameState.START) this.game.startGame();
                 else this.game.restartGame();
            }
        }, { passive: false });
    }

    if (slideArea) {
        slideArea.addEventListener("touchstart", (e) => {
            e.preventDefault();
            if (this.game.state === GameState.PLAYING) {
                this.game.playerSlide();
            }
        }, { passive: false });
    }
    
    // Fallback swipe on canvas still useful? Maybe remove if strictly mapped.
    // Keeping swipe on main canvas for backup or specific "screen" interactions
  }
}

// ============================================
// UI MANAGER
// ============================================
class UIManager {
  constructor() {
    // Screen elements
    this.startScreen = document.getElementById("start-screen");
    this.pauseScreen = document.getElementById("pause-screen");
    this.gameoverScreen = document.getElementById("gameover-screen");
    this.hud = document.getElementById("hud");
    this.pauseBtn = document.getElementById("pause-btn");
    this.reviveBtn = document.getElementById("revive-btn");

    // Score displays
    this.currentScoreEl = document.getElementById("current-score");
    this.highScoreEl = document.getElementById("high-score");
    this.pauseScoreEl = document.getElementById("pause-current-score");
    this.finalScoreEl = document.getElementById("final-score");
    this.finalHighScoreEl = document.getElementById("final-high-score");
    this.newRecordEl = document.getElementById("new-record");
    
    // Level Display (Create dynamically if not in HTML yet)
    this.levelDisplay = document.createElement('div');
    this.levelDisplay.id = 'level-display';
    this.levelDisplay.style.position = 'absolute';
    this.levelDisplay.style.top = '80px'; // Below score
    this.levelDisplay.style.left = '50%';
    this.levelDisplay.style.transform = 'translateX(-50%)';
    this.levelDisplay.style.fontFamily = 'var(--font-display)';
    this.levelDisplay.style.fontSize = '1.5rem';
    this.levelDisplay.style.color = CONFIG.COLORS.levelText;
    this.levelDisplay.style.textShadow = '0 0 10px ' + CONFIG.COLORS.levelText;
    this.levelDisplay.style.opacity = '0';
    this.levelDisplay.style.transition = 'opacity 0.5s';
    this.levelDisplay.innerText = 'LEVEL 1';
    document.getElementById('game-container').appendChild(this.levelDisplay);

    this.leaderboardEl = document.getElementById("leaderboard-list");
  }

  renderLeaderboard(data) {
    if (!this.leaderboardEl) return;
    this.leaderboardEl.innerHTML = data.map((item, index) => `
        <li class="leaderboard-item">
            <span class="leaderboard-rank">#${index + 1}</span>
            <span class="leaderboard-score">${item.score}</span>
        </li>
    `).join('');
  }

  showScreen(screenName) {
    this.startScreen.classList.add("hidden");
    this.pauseScreen.classList.add("hidden");
    this.gameoverScreen.classList.add("hidden");
    this.hud.classList.add("hidden");
    this.pauseBtn.classList.add("hidden");

    switch (screenName) {
      case "start":
        this.startScreen.classList.remove("hidden");
        break;
      case "playing":
        this.hud.classList.remove("hidden");
        this.pauseBtn.classList.remove("hidden");
        break;
      case "paused":
        this.pauseScreen.classList.remove("hidden");
        break;
      case "gameover":
        this.gameoverScreen.classList.remove("hidden");
        break;
    }
  }

  updateScore(score, highScore) {
    const scoreText = Math.floor(score).toString();
    const highScoreText = Math.floor(highScore).toString();

    this.currentScoreEl.textContent = scoreText;
    this.highScoreEl.textContent = highScoreText;
    this.pauseScoreEl.textContent = scoreText;
  }

  showLevelUp(level) {
    this.levelDisplay.innerText = `LEVEL ${level}`;
    this.levelDisplay.style.opacity = '1';
    this.levelDisplay.style.transform = 'translateX(-50%) scale(1.5)';
    
    setTimeout(() => {
        this.levelDisplay.style.transform = 'translateX(-50%) scale(1)';
        setTimeout(() => {
            this.levelDisplay.style.opacity = '0';
        }, 2000);
    }, 500);
  }

  showGameOver(score, highScore, isNewRecord, canRevive, leaderboardData) {
    this.finalScoreEl.textContent = Math.floor(score);
    this.finalHighScoreEl.textContent = Math.floor(highScore);

    if (isNewRecord) {
      this.newRecordEl.classList.remove("hidden");
    } else {
      this.newRecordEl.classList.add("hidden");
    }

    if (canRevive) {
      this.reviveBtn.classList.remove("hidden");
    } else {
      this.reviveBtn.classList.add("hidden");
    }

    if (leaderboardData) {
      this.renderLeaderboard(leaderboardData);
    }

    this.showScreen("gameover");
  }
}

// ============================================
// MAIN GAME CLASS
// ============================================
class Game {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");

    this.state = GameState.START;
    this.score = 0;
    this.highScore = Storage.getHighScore();
    this.gameSpeed = CONFIG.INITIAL_SPEED;
    this.level = 1;
    this.nextLevelScore = CONFIG.LEVEL_DURATION;
    this.musicStarted = false;
    this.revivalUsed = false;

    // Set canvas size
    this.resizeCanvas();
    window.addEventListener("resize", () => this.resizeCanvas());

    // Calculate ground position
    this.groundY = this.canvas.height - 60;

    // Initialize game objects
    this.sound = new SoundManager();
    this.background = new Background();
    this.player = new Player(this.groundY);
    this.player.reset(this); // Pass game reference
    this.obstacleManager = new ObstacleManager(this.groundY, this.canvas.width);
    this.particles = new ParticleSystem();
    this.floatingTexts = []; // Initialize floating texts
    this.ui = new UIManager();
    this.inputHandler = new InputHandler(this);

    // Timing
    this.lastTime = 0;
    this.deltaTime = 0;

    // Setup UI event listeners
    this.setupUIListeners();

    // Initialize background
    this.background.init(this.canvas.width, this.canvas.height);

    // Start render loop
    this.ui.showScreen("start");
    this.ui.updateScore(0, this.highScore);
    requestAnimationFrame((time) => this.gameLoop(time));
  }

  resizeCanvas() {
    const container = document.getElementById("game-container");
    this.canvas.width = container.clientWidth;
    this.canvas.height = container.clientHeight;
    this.groundY = this.canvas.height - 60;

    if (this.player) {
      this.player.groundY = this.groundY;
    }
    if (this.obstacleManager) {
      this.obstacleManager.groundY = this.groundY;
      this.obstacleManager.canvasWidth = this.canvas.width;
    }
    if (this.background && this.background.layers[0].initialized) {
      this.background.init(this.canvas.width, this.canvas.height);
    }
  }

  setupUIListeners() {
    document
      .getElementById("start-slow-btn")
      .addEventListener("click", () => this.startGame(CONFIG.SPEEDS.SLOW));
    document
      .getElementById("start-medium-btn")
      .addEventListener("click", () => this.startGame(CONFIG.SPEEDS.MEDIUM));
    document
      .getElementById("start-fast-btn")
      .addEventListener("click", () => this.startGame(CONFIG.SPEEDS.FAST));

    document
      .getElementById("resume-btn")
      .addEventListener("click", () => this.togglePause());
    document
      .getElementById("restart-from-pause-btn")
      .addEventListener("click", () => this.restartGame());
    document
      .getElementById("restart-btn")
      .addEventListener("click", () => this.restartGame());
    document
      .getElementById("pause-btn")
      .addEventListener("click", () => this.togglePause());
    document
      .getElementById("revive-btn")
      .addEventListener("click", () => this.revivePlayer());
  }

  startGame(speed) {
    this.sound.resume(); // Ensure audio context is unlocked
    this.state = GameState.PLAYING;
    this.score = 0;
    this.level = 1;
    this.nextLevelScore = CONFIG.LEVEL_DURATION;
    this.gameSpeed = speed || CONFIG.INITIAL_SPEED;
    this.player.reset(this);
    this.player.groundY = this.groundY;
    this.obstacleManager.reset();
    this.particles.clear();
    this.background.reset();
    this.background.init(this.canvas.width, this.canvas.height);
    this.ui.showScreen("playing");
    this.revivalUsed = false; // Reset revival on new game
    
    // Start Music
    const music = document.getElementById("bg-music");
    if (music) {
        music.currentTime = 20; // Start from 20 seconds
        music.volume = 0.5;
        music.play().catch(e => console.log("Music play blocked", e));
    }
  }

  restartGame() {
    this.startGame();
  }

  togglePause() {
    if (this.state === GameState.PLAYING) {
      this.state = GameState.PAUSED;
      this.ui.showScreen("paused");
    } else if (this.state === GameState.PAUSED) {
      this.state = GameState.PLAYING;
      this.ui.showScreen("playing");
      this.lastTime = performance.now();
    }
    
    // Music Pause/Play
    const music = document.getElementById("bg-music");
    if (music) {
        if (this.state === GameState.PAUSED) music.pause();
        else if (this.state === GameState.PLAYING) music.play().catch(e => {});
    }
  }

  gameOver() {
    this.state = GameState.GAMEOVER;
    this.sound.playCrash();

    // Emit death particles
    this.particles.emit(
      this.player.x + this.player.width / 2,
      this.player.y + this.player.height / 2,
      CONFIG.COLORS.player,
      30,
    );

    // Check for new high score
    const isNewRecord = this.score > this.highScore;
    if (isNewRecord) {
      this.highScore = Math.floor(this.score);
      Storage.setHighScore(this.highScore);
    }
    
    // Stop music on game over
    const music = document.getElementById("bg-music");
    if (music) {
        music.pause();
    }

    // Save to leaderboard
    const lbData = Storage.saveToLeaderboard(this.score);

    const canRevive = this.score >= 5000 && !this.revivalUsed;
    this.ui.showGameOver(this.score, this.highScore, isNewRecord, canRevive, lbData);
  }

  revivePlayer() {
    this.revivalUsed = true;
    this.state = GameState.PLAYING;
    this.player.y = this.groundY - CONFIG.PLAYER_HEIGHT;
    this.player.velocityY = 0;
    this.player.activateShield(); // Protection for 5s
    this.obstacleManager.obstacles = []; // Clear current obstacles
    
    this.ui.showScreen("playing");

    // Resume music
    const music = document.getElementById("bg-music");
    if (music) {
        music.play().catch(e => {});
    }
  }

  playerJump() {
    if (this.player.jump()) {
      this.particles.emit(
        this.player.x + this.player.width / 2,
        this.player.y + this.player.height,
        CONFIG.COLORS.player,
        5,
      );
    }
  }

  playerSlide() {
    this.player.slide();
  }

  update(deltaTime) {
    if (this.state !== GameState.PLAYING) return;

    // Update score with multiplier
    this.score += this.gameSpeed * CONFIG.SCORE_MULTIPLIER * this.player.scoreMultiplier;

    // Level Up System
    if (this.score >= this.nextLevelScore && this.level < CONFIG.MAX_LEVEL) {
        this.level++;
        this.nextLevelScore += CONFIG.LEVEL_DURATION;
        // this.gameSpeed += CONFIG.SPEED_INCREMENT_PER_LEVEL; // Disabled speed increase
        this.sound.playLevelUp();
        this.ui.showLevelUp(this.level);
        
        // Visual flair - emit particles
        this.particles.emit(
            this.canvas.width / 2, 
            this.canvas.height / 3, 
            CONFIG.COLORS.levelText, 
            50
        );
    } 
    // else if (this.gameSpeed < CONFIG.MAX_SPEED + (this.level * 0.5)) {
    //    // Minor gradual increase within level
    //    this.gameSpeed += CONFIG.SPEED_INCREMENT * deltaTime;
    // }

    // Update game objects
    this.background.update(this.gameSpeed);
    this.player.update(deltaTime);
    this.obstacleManager.update(this.gameSpeed, this.score, this.level);
    this.particles.update();

    // Update floating texts
    this.floatingTexts.forEach(ft => ft.update());
    this.floatingTexts = this.floatingTexts.filter(ft => ft.life > 0);

    // Check collisions
    if (this.obstacleManager.checkCollisions(this.player, this.particles)) {
      this.gameOver();
    }

    // Update UI
    this.ui.updateScore(this.score, this.highScore);
  }

  draw() {
    // Clear canvas
    this.ctx.fillStyle = "#0a0a0f";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw background
    this.background.draw(this.ctx, this.canvas.width, this.canvas.height);

    // Draw ground
    this.ctx.fillStyle = CONFIG.COLORS.ground;
    this.ctx.fillRect(
      0,
      this.groundY,
      this.canvas.width,
      this.canvas.height - this.groundY,
    );

    // Ground line glow
    this.ctx.strokeStyle = CONFIG.COLORS.groundLine;
    this.ctx.lineWidth = 3;
    this.ctx.shadowColor = CONFIG.COLORS.groundLine;
    this.ctx.shadowBlur = 10;
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.groundY);
    this.ctx.lineTo(this.canvas.width, this.groundY);
    this.ctx.stroke();
    this.ctx.shadowBlur = 0;

    // Draw game objects
    this.obstacleManager.draw(this.ctx);
    this.player.draw(this.ctx);
    this.particles.draw(this.ctx);

    // Draw floating texts
    this.floatingTexts.forEach(ft => ft.draw(this.ctx));
  }

  gameLoop(currentTime) {
    this.deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    // Cap delta time to prevent large jumps
    if (this.deltaTime > 100) this.deltaTime = 16.67;

    this.update(this.deltaTime);
    this.draw();

    requestAnimationFrame((time) => this.gameLoop(time));
  }
}

// ============================================
document.addEventListener("DOMContentLoaded", () => {
  window.game = new Game();
});
