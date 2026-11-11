import sys
import os

game_path = 'js/game.js'
with open(game_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Normalize CRLF to LF for reliable multiline matching
has_crlf = '\r\n' in content
code = content.replace('\r\n', '\n')

replacements = []

# 1. CONFIG.SCORE
old_score = """    SCORE: {
      BREAK_ICE: 100,
      DEFEAT_DUCK: 300,
      DEFEAT_PENGUIN: 400,
      DEFEAT_BIRD: 500,
      COLLECT_VEGGIE_BASE: 500,
      REACH_SUMMIT: 10000,
      MOUNTAIN_CLEAR: 3000
    },"""

new_score = """    SCORE: {
      BREAK_ICE: 100,
      DEFEAT_DUCK: 500,
      DEFEAT_DUCK_GOLDEN: 1000,
      DEFEAT_PENGUIN: 750,
      DEFEAT_BIRD: 500,
      COLLECT_VEGGIE_BASE: 500,
      REACH_SUMMIT: 10000,
      MOUNTAIN_CLEAR: 3000
    },"""
replacements.append(("CONFIG.SCORE", old_score, new_score))

# 2. DuckEnemy stompDefeat
old_duck_stomp = """    // Mario-style Stomp Defeat
    stompDefeat(player, level) {
      if (this.isDefeated || this.isFlattened) return;
      this.isDefeated = true;
      this.isFlattened = true;
      this.flattenTimer = 22;
      this.isShocked = false;
      this.isCharging = false;
      this.hp = 0;

      player.addScore(CONFIG.SCORE.DEFEAT_DUCK);
      if (level && level.particleSystem) {
        level.particleSystem.spawnScorePopup(this.x, this.y - 12, `+${CONFIG.SCORE.DEFEAT_DUCK}`);
        level.particleSystem.spawnStompImpact(this.x + this.width / 2, this.y + 4);
      }
      SFX.stomp();
      SFX.quack();
    }"""

new_duck_stomp = """    // Mario-style Stomp Defeat
    stompDefeat(player, level) {
      if (this.isDefeated || this.isFlattened) return;
      this.isDefeated = true;
      this.isFlattened = true;
      this.flattenTimer = 24;
      this.isShocked = false;
      this.isCharging = false;
      this.hp = 0;

      const pts = (this.variant === 'golden') ? CONFIG.SCORE.DEFEAT_DUCK_GOLDEN : CONFIG.SCORE.DEFEAT_DUCK;
      player.addScore(pts);
      if (window.game && window.game.stats) {
        window.game.stats.ducksDefeated++;
        window.game.stats.totalDefeated++;
      }
      if (level && level.particleSystem) {
        level.particleSystem.spawnScorePopup(this.x + this.width / 2, this.y - 12, `+${pts}`);
        level.particleSystem.spawnStompImpact(this.x + this.width / 2, this.y + 4);
      }
      SFX.stomp();
      SFX.quack();
    }"""
replacements.append(("DuckEnemy.stompDefeat", old_duck_stomp, new_duck_stomp))

# 3. DuckEnemy hitByShockSock
old_duck_shock_pts = """        player.addScore(CONFIG.SCORE.DEFEAT_DUCK);
        if (level && level.particleSystem) {
          level.particleSystem.spawnScorePopup(this.x, this.y, `+${CONFIG.SCORE.DEFEAT_DUCK}`);
        }
        SFX.enemyDefeat();"""

new_duck_shock_pts = """        const pts = (this.variant === 'golden') ? CONFIG.SCORE.DEFEAT_DUCK_GOLDEN : CONFIG.SCORE.DEFEAT_DUCK;
        player.addScore(pts);
        if (window.game && window.game.stats) {
          window.game.stats.ducksDefeated++;
          window.game.stats.totalDefeated++;
        }
        if (level && level.particleSystem) {
          level.particleSystem.spawnScorePopup(this.x + this.width / 2, this.y, `+${pts}`);
        }
        SFX.enemyDefeat();"""
replacements.append(("DuckEnemy.hitByShockSock points", old_duck_shock_pts, new_duck_shock_pts))

# 4. DuckEnemy checkPlayerDamage
old_duck_damage = """    checkPlayerDamage(players) {
      if (this.isShocked || this.isDefeated || this.isFlattened || this.hp <= 0) return;
      const myBox = this.getBounds();
      const enemyTopY = this.y;

      for (const p of players) {
        if (!p.isAlive || p.isInvulnerable) continue;

        const playerFeetY = p.y + p.height;
        const prevFeetY = p.prevY + p.height;
        const isFalling = (p.vy > 0);

        // 1. Mario-style Stomp Collision Check (Checked FIRST before any touch damage!)
        const pLeft = p.x + 3;
        const pRight = p.x + p.width - 3;
        const eLeft = this.x + 2;
        const eRight = this.x + this.width - 2;
        const horizOverlap = (pRight >= eLeft && pLeft <= eRight);
        const fromAbove = (prevFeetY <= enemyTopY + 10 && playerFeetY >= enemyTopY - 4 && playerFeetY <= enemyTopY + 24);

        if (isFalling && horizOverlap && fromAbove) {
          // Stomp succeeds!
          this.stompDefeat(p, window.game ? window.game.levelManager : null);
          p.y = enemyTopY - p.height;
          p.vy = -5.8; // Bounce upward
          p.isGrounded = false;
          p.state = 'jump';
          p.stompTimer = 12;
          p.invulnerableTimer = 8;
          return;
        }

        // 2. Airborne Dodge Clearance
        const isAirborne = (!p.isGrounded || p.state === 'jump' || p.state === 'fall' || Math.abs(p.vy) > 0.5);
        if (isAirborne && playerFeetY <= enemyTopY + 6) {
          continue; // Pass cleanly overhead
        }

        // 3. Ground / side collision: player takes damage
        if (aabbIntersect(myBox, p.getBounds())) {
          p.takeDamage();
        }
      }
    }"""

new_duck_damage = """    checkPlayerDamage(players) {
      if (this.isShocked || this.isDefeated || this.isFlattened || this.hp <= 0) return;
      const myBox = this.getBounds();
      const enemyTopY = this.y;
      const enemyMidY = this.y + this.height * 0.65;

      for (const p of players) {
        if (!p.isAlive || p.isInvulnerable) continue;

        const playerFeetY = p.y + p.height;
        const prevFeetY = p.prevY + p.height;
        const isFalling = (p.vy >= -0.5 || p.state === 'fall' || playerFeetY >= prevFeetY);

        // 1. Mario-style Stomp Collision Check (Checked FIRST before any touch damage!)
        const pLeft = p.x + 2;
        const pRight = p.x + p.width - 2;
        const eLeft = this.x + 2;
        const eRight = this.x + this.width - 2;
        const horizOverlap = (pRight >= eLeft && pLeft <= eRight);
        const crossedHead = (prevFeetY <= enemyTopY + 12 && playerFeetY >= enemyTopY - 6);

        if (horizOverlap && (crossedHead || (playerFeetY <= enemyMidY && isFalling))) {
          // Stomp succeeds! Immediately defeat enemy and bounce player upward
          this.stompDefeat(p, window.game ? window.game.levelManager : null);
          p.y = enemyTopY - p.height;
          p.vy = -6.2; // Mario upward bounce
          p.isGrounded = false;
          p.state = 'jump';
          p.stompTimer = 16;
          p.invulnerableTimer = 16;
          return;
        }

        // 2. Airborne Overhead Clearance: if feet are above enemy, pass cleanly overhead
        if (playerFeetY <= enemyTopY + 4) {
          continue;
        }

        // 3. Ground / side collision: player takes damage only when feet are level with enemy body (not stomping)
        if (playerFeetY > enemyMidY && aabbIntersect(myBox, p.getBounds())) {
          p.takeDamage();
        }
      }
    }"""
replacements.append(("DuckEnemy.checkPlayerDamage", old_duck_damage, new_duck_damage))

# 5. PenguinEnemy stompDefeat
old_penguin_stomp = """    // Mario-style Stomp Defeat
    stompDefeat(player, level) {
      if (this.isDefeated || this.isFlattened) return;
      this.isDefeated = true;
      this.isFlattened = true;
      this.flattenTimer = 22;
      this.isShocked = false;
      this.isSliding = false;
      this.hp = 0;

      player.addScore(CONFIG.SCORE.DEFEAT_PENGUIN);
      if (level && level.particleSystem) {
        level.particleSystem.spawnScorePopup(this.x, this.y - 12, `+${CONFIG.SCORE.DEFEAT_PENGUIN}`);
        level.particleSystem.spawnStompImpact(this.x + this.width / 2, this.y + (this.isSliding ? 14 : 4));
      }
      SFX.stomp();
    }"""

new_penguin_stomp = """    // Mario-style Stomp Defeat
    stompDefeat(player, level) {
      if (this.isDefeated || this.isFlattened) return;
      this.isDefeated = true;
      this.isFlattened = true;
      this.flattenTimer = 24;
      this.isShocked = false;
      this.isSliding = false;
      this.hp = 0;

      const pts = CONFIG.SCORE.DEFEAT_PENGUIN;
      player.addScore(pts);
      if (window.game && window.game.stats) {
        window.game.stats.penguinsDefeated++;
        window.game.stats.totalDefeated++;
      }
      if (level && level.particleSystem) {
        level.particleSystem.spawnScorePopup(this.x + this.width / 2, this.y - 12, `+${pts}`);
        level.particleSystem.spawnStompImpact(this.x + this.width / 2, this.y + (this.isSliding ? 14 : 4));
      }
      SFX.stomp();
    }"""
replacements.append(("PenguinEnemy.stompDefeat", old_penguin_stomp, new_penguin_stomp))

# 6. PenguinEnemy hitByShockSock
old_penguin_shock_pts = """        player.addScore(CONFIG.SCORE.DEFEAT_PENGUIN);
        if (level && level.particleSystem) {
          level.particleSystem.spawnScorePopup(this.x, this.y, `+${CONFIG.SCORE.DEFEAT_PENGUIN}`);
        }
        SFX.enemyDefeat();"""

new_penguin_shock_pts = """        const pts = CONFIG.SCORE.DEFEAT_PENGUIN;
        player.addScore(pts);
        if (window.game && window.game.stats) {
          window.game.stats.penguinsDefeated++;
          window.game.stats.totalDefeated++;
        }
        if (level && level.particleSystem) {
          level.particleSystem.spawnScorePopup(this.x + this.width / 2, this.y, `+${pts}`);
        }
        SFX.enemyDefeat();"""
replacements.append(("PenguinEnemy.hitByShockSock points", old_penguin_shock_pts, new_penguin_shock_pts))

# 7. PenguinEnemy checkPlayerDamage
old_penguin_damage = """    checkPlayerDamage(players) {
      if (this.isShocked || this.isDefeated || this.isFlattened || this.hp <= 0) return;
      const myBox = this.getBounds();
      const enemyTopY = (this.isSliding) ? this.y + 14 : this.y;

      for (const p of players) {
        if (!p.isAlive || p.isInvulnerable) continue;

        const playerFeetY = p.y + p.height;
        const prevFeetY = p.prevY + p.height;
        const isFalling = (p.vy > 0);

        // 1. Mario-style Stomp Collision Check (Checked FIRST before any touch damage!)
        const pLeft = p.x + 3;
        const pRight = p.x + p.width - 3;
        const eLeft = this.x + 2;
        const eRight = this.x + this.width - 2;
        const horizOverlap = (pRight >= eLeft && pLeft <= eRight);
        const fromAbove = (prevFeetY <= enemyTopY + 10 && playerFeetY >= enemyTopY - 4 && playerFeetY <= enemyTopY + 24);

        if (isFalling && horizOverlap && fromAbove) {
          // Stomp succeeds!
          this.stompDefeat(p, window.game ? window.game.levelManager : null);
          p.y = enemyTopY - p.height;
          p.vy = -5.8; // Bounce upward
          p.isGrounded = false;
          p.state = 'jump';
          p.stompTimer = 12;
          p.invulnerableTimer = 8;
          return;
        }

        // 2. Airborne Dodge Clearance
        const isAirborne = (!p.isGrounded || p.state === 'jump' || p.state === 'fall' || Math.abs(p.vy) > 0.5);
        if (isAirborne && playerFeetY <= enemyTopY + 6) {
          continue; // Pass cleanly overhead
        }

        // 3. Ground / side collision: player takes damage
        if (aabbIntersect(myBox, p.getBounds())) {
          p.takeDamage();
        }
      }
    }"""

new_penguin_damage = """    checkPlayerDamage(players) {
      if (this.isShocked || this.isDefeated || this.isFlattened || this.hp <= 0) return;
      const myBox = this.getBounds();
      const enemyTopY = (this.isSliding) ? this.y + 14 : this.y;
      const enemyHeight = (this.isSliding) ? this.height - 14 : this.height;
      const enemyMidY = enemyTopY + enemyHeight * 0.65;

      for (const p of players) {
        if (!p.isAlive || p.isInvulnerable) continue;

        const playerFeetY = p.y + p.height;
        const prevFeetY = p.prevY + p.height;
        const isFalling = (p.vy >= -0.5 || p.state === 'fall' || playerFeetY >= prevFeetY);

        // 1. Mario-style Stomp Collision Check (Checked FIRST before any touch damage!)
        const pLeft = p.x + 2;
        const pRight = p.x + p.width - 2;
        const eLeft = this.x + 2;
        const eRight = this.x + this.width - 2;
        const horizOverlap = (pRight >= eLeft && pLeft <= eRight);
        const crossedHead = (prevFeetY <= enemyTopY + 12 && playerFeetY >= enemyTopY - 6);

        if (horizOverlap && (crossedHead || (playerFeetY <= enemyMidY && isFalling))) {
          // Stomp succeeds! Immediately defeat enemy and bounce player upward
          this.stompDefeat(p, window.game ? window.game.levelManager : null);
          p.y = enemyTopY - p.height;
          p.vy = -6.2; // Upward Mario bounce
          p.isGrounded = false;
          p.state = 'jump';
          p.stompTimer = 16;
          p.invulnerableTimer = 16;
          return;
        }

        // 2. Airborne Dodge Clearance: if feet are above enemy, pass cleanly overhead
        if (playerFeetY <= enemyTopY + 4) {
          continue;
        }

        // 3. Ground / side collision: player takes damage only when feet are level with enemy body (not stomping)
        if (playerFeetY > enemyMidY && aabbIntersect(myBox, p.getBounds())) {
          p.takeDamage();
        }
      }
    }"""
replacements.append(("PenguinEnemy.checkPlayerDamage", old_penguin_damage, new_penguin_damage))

# 8. CollisionSystem.checkEnemyStomp
old_stomp_sys = """    // Mario-style Enemy Stomp Check
    checkEnemyStomp(player, enemies) {
      if (!player.isAlive || player.isInvulnerable || player.vy <= 0) return false;

      const playerFeetY = player.y + player.height;
      const prevFeetY = player.prevY + player.height;
      const pLeft = player.x + 3;
      const pRight = player.x + player.width - 3;

      for (const e of enemies) {
        if (!e.isActive || e.isDefeated || e.isFlattened) continue;

        const eTop = (e.isSliding) ? e.y + 14 : e.y;
        const eLeft = e.x + 2;
        const eRight = e.x + e.width - 2;

        const horizOverlap = (pRight >= eLeft && pLeft <= eRight);
        const fromAbove = (prevFeetY <= eTop + 10 && playerFeetY >= eTop - 4 && playerFeetY <= eTop + 24);

        if (horizOverlap && fromAbove) {
          e.stompDefeat(player, this.level);
          player.y = eTop - player.height;
          player.vy = -5.8; // Upward Mario bounce
          player.isGrounded = false;
          player.state = 'jump';
          player.stompTimer = 12;
          player.invulnerableTimer = 8;
          return true;
        }
      }
      return false;
    }"""

new_stomp_sys = """    // Mario-style Enemy Stomp Check
    checkEnemyStomp(player, enemies) {
      if (!player.isAlive || player.isInvulnerable) return false;

      const playerFeetY = player.y + player.height;
      const prevFeetY = player.prevY + player.height;
      const pLeft = player.x + 2;
      const pRight = player.x + player.width - 2;

      for (const e of enemies) {
        if (!e.isActive || e.isDefeated || e.isFlattened || e.hp <= 0) continue;

        const eTop = (e.isSliding) ? e.y + 14 : e.y;
        const eHeight = (e.isSliding) ? e.height - 14 : e.height;
        const eMid = eTop + eHeight * 0.65;
        const eLeft = e.x + 2;
        const eRight = e.x + e.width - 2;

        const horizOverlap = (pRight >= eLeft && pLeft <= eRight);
        const isFalling = (player.vy >= -0.5 || player.state === 'fall' || playerFeetY >= prevFeetY);
        const crossedHead = (prevFeetY <= eTop + 12 && playerFeetY >= eTop - 6);

        if (horizOverlap && (crossedHead || (playerFeetY <= eMid && isFalling))) {
          e.stompDefeat(player, this.level);
          player.y = eTop - player.height;
          player.vy = -6.2; // Upward Mario bounce
          player.isGrounded = false;
          player.state = 'jump';
          player.stompTimer = 16;
          player.invulnerableTimer = 16;
          return true;
        }
      }
      return false;
    }"""
replacements.append(("CollisionSystem.checkEnemyStomp", old_stomp_sys, new_stomp_sys))

# 9. LevelManager.loadMountain
old_load_mountain = """    loadMountain(index) {
      this.currentMountainIndex = index;
      this.theme = THEMES[this.currentMountainIndex % THEMES.length];"""

new_load_mountain = """    loadMountain(index) {
      this.currentMountainIndex = index;
      if (window.game && window.game.stats) {
        window.game.stats.mountainsReached = Math.max(window.game.stats.mountainsReached, index + 1);
      }
      this.theme = THEMES[this.currentMountainIndex % THEMES.length];"""
replacements.append(("LevelManager.loadMountain", old_load_mountain, new_load_mountain))

# 10. UIManager.drawHUD
old_draw_hud = """    drawHUD(ctx, state) {
      const { players, highScore, mountainIndex, isBonusStage, bonusSeconds, isTwoPlayer } = state;

      // Clean translucent top bar across full 19:6 widescreen width
      ctx.fillStyle = 'rgba(6, 13, 36, 0.92)';
      ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, 30);

      // Bottom border line with cyan ice glow
      ctx.fillStyle = '#00e5ff';
      ctx.fillRect(0, 29, CONFIG.CANVAS_WIDTH, 1);

      ctx.textBaseline = 'middle';
      const hudY = 15;

      // --- LEFT SECTION: PLAYER 1 (AND 2P IF ACTIVE) ---
      ctx.textAlign = 'left';
      ctx.font = 'bold 12px -apple-system, sans-serif';
      ctx.fillStyle = '#4fc3f7';
      ctx.fillText('1P SCORE', 20, hudY);

      ctx.font = '900 13px "Courier New", Courier, monospace';
      ctx.fillStyle = '#ffffff';
      const p1ScoreStr = String(players[0] ? players[0].score : 0).padStart(6, '0');
      ctx.fillText(p1ScoreStr, 88, hudY);

      // Lives counter
      const p1Lives = players[0] ? Math.max(0, players[0].lives) : 0;
      ctx.font = 'bold 13px -apple-system, sans-serif';
      ctx.fillStyle = '#ff5252';
      ctx.fillText(`♥ × ${p1Lives}`, 160, hudY);

      if (isTwoPlayer && players[1]) {
        ctx.font = 'bold 12px -apple-system, sans-serif';
        ctx.fillStyle = '#ba68c8';
        ctx.fillText('2P SCORE', 230, hudY);

        ctx.font = '900 13px "Courier New", Courier, monospace';
        ctx.fillStyle = '#ffffff';
        const p2ScoreStr = String(players[1].score).padStart(6, '0');
        ctx.fillText(p2ScoreStr, 298, hudY);

        ctx.font = 'bold 13px -apple-system, sans-serif';
        ctx.fillStyle = '#f06292';
        ctx.fillText(`♥ × ${Math.max(0, players[1].lives)}`, 370, hudY);
      }

      // --- CENTER SECTION: TOP SCORE & BONUS TIMER ---
      ctx.textAlign = 'center';
      ctx.font = 'bold 12px -apple-system, sans-serif';
      ctx.fillStyle = '#ffd54f';
      ctx.fillText('TOP SCORE', 520, hudY);

      ctx.font = '900 13px "Courier New", Courier, monospace';
      ctx.fillStyle = '#ffffff';
      const hiScoreStr = String(highScore).padStart(6, '0');
      ctx.fillText(hiScoreStr, 600, hudY);

      if (isBonusStage) {
        ctx.font = '900 13px -apple-system, sans-serif';
        ctx.fillStyle = '#ffee58';
        ctx.fillText(`⚡ BONUS TIME : ${Math.max(0, Math.ceil(bonusSeconds))}s`, 720, hudY);
      }

      // --- RIGHT SECTION: CURRENT MOUNTAIN / THEME ---
      ctx.textAlign = 'left';
      ctx.font = 'bold 12px -apple-system, sans-serif';
      ctx.fillStyle = '#69f0ae';
      const themeName = THEMES[mountainIndex % THEMES.length].name.toUpperCase();
      ctx.fillText(`STAGE ${mountainIndex + 1} : ${themeName}`, 860, hudY);
    }"""

new_draw_hud = """    drawHUD(ctx, state) {
      const { players, runTimeRemaining, mountainIndex, isTwoPlayer } = state;

      // Clean translucent top bar across full 19:6 widescreen width
      ctx.fillStyle = 'rgba(6, 13, 36, 0.92)';
      ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, 30);

      // Bottom border line with cyan ice glow
      ctx.fillStyle = '#00e5ff';
      ctx.fillRect(0, 29, CONFIG.CANVAS_WIDTH, 1);

      ctx.textBaseline = 'middle';
      const hudY = 15;

      // --- LEFT SECTION: PLAYER 1 (AND 2P IF ACTIVE) ---
      ctx.textAlign = 'left';
      ctx.font = 'bold 12px -apple-system, sans-serif';
      ctx.fillStyle = '#4fc3f7';
      ctx.fillText('1P SCORE', 24, hudY);

      ctx.font = '900 14px "Courier New", Courier, monospace';
      ctx.fillStyle = '#ffffff';
      const p1ScoreStr = String(players[0] ? players[0].score : 0).padStart(6, '0');
      ctx.fillText(p1ScoreStr, 96, hudY);

      // Lives counter
      const p1Lives = players[0] ? Math.max(0, players[0].lives) : 0;
      ctx.font = 'bold 13px -apple-system, sans-serif';
      ctx.fillStyle = '#ff5252';
      ctx.fillText(`♥ × ${p1Lives}`, 174, hudY);

      if (isTwoPlayer && players[1]) {
        ctx.font = 'bold 12px -apple-system, sans-serif';
        ctx.fillStyle = '#ba68c8';
        ctx.fillText('2P SCORE', 236, hudY);

        ctx.font = '900 14px "Courier New", Courier, monospace';
        ctx.fillStyle = '#ffffff';
        const p2ScoreStr = String(players[1].score).padStart(6, '0');
        ctx.fillText(p2ScoreStr, 308, hudY);

        ctx.font = 'bold 13px -apple-system, sans-serif';
        ctx.fillStyle = '#f06292';
        ctx.fillText(`♥ × ${Math.max(0, players[1].lives)}`, 380, hudY);
      }

      // --- CENTER SECTION: 90-SECOND COUNTDOWN TIMER ---
      const centerX = CONFIG.CANVAS_WIDTH / 2;
      ctx.textAlign = 'center';
      const timeLeft = Math.max(0, runTimeRemaining !== undefined ? runTimeRemaining : 90);

      if (timeLeft > 10) {
        ctx.font = '900 15px "Courier New", Courier, monospace';
        ctx.fillStyle = '#ffeb3b'; // Arcade yellow
        ctx.shadowColor = 'rgba(255, 235, 59, 0.4)';
        ctx.shadowBlur = 6;
        ctx.fillText(`TIME: ${Math.ceil(timeLeft)}`, centerX, hudY);
      } else {
        // Low time warning pulse (<10s) with decimal
        const pulse = Math.sin(Date.now() * 0.015);
        ctx.font = '900 15px "Courier New", Courier, monospace';
        ctx.fillStyle = pulse > 0 ? '#ff1744' : '#ffeb3b';
        ctx.shadowColor = '#ff1744';
        ctx.shadowBlur = 10;
        ctx.fillText(`TIME: ${timeLeft.toFixed(1)}s`, centerX, hudY);
      }
      ctx.shadowBlur = 0;

      // --- RIGHT SECTION: CURRENT MOUNTAIN / STAGE THEME ---
      ctx.textAlign = 'right';
      ctx.font = 'bold 12px -apple-system, sans-serif';
      ctx.fillStyle = '#69f0ae';
      const themeName = THEMES[mountainIndex % THEMES.length].name.toUpperCase();
      ctx.fillText(`STAGE ${mountainIndex + 1} : ${themeName}`, CONFIG.CANVAS_WIDTH - 24, hudY);
    }"""
replacements.append(("UIManager.drawHUD", old_draw_hud, new_draw_hud))

# 11. UIManager.drawGameOver
old_draw_gameover = """    drawGameOver(ctx, players, highScore) {
      ctx.fillStyle = 'rgba(6, 12, 34, 0.9)';
      ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

      ctx.textAlign = 'center';
      ctx.font = '900 36px -apple-system, sans-serif';
      ctx.fillStyle = '#ef5350';
      ctx.fillText('GAME OVER', CONFIG.CANVAS_WIDTH / 2, 100);

      ctx.font = 'bold 16px -apple-system, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`FINAL SCORE : ${players[0].score}`, CONFIG.CANVAS_WIDTH / 2, 150);
      ctx.fillStyle = '#ffd54f';
      ctx.fillText(`TOP HIGH SCORE : ${highScore}`, CONFIG.CANVAS_WIDTH / 2, 185);

      ctx.font = '14px -apple-system, sans-serif';
      ctx.fillStyle = '#80deea';
      ctx.fillText('PRESS START / ENTER OR TAP TO PLAY AGAIN', CONFIG.CANVAS_WIDTH / 2, 250);
    }"""

new_draw_gameover = """    drawGameOver(ctx, players, stats, reason = 'LIVES_ZERO') {
      this.animTimer++;
      ctx.save();

      // Fullscreen dark backdrop
      ctx.fillStyle = 'rgba(4, 9, 28, 0.94)';
      ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

      const centerX = CONFIG.CANVAS_WIDTH / 2;
      const centerY = CONFIG.CANVAS_HEIGHT / 2;

      // Frosted Modal Card (centered, 660x310)
      const cardW = 660;
      const cardH = 310;
      const cardX = centerX - cardW / 2;
      const cardY = centerY - cardH / 2;

      ctx.fillStyle = 'rgba(10, 22, 54, 0.92)';
      ctx.strokeStyle = (reason === 'TIME_UP') ? '#ffd54f' : '#ff5252';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = (reason === 'TIME_UP') ? 'rgba(255, 213, 79, 0.5)' : 'rgba(255, 82, 82, 0.5)';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, 20);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Header: TIME'S UP! or GAME OVER
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '900 28px -apple-system, sans-serif';
      if (reason === 'TIME_UP') {
        ctx.fillStyle = '#ffeb3b';
        ctx.shadowColor = '#ffd54f';
        ctx.shadowBlur = 12;
        ctx.fillText("⏰ TIME'S UP!", centerX, cardY + 34);
      } else {
        ctx.fillStyle = '#ff5252';
        ctx.shadowColor = '#d50000';
        ctx.shadowBlur = 12;
        ctx.fillText("💀 GAME OVER", centerX, cardY + 34);
      }
      ctx.shadowBlur = 0;

      // FINAL SCORE
      const scoreVal = players[0] ? players[0].score : 0;
      const scoreStr = String(scoreVal).padStart(6, '0');
      ctx.font = 'bold 11px -apple-system, sans-serif';
      ctx.fillStyle = '#80deea';
      ctx.fillText('FINAL SCORE', centerX, cardY + 68);

      ctx.font = '900 32px "Courier New", Courier, monospace';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 8;
      ctx.fillText(scoreStr, centerX, cardY + 96);
      ctx.shadowBlur = 0;

      // Stats Grid - 5 sleek stat pills
      const runStats = stats || { totalDefeated: 0, ducksDefeated: 0, penguinsDefeated: 0, mountainsReached: 1 };
      const remainingLives = players[0] ? Math.max(0, players[0].lives) : 0;

      const statItems = [
        { label: 'TOTAL FOES', val: runStats.totalDefeated, icon: '⚡', color: '#ffca28' },
        { label: 'DUCKS', val: runStats.ducksDefeated, icon: '🦆', color: '#66bb6a' },
        { label: 'PENGUINS', val: runStats.penguinsDefeated, icon: '🐧', color: '#42a5f5' },
        { label: 'STAGE REACHED', val: runStats.mountainsReached, icon: '🏔', color: '#ab47bc' },
        { label: 'LIVES LEFT', val: remainingLives, icon: '♥', color: '#ef5350' }
      ];

      const pillW = 112;
      const pillH = 50;
      const gap = 12;
      const totalPillsW = statItems.length * pillW + (statItems.length - 1) * gap;
      const startPillX = centerX - totalPillsW / 2;
      const pillY = cardY + 130;

      statItems.forEach((st, idx) => {
        const px = startPillX + idx * (pillW + gap);
        // Pill background
        ctx.fillStyle = 'rgba(6, 14, 38, 0.75)';
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.25)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.roundRect(px, pillY, pillW, pillH, 10);
        ctx.fill();
        ctx.stroke();

        // Value with icon
        ctx.font = '900 16px -apple-system, sans-serif';
        ctx.fillStyle = st.color;
        ctx.fillText(`${st.icon} ${st.val}`, px + pillW / 2, pillY + 18);

        // Label
        ctx.font = 'bold 9px -apple-system, sans-serif';
        ctx.fillStyle = '#b0bec5';
        ctx.fillText(st.label, px + pillW / 2, pillY + 36);
      });

      // Interactive PLAY AGAIN Button
      const btnW = 240;
      const btnH = 44;
      const btnX = centerX - btnW / 2;
      const btnY = cardY + 204;

      const pulse = Math.sin(this.animTimer * 0.08);
      const btnGlow = 10 + pulse * 4;

      const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
      btnGrad.addColorStop(0, '#00e676');
      btnGrad.addColorStop(1, '#00b0ff');

      ctx.fillStyle = btnGrad;
      ctx.shadowColor = '#00e676';
      ctx.shadowBlur = btnGlow;
      ctx.beginPath();
      ctx.roundRect(btnX, btnY, btnW, btnH, 22);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.font = '900 16px -apple-system, sans-serif';
      ctx.fillStyle = '#041624';
      ctx.fillText('▶ PLAY AGAIN', centerX, btnY + btnH / 2);

      // Subtext prompt
      ctx.font = 'bold 11px -apple-system, sans-serif';
      ctx.fillStyle = '#80deea';
      ctx.fillText('CLICK / TAP BUTTON OR PRESS SPACE / ENTER', centerX, cardY + 276);

      ctx.restore();
    }"""
replacements.append(("UIManager.drawGameOver", old_draw_gameover, new_draw_gameover))

# 12. IceBreakerGame constructor
old_game_init = """      this.highScore = 10000;
      try {
        const saved = localStorage.getItem('icebreaker_highscore_19_6');
        if (saved) this.highScore = parseInt(saved, 10) || 10000;
      } catch (e) {}"""

new_game_init = """      this.runTimeRemaining = 90.0;
      this.gameOverReason = 'LIVES_ZERO';
      this.stats = {
        totalDefeated: 0,
        ducksDefeated: 0,
        penguinsDefeated: 0,
        mountainsReached: 1
      };"""
replacements.append(("IceBreakerGame constructor", old_game_init, new_game_init))

# 13. IceBreakerGame startNewGame
old_start_new_game = """    startNewGame(isTwoPlayer = false) {
      this.isTwoPlayer = isTwoPlayer;
      this.levelManager.loadMountain(0);
      this.players = [];"""

new_start_new_game = """    startNewGame(isTwoPlayer = false) {
      this.isTwoPlayer = isTwoPlayer;
      this.runTimeRemaining = 90.0;
      this.gameOverReason = 'LIVES_ZERO';
      this.stats = {
        totalDefeated: 0,
        ducksDefeated: 0,
        penguinsDefeated: 0,
        mountainsReached: 1
      };
      this.levelManager.loadMountain(0);
      this.players = [];"""
replacements.append(("IceBreakerGame.startNewGame", old_start_new_game, new_start_new_game))

# 14. IceBreakerGame update - timer & game over
old_game_update_play = """        case 'PLAYING':
          const p1Key = this.keyboard.getPlayer1State(this.isTwoPlayer);"""

new_game_update_play = """        case 'PLAYING':
          // 90-second countdown timer for current run
          this.runTimeRemaining = Math.max(0, this.runTimeRemaining - (this.stepSize / 1000));
          if (this.runTimeRemaining <= 0) {
            this.runTimeRemaining = 0;
            this.gameOverReason = 'TIME_UP';
            this.state = 'GAME_OVER';
            Music.play('gameover');
            SFX.death();
            break;
          }

          const p1Key = this.keyboard.getPlayer1State(this.isTwoPlayer);"""
replacements.append(("IceBreakerGame.update countdown", old_game_update_play, new_game_update_play))

# 15. IceBreakerGame update - remove highscore and set reason on lives zero
old_game_over_check = """            if (p.score > this.highScore) {
              this.highScore = p.score;
              try { localStorage.setItem('icebreaker_highscore_19_6', String(this.highScore)); } catch (e) {}
            }
          }

          if (this.players.every(p => p.lives <= 0 && p.deathTimer <= 0)) {
            this.state = 'GAME_OVER';
            Music.play('gameover');
          }"""

new_game_over_check = """          }

          if (this.players.every(p => p.lives <= 0 && p.deathTimer <= 0)) {
            this.gameOverReason = 'LIVES_ZERO';
            this.state = 'GAME_OVER';
            Music.play('gameover');
          }"""
replacements.append(("IceBreakerGame.update highscore and lives zero", old_game_over_check, new_game_over_check))

# 16. IceBreakerGame render - HUD & GameOver calls
old_render_calls = """          this.ui.drawHUD(this.ctx, {
            players: this.players,
            highScore: this.highScore,
            mountainIndex: this.levelManager.currentMountainIndex,
            isBonusStage: this.levelManager.isBonusStage,
            bonusSeconds: this.levelManager.bonusTimer / 60,
            isTwoPlayer: this.isTwoPlayer
          });
          this.ui.drawStartPrompt(this.ctx);
          break;

        case 'PLAYING':
        case 'PAUSED':
          this.levelManager.draw(this.ctx, this.camera.y);
          for (const p of this.players) p.draw(this.ctx, this.camera.y);

          this.ui.drawHUD(this.ctx, {
            players: this.players,
            highScore: this.highScore,
            mountainIndex: this.levelManager.currentMountainIndex,
            isBonusStage: this.levelManager.isBonusStage,
            bonusSeconds: this.levelManager.bonusTimer / 60,
            isTwoPlayer: this.isTwoPlayer
          });

          if (this.levelManager.mountainCleared) {
            this.ui.drawStageComplete(this.ctx, this.levelManager.currentMountainIndex + 1, this.players[0].score);
          }

          if (this.state === 'PAUSED') this.ui.drawPause(this.ctx);
          break;

        case 'GAME_OVER':
          this.ui.drawGameOver(this.ctx, this.players, this.highScore);
          break;"""

new_render_calls = """          this.ui.drawHUD(this.ctx, {
            players: this.players,
            runTimeRemaining: this.runTimeRemaining,
            mountainIndex: this.levelManager.currentMountainIndex,
            isTwoPlayer: this.isTwoPlayer
          });
          this.ui.drawStartPrompt(this.ctx);
          break;

        case 'PLAYING':
        case 'PAUSED':
          this.levelManager.draw(this.ctx, this.camera.y);
          for (const p of this.players) p.draw(this.ctx, this.camera.y);

          this.ui.drawHUD(this.ctx, {
            players: this.players,
            runTimeRemaining: this.runTimeRemaining,
            mountainIndex: this.levelManager.currentMountainIndex,
            isTwoPlayer: this.isTwoPlayer
          });

          if (this.levelManager.mountainCleared) {
            this.ui.drawStageComplete(this.ctx, this.levelManager.currentMountainIndex + 1, this.players[0].score);
          }

          if (this.state === 'PAUSED') this.ui.drawPause(this.ctx);
          break;

        case 'GAME_OVER':
          this.ui.drawGameOver(this.ctx, this.players, this.stats, this.gameOverReason);
          break;"""
replacements.append(("IceBreakerGame.render HUD and GameOver", old_render_calls, new_render_calls))

# Perform and verify all replacements
for name, old_s, new_s in replacements:
    count = code.count(old_s)
    if count != 1:
        print(f"ERROR: Replacement '{name}' matched {count} times (expected 1)")
        sys.exit(1)
    code = code.replace(old_s, new_s)
    print(f"OK: {name}")

# Restore CRLF if needed
if has_crlf:
    code = code.replace('\n', '\r\n')

with open(game_path, 'w', encoding='utf-8') as f:
    f.write(code)

print("ALL REPLACEMENTS APPLIED SUCCESSFULLY!")
