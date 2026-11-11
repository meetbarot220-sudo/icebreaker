import sys

game_path = 'js/game.js'
with open(game_path, 'r', encoding='utf-8') as f:
    content = f.read()

has_crlf = '\r\n' in content
code = content.replace('\r\n', '\n')

# 1. Replace SFX.danceStep with clean platformer SFX.footstep
old_sfx = """    danceStep() {
      if (!APU.unlocked) return;
      APU.playTone({ freq: 280, slideTo: 360, duration: 0.05, volume: 0.15, type: 'sine' });
    },"""

new_sfx = """    footstep() {
      if (!APU.unlocked) return;
      APU.playNoise({ duration: 0.032, volume: 0.075, playbackRate: 1.9, filterFreq: 1850 });
    },"""

assert code.count(old_sfx) == 1, f"old_sfx match count: {code.count(old_sfx)}"
code = code.replace(old_sfx, new_sfx)
print("OK: SFX.footstep")

# 2. Replace CartoonArtist.drawShinchan completely
start_marker = "    // 1. Draw Shinchan Cartoon Hero (Bhuri-Bhuri Dance & Hairy Electric Shock Socks)"
end_marker = "    static drawClimber(ctx, p, screenY) {"
s_idx = code.find(start_marker)
e_idx = code.find(end_marker)
assert s_idx != -1 and e_idx != -1 and e_idx > s_idx, "drawShinchan bounds not found"

new_draw_shinchan = '''    // 1. Draw Redesigned Shinchan Cartoon Hero (Normal Platformer Animation & Authentic Reference Look)
    static drawShinchan(ctx, p, screenY) {
      ctx.save();
      const centerX = p.x + p.width / 2;
      const groundY = screenY + p.height;
      ctx.translate(centerX, groundY);

      // Mirror cleanly horizontally when facing left (-1)
      if (p.facing < 0 && p.state !== 'victory') {
        ctx.scale(-1, 1);
      }

      // Animation state & smooth continuous blend weights (0..1)
      const isSwinging = !!p.isSwinging || p.state === 'swing';
      const isHurt = (p.state === 'hurt') || (p.state === 'dead' && p.deathTimer > 68);
      const isDeadFall = (p.state === 'dead' && p.deathTimer <= 68);

      const mw = (p.moveWeight !== undefined) ? p.moveWeight : ((p.state === 'walk' || p.state === 'run') ? 1.0 : 0.0);
      const rw = (p.runWeight !== undefined) ? p.runWeight : (p.state === 'run' ? 1.0 : 0.0);
      const jw = (p.jumpWeight !== undefined) ? p.jumpWeight : (p.state === 'jump' ? 1.0 : 0.0);
      const fw = (p.fallWeight !== undefined) ? p.fallWeight : (p.state === 'fall' ? 1.0 : 0.0);
      const lw = (p.landWeight !== undefined) ? p.landWeight : (p.state === 'land' ? 1.0 : 0.0);
      const sw = (p.swingWeight !== undefined) ? p.swingWeight : (isSwinging ? 1.0 : 0.0);
      const airW = Math.min(1.0, jw + fw);

      const phase = (p.walkPhase !== undefined) ? p.walkPhase : 0;
      const sinP = Math.sin(phase);
      const cosP = Math.cos(phase);

      // Gentle idle breathing + crisp subtle step bob (zero dance bounce or hip sway!)
      const idleBreath = Math.sin(p.animTimer * 0.075) * 0.55 * (1.0 - mw) * (1.0 - airW);
      const stepBob = -Math.abs(sinP) * mw * (1.1 + rw * 1.1) * (1.0 - airW);
      const headBumpSquash = (p.headBumpTimer && p.headBumpTimer > 0) ? -2.2 : 0;
      const landDrop = lw * 2.6;
      const bodyBob = idleBreath + stepBob + landDrop + headBumpSquash;

      // Forward body lean when running; slight backward lean when hurt/falling defeated
      let bodyLean = (mw * (0.02 + rw * 0.11) * (1.0 - airW)) + (-0.06 * jw) + (0.06 * fw);
      if (isHurt) bodyLean = -0.22;
      if (isDeadFall) bodyLean = -0.35;

      // Crisp landing squash & stretch
      if (lw > 0.01) {
        ctx.scale(1.0 + lw * 0.15, 1.0 - lw * 0.14);
      }

      // Consistent palette matching Shinchan reference
      const outline = '#231411';
      const skinLight = '#ffe3ca';
      const skinBase = '#fed3b1';
      const skinShadow = '#e7ad86';
      const skinBack = '#efbe9b';
      const shirtLight = '#ff5252';
      const shirtBase = '#e53935';
      const shirtDark = '#b71c1c';
      const shortsLight = '#fff066';
      const shortsBase = '#fdd835';
      const shortsDark = '#f5a623';
      const sockWhite = '#ffffff';
      const sockShadow = '#dfe6ea';
      const shoeBase = '#d32f2f';
      const shoeDark = '#8e1414';
      const shoeHighlight = '#ff6b6b';

      // --- 1. GROUND DROP SHADOW ---
      const shadowScale = isDeadFall ? 0 : (1.0 - airW * 0.35);
      if (shadowScale > 0.05) {
        ctx.fillStyle = 'rgba(0, 14, 38, 0.42)';
        ctx.beginPath();
        ctx.ellipse(0, 0, 12.5 * shadowScale, 3.6 * shadowScale, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Helper for connected toddler leg + bare knee + white crew sock + red shoe
      const drawLeg = (hipX, hipY, footX, footY, toeTilt, isBack) => {
        ctx.save();
        // Bare toddler upper calf/knee segment connecting shorts cuff to white sock
        ctx.strokeStyle = outline;
        ctx.lineWidth = 4.6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(hipX, hipY);
        ctx.lineTo(footX, footY - 5.2);
        ctx.stroke();

        ctx.strokeStyle = isBack ? skinBack : skinBase;
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        ctx.moveTo(hipX, hipY);
        ctx.lineTo(footX, footY - 5.2);
        ctx.stroke();

        // Pivoted ankle / white sock + red cartoon shoe
        ctx.translate(footX, footY - 3.0);
        ctx.rotate(toeTilt);

        // White crew sock
        ctx.fillStyle = isBack ? sockShadow : sockWhite;
        ctx.strokeStyle = outline;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.roundRect(-3.0, -4.6, 6.0, 5.2, 1.8);
        ctx.fill();
        ctx.stroke();

        // Rounded Red Shoe
        ctx.fillStyle = isBack ? '#b71c1c' : shoeBase;
        ctx.beginPath();
        ctx.roundRect(-4.0, -0.8, 9.2, 4.2, [2.2, 3.6, 1.5, 1.5]);
        ctx.fill();
        ctx.stroke();

        // Glossy toe cap highlight
        if (!isBack) {
          ctx.fillStyle = shoeHighlight;
          ctx.beginPath();
          ctx.ellipse(2.2, 0.5, 2.0, 0.9, 0.15, 0, Math.PI * 2);
          ctx.fill();
        }

        // Dark shoe sole
        ctx.fillStyle = shoeDark;
        ctx.fillRect(-3.6, 2.3, 8.4, 1.2);
        ctx.restore();
      };

      // --- 2. ARTICULATED LEGS KINEMATICS (NO SLIDING / CLEAN STRIDE CYCLE) ---
      const strideAmp = mw * (5.2 + rw * 2.8) * (1.0 - airW);
      const liftAmp = mw * (3.8 + rw * 2.2) * (1.0 - airW);

      // Walk/Run grounded foot positions (back leg = phase + PI, front leg = phase)
      const gBackX = -4.2 - sinP * strideAmp;
      const gBackY = -Math.max(0, -cosP) * liftAmp - lw * 0.5;
      const gBackTilt = -cosP * mw * (0.22 + rw * 0.18) * (1.0 - airW);

      const gFrontX = 4.2 + sinP * strideAmp;
      const gFrontY = -Math.max(0, cosP) * liftAmp - lw * 0.5;
      const gFrontTilt = cosP * mw * (0.22 + rw * 0.18) * (1.0 - airW);

      // Jump / Fall / Hurt blended leg poses
      const jBackX = -5.0, jBackY = -2.2, jBackTilt = 0.36;
      const jFrontX = 5.4, jFrontY = -5.8, jFrontTilt = -0.32;

      const fBackX = -5.5, fBackY = -3.4, fBackTilt = 0.25;
      const fFrontX = 4.8, fFrontY = -1.6, fFrontTilt = -0.18;

      const groundMix = Math.max(0, 1.0 - airW);
      let backFootX = gBackX * groundMix + jBackX * jw + fBackX * fw;
      let backFootY = gBackY * groundMix + jBackY * jw + fBackY * fw;
      let backTilt  = gBackTilt * groundMix + jBackTilt * jw + fBackTilt * fw;

      let frontFootX = gFrontX * groundMix + jFrontX * jw + fFrontX * fw;
      let frontFootY = gFrontY * groundMix + jFrontY * jw + fFrontY * fw;
      let frontTilt  = gFrontTilt * groundMix + jFrontTilt * jw + fFrontTilt * fw;

      if (isHurt || isDeadFall) {
        backFootX = -5.5; backFootY = -4.5; backTilt = 0.45;
        frontFootX = 5.5; frontFootY = -3.0; frontTilt = -0.35;
      }

      const hipAnchorY = -10.5 + bodyBob;
      const hipShiftX = bodyLean * 2.5;

      // Draw Back Leg first
      drawLeg(-4.2 + hipShiftX, hipAnchorY, backFootX, backFootY, backTilt, true);

      // --- 3. BACK ARM (LEFT ARM - SWINGS OPPOSITE TO BACK LEG!) ---
      const armAmp = mw * (0.48 + rw * 0.34) * (1.0 - airW);
      let backArmAngle = (+sinP * armAmp) + (0.08 * (1.0 - mw) * (1.0 - airW));
      backArmAngle += (-0.95 * jw) + (-1.20 * fw) + (0.45 * sw);
      if (isHurt || isDeadFall) backArmAngle = -1.65;

      ctx.save();
      const backShoulderX = -5.8 + bodyLean * 8.0;
      const backShoulderY = -20.5 + bodyBob;
      ctx.translate(backShoulderX, backShoulderY);
      ctx.rotate(bodyLean + backArmAngle);

      // Darker shaded crimson sleeve behind torso
      ctx.fillStyle = shirtDark;
      ctx.strokeStyle = outline;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(-2.4, -1.0, 4.8, 8.6, 2.3);
      ctx.fill();
      ctx.stroke();

      // Chubby far skin hand
      ctx.fillStyle = skinBack;
      ctx.beginPath();
      ctx.arc(0, 8.5, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // --- 4. CHUBBY TORSO: YELLOW SHORTS & RED SHIRT ---
      ctx.save();
      ctx.translate(0, -10.0 + bodyBob);
      ctx.rotate(bodyLean);

      // Yellow Puffy Shorts (from local y=-4.5 down to +1.8)
      const shortsGrad = ctx.createLinearGradient(-9, -4, 9, 2);
      shortsGrad.addColorStop(0, shortsLight);
      shortsGrad.addColorStop(0.65, shortsBase);
      shortsGrad.addColorStop(1, shortsDark);
      ctx.fillStyle = shortsGrad;
      ctx.strokeStyle = outline;
      ctx.lineWidth = 1.7;
      ctx.beginPath();
      ctx.roundRect(-9.5, -4.5, 19.0, 6.8, [2.0, 2.0, 3.8, 3.8]);
      ctx.fill();
      ctx.stroke();

      // Clean shorts leg notch / inseam line
      ctx.strokeStyle = '#d48b0c';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-0.5, -0.8);
      ctx.lineTo(-0.5, 2.1);
      ctx.stroke();

      // Chubby Red Shirt (from local y=-13.2 down to -3.6 overlapping shorts slightly)
      const shirtGrad = ctx.createLinearGradient(-8, -13, 9, -4);
      shirtGrad.addColorStop(0, shirtLight);
      shirtGrad.addColorStop(0.55, shirtBase);
      shirtGrad.addColorStop(1, shirtDark);
      ctx.fillStyle = shirtGrad;
      ctx.strokeStyle = outline;
      ctx.lineWidth = 1.7;
      ctx.beginPath();
      // Slightly barrel/toddler tummy curve bulging gently forward on chest/tummy
      ctx.moveTo(-7.8, -12.6);
      ctx.quadraticCurveTo(0, -13.6, 8.0, -12.2);
      ctx.bezierCurveTo(10.2, -9.0, 10.6, -5.0, 9.2, -3.5);
      ctx.lineTo(-9.0, -3.5);
      ctx.bezierCurveTo(-10.0, -6.0, -9.2, -10.0, -7.8, -12.6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Red collar trim
      ctx.fillStyle = shirtDark;
      ctx.beginPath();
      ctx.arc(0.8, -12.6, 3.6, 0.05 * Math.PI, 0.95 * Math.PI);
      ctx.fill();

      ctx.restore();

      // Draw Front Leg (after shorts so torso overlaps hip cleanly!)
      drawLeg(4.0 + hipShiftX, hipAnchorY, frontFootX, frontFootY, frontTilt, false);

      // --- 5. ICONIC LARGE ROUND SHINCHAN HEAD (STABLE, UNOBSTRUCTED, REFERENCE ACCURATE) ---
      ctx.save();
      const headX = 1.0 + bodyLean * 12.5;
      const headY = -32.2 + bodyBob;
      ctx.translate(headX, headY);
      // Rock-solid upright head with only tiny comfortable sprint lean (no dance bobble!)
      ctx.rotate(bodyLean * 0.30);

      // Chubby Protruding Ear on back side of head
      ctx.fillStyle = skinBase;
      ctx.strokeStyle = outline;
      ctx.lineWidth = 1.7;
      ctx.beginPath();
      ctx.arc(-11.2, 0.8, 3.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Delicate inner ear curve
      ctx.strokeStyle = '#c58662';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.arc(-11.2, 0.8, 1.9, -Math.PI * 0.35, Math.PI * 0.45);
      ctx.stroke();

      // Shinchan Signature Head Shape:
      // Narrower bowl crown tapering down into signature wide puffed toddler cheeks!
      const faceGrad = ctx.createRadialGradient(2.5, -2.5, 2.0, 1.5, 1.0, 16.0);
      faceGrad.addColorStop(0, skinLight);
      faceGrad.addColorStop(0.68, skinBase);
      faceGrad.addColorStop(1, skinShadow);
      ctx.fillStyle = faceGrad;
      ctx.strokeStyle = outline;
      ctx.lineWidth = 1.85;

      ctx.beginPath();
      ctx.moveTo(-10.6, -2.5);
      // Rounded dome top
      ctx.bezierCurveTo(-10.8, -14.2, 6.2, -14.5, 9.6, -5.8);
      // Forehead into bulbous puffed front cheek
      ctx.bezierCurveTo(13.2, -3.5, 15.6, 2.5, 13.6, 6.8);
      // Wide soft cheek-jaw curve across chin
      ctx.bezierCurveTo(11.4, 10.6, 3.5, 11.2, -2.2, 10.6);
      // Plump rear jaw curving back up to ear
      ctx.bezierCurveTo(-8.8, 9.8, -11.4, 4.5, -10.6, -2.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Distinctive Short Black Bowl-Shaped Hair (matches shinchan_ref.png hairline & sideburn)
      ctx.fillStyle = '#141414';
      ctx.strokeStyle = outline;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-10.8, -1.8);
      ctx.bezierCurveTo(-10.8, -14.2, 6.2, -14.5, 9.6, -5.8);
      // Neat cropped bowl hairline across forehead with slight curve down to temple sideburn
      ctx.bezierCurveTo(4.0, -7.8, -3.0, -8.2, -6.8, -4.6);
      ctx.bezierCurveTo(-7.2, -1.0, -8.2, 1.5, -10.0, 1.0);
      ctx.bezierCurveTo(-10.6, 0.2, -10.8, -0.8, -10.8, -1.8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Subtle glossy hair reflection arc
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(-1.0, -6.5, 5.2, 1.25 * Math.PI, 1.75 * Math.PI);
      ctx.stroke();

      // Warm rosy cheek blushes
      ctx.fillStyle = 'rgba(255, 116, 116, 0.36)';
      ctx.beginPath();
      ctx.ellipse(9.4, 4.8, 3.2, 2.0, 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(-4.6, 4.6, 2.4, 1.6, -0.1, 0, Math.PI * 2);
      ctx.fill();

      // Eye positions (large expressive oval eyes!)
      const eyeLX = 1.4, eyeLY = -0.8;
      const eyeRX = 8.8, eyeRY = -0.6;
      const isBlinking = !isHurt && !isDeadFall && !isSwinging && (p.animTimer % 165 >= 159);

      if (isHurt || isDeadFall) {
        // Hurt / Defeat squeezed shock eyes (> <) & raised brows
        ctx.strokeStyle = '#0e0e0e';
        ctx.lineWidth = 1.9;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(-0.5, -2.5); ctx.lineTo(3.2, -0.8); ctx.lineTo(-0.5, 1.2);
        ctx.moveTo(10.5, -2.3); ctx.lineTo(7.2, -0.6); ctx.lineTo(10.5, 1.4);
        ctx.stroke();
      } else if (isBlinking) {
        // Gentle natural blink arc
        ctx.strokeStyle = '#0e0e0e';
        ctx.lineWidth = 1.9;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(eyeLX, eyeLY + 0.8, 3.2, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
        ctx.beginPath(); ctx.arc(eyeRX, eyeRY + 0.8, 3.0, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
      } else {
        // --- REFERENCE-ACCURATE LARGE GLOSSY BLACK OVAL EYES + UPPER CREASE + WHITE DOT ---
        // Thin curved upper eyelid creases above each eye
        ctx.strokeStyle = '#18110e';
        ctx.lineWidth = 1.1;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(eyeLX, eyeLY - 0.5, 3.9, 1.14 * Math.PI, 1.86 * Math.PI); ctx.stroke();
        ctx.beginPath(); ctx.arc(eyeRX, eyeRY - 0.5, 3.7, 1.14 * Math.PI, 1.86 * Math.PI); ctx.stroke();

        // Large pitch-black expressive oval eyes
        ctx.fillStyle = '#0d0d0d';
        ctx.beginPath(); ctx.ellipse(eyeLX, eyeLY, 3.1, 3.9, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(eyeRX, eyeRY, 2.9, 3.8, 0, 0, Math.PI * 2); ctx.fill();

        // Crisp white circular pupil reflection (looking slightly toward facing/motion)
        const lookY = (jw > 0.3) ? -0.9 : (fw > 0.3 ? 0.2 : -0.5);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(eyeLX + 0.35, eyeLY + lookY, 1.32, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(eyeRX + 0.35, eyeRY + lookY, 1.25, 0, Math.PI * 2); ctx.fill();
      }

      // --- SIGNATURE THICK ARCHED BLACK EYEBROWS (ALWAYS CRISP & PROMINENT!) ---
      const browLift = (isHurt || jw > 0.3) ? -1.1 : 0;
      ctx.strokeStyle = '#090909';
      ctx.lineWidth = 2.9;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(eyeLX, eyeLY - 3.6 + browLift, 3.9, 1.15 * Math.PI, 1.90 * Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(eyeRX, eyeRY - 3.5 + browLift, 3.7, 1.15 * Math.PI, 1.90 * Math.PI);
      ctx.stroke();

      // --- SMALL ROUNDED NOSE ---
      ctx.fillStyle = '#df9770';
      ctx.beginPath();
      ctx.ellipse(5.8, 2.9, 1.45, 0.95, 0.1, 0, Math.PI * 2);
      ctx.fill();

      // --- RECOGNIZABLE WIDE SHINCHAN MOUTH ---
      if (isHurt || isDeadFall) {
        // Wavy shocked O mouth
        ctx.fillStyle = '#7a1512';
        ctx.strokeStyle = outline;
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.ellipse(6.0, 7.0, 2.5, 2.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (isSwinging || jw > 0.4) {
        // Energetic wide open shout/exclamation mouth
        ctx.fillStyle = '#7a1512';
        ctx.strokeStyle = outline;
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.ellipse(6.0, 6.8, 2.9, 2.3, 0.08, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Coral tongue hint
        ctx.fillStyle = '#ff8a80';
        ctx.beginPath();
        ctx.ellipse(6.0, 7.9, 1.7, 0.9, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Iconic wide rounded 'O' / cheeky expression matching shinchan_ref.png!
        ctx.fillStyle = '#7a1512';
        ctx.strokeStyle = outline;
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.ellipse(5.8, 6.9, 2.4, 1.85, 0.08, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Cute coral inner tongue
        ctx.fillStyle = '#ff8a80';
        ctx.beginPath();
        ctx.ellipse(5.8, 7.7, 1.4, 0.75, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      // --- 6. FRONT ARM & ELECTRIC SHOCK SOCK WEAPON ---
      // Held cleanly at side/waist when walking/idle so it NEVER covers Shinchan's face!
      ctx.save();
      const frontShoulderX = 0.5 + bodyLean * 7.5;
      const frontShoulderY = -20.2 + bodyBob;

      let frontArmAngle = (-sinP * armAmp) + (0.14 * (1.0 - mw) * (1.0 - airW));
      frontArmAngle += (-0.75 * jw) + (-0.90 * fw);
      if (isHurt || isDeadFall) frontArmAngle = -1.45;

      let sockScale = 0.54;
      let sockLocalAngle = 0.15;

      if (isSwinging) {
        const swingProg = (CONFIG.TIMINGS.HAMMER_COOLDOWN - p.hammerTimer) / CONFIG.TIMINGS.HAMMER_COOLDOWN;
        // Dramatic overhead-to-forward cleave!
        frontArmAngle = -Math.PI * 0.85 + swingProg * Math.PI * 1.15;
        sockScale = 0.96;
        sockLocalAngle = -0.35;

        // Lightning arc swoosh trail around swing path
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.85)';
        ctx.lineWidth = 7;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(frontShoulderX + 6, frontShoulderY, 28, -Math.PI * 0.55, Math.min(0.45, -Math.PI * 0.55 + swingProg * Math.PI * 1.1));
        ctx.stroke();

        ctx.strokeStyle = '#ffea00';
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.arc(frontShoulderX + 6, frontShoulderY, 28, -Math.PI * 0.55, Math.min(0.45, -Math.PI * 0.55 + swingProg * Math.PI * 1.1));
        ctx.stroke();
      }

      ctx.translate(frontShoulderX, frontShoulderY);
      ctx.rotate(bodyLean + frontArmAngle);

      // Front shaded red sleeve (highlighted)
      const fArmGrad = ctx.createLinearGradient(-2, 0, 3, 9);
      fArmGrad.addColorStop(0, shirtLight);
      fArmGrad.addColorStop(1, shirtBase);
      ctx.fillStyle = fArmGrad;
      ctx.strokeStyle = outline;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(-2.5, -1.0, 5.0, 8.8, 2.4);
      ctx.fill();
      ctx.stroke();

      // Grip pivot at hand end (0, 8.8)
      ctx.save();
      ctx.translate(0, 8.8);
      ctx.rotate(sockLocalAngle);
      ctx.scale(sockScale, sockScale);
      // Translate down so the sock CUFF sits squarely inside his fist (no clipping over head!)
      ctx.translate(0, 15);
      CartoonArtist.drawHairyElectricSock(ctx, isSwinging || jw > 0.3);
      ctx.restore();

      // Front chubby hand gripping sock cuff cleanly on top
      ctx.fillStyle = skinBase;
      ctx.strokeStyle = outline;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 8.8, 3.0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.restore();
      ctx.restore();
    }

'''

code = code[:s_idx] + new_draw_shinchan + code[e_idx:]
print("OK: CartoonArtist.drawShinchan redesigned")

# 3. Replace Player animation variables and handleInput / update methods
old_player_vars = """      // Smooth Animation Blending Properties (60 FPS LERP)
      this.danceWeight = 0;   // 0 (idle) to 1 (full Bhuri Bhuri dance)
      this.dancePhase = 0;    // Continuous smooth phase accumulator
      this.jumpWeight = 0;    // 0 (grounded) to 1 (airborne)
      this.swingWeight = 0;   // 0 (not swinging) to 1 (swinging)
      this.landWeight = 0;    // 0 to 1 squash on landing
      this.headBumpTimer = 0; // Head-impact reaction when hitting blocks from below
      this.stompTimer = 0;    // Stomp bounce visual reaction"""

new_player_vars = """      // Smooth Platformer Animation Blending Properties (60 FPS LERP)
      this.moveWeight = 0;    // 0 (idle) to 1 (walking / running)
      this.runWeight = 0;     // 0 (walk speed) to 1 (sprint run speed)
      this.walkPhase = 0;     // Continuous alternating stride accumulator
      this.jumpWeight = 0;    // 0 (grounded) to 1 (rising jump)
      this.fallWeight = 0;    // 0 (grounded) to 1 (falling downward)
      this.swingWeight = 0;   // 0 (not swinging) to 1 (swinging)
      this.landWeight = 0;    // 0 to 1 squash on landing
      this.headBumpTimer = 0; // Head-impact reaction when hitting blocks from below
      this.stompTimer = 0;    // Stomp bounce visual reaction"""

assert code.count(old_player_vars) == 1, "old_player_vars match failed"
code = code.replace(old_player_vars, new_player_vars)
print("OK: Player constructor vars")

old_reset_vars = """      this.danceWeight = 0;
      this.jumpWeight = 0;
      this.swingWeight = 0;
      this.landWeight = 0;"""

new_reset_vars = """      this.moveWeight = 0;
      this.runWeight = 0;
      this.walkPhase = 0;
      this.jumpWeight = 0;
      this.fallWeight = 0;
      this.swingWeight = 0;
      this.landWeight = 0;"""

assert code.count(old_reset_vars) == 1, "old_reset_vars match failed"
code = code.replace(old_reset_vars, new_reset_vars)
print("OK: Player.resetPosition vars")

old_horiz_input = """      // 4. Horizontal movement & Dancing
      if (this.isGrounded) {
        if (inputState.left) {
          this.vx = Math.max(-CONFIG.PHYSICS.WALK_MAX_SPEED, this.vx - CONFIG.PHYSICS.WALK_ACCEL);
          this.facing = -1;
          if (this.state !== 'swing') this.state = 'walk';
        } else if (inputState.right) {
          this.vx = Math.min(CONFIG.PHYSICS.WALK_MAX_SPEED, this.vx + CONFIG.PHYSICS.WALK_ACCEL);
          this.facing = 1;
          if (this.state !== 'swing') this.state = 'walk';
        } else {
          this.vx *= CONFIG.PHYSICS.ICE_FRICTION;
          if (Math.abs(this.vx) < 0.1) {
            this.vx = 0;
            if (this.state !== 'swing') this.state = 'idle';
          }
        }
      } else {
        // Air steering
        if (inputState.left) {
          this.vx = Math.max(-CONFIG.PHYSICS.AIR_MAX_SPEED, this.vx - CONFIG.PHYSICS.AIR_STEER_ACCEL);
          this.facing = -1;
        } else if (inputState.right) {
          this.vx = Math.min(CONFIG.PHYSICS.AIR_MAX_SPEED, this.vx + CONFIG.PHYSICS.AIR_STEER_ACCEL);
          this.facing = 1;
        }
      }"""

new_horiz_input = """      // 4. Horizontal movement & normal platformer locomotion (walk -> run -> idle)
      if (this.isGrounded) {
        if (inputState.left) {
          // Brisk turn traction prevents sliding backward while facing left
          const accel = this.vx > 0.1 ? CONFIG.PHYSICS.WALK_ACCEL * 2.1 : CONFIG.PHYSICS.WALK_ACCEL;
          this.vx = Math.max(-CONFIG.PHYSICS.WALK_MAX_SPEED, this.vx - accel);
          this.facing = (this.vx <= 0.05) ? -1 : 1;
          if (this.state !== 'swing' && this.state !== 'land') {
            this.state = Math.abs(this.vx) >= 1.85 ? 'run' : 'walk';
          }
        } else if (inputState.right) {
          const accel = this.vx < -0.1 ? CONFIG.PHYSICS.WALK_ACCEL * 2.1 : CONFIG.PHYSICS.WALK_ACCEL;
          this.vx = Math.min(CONFIG.PHYSICS.WALK_MAX_SPEED, this.vx + accel);
          this.facing = (this.vx >= -0.05) ? 1 : -1;
          if (this.state !== 'swing' && this.state !== 'land') {
            this.state = Math.abs(this.vx) >= 1.85 ? 'run' : 'walk';
          }
        } else {
          this.vx *= CONFIG.PHYSICS.ICE_FRICTION;
          if (Math.abs(this.vx) < 0.14) {
            this.vx = 0;
            if (this.state !== 'swing' && this.state !== 'land') this.state = 'idle';
          } else if (this.state !== 'swing' && this.state !== 'land') {
            this.state = Math.abs(this.vx) >= 1.85 ? 'run' : 'walk';
          }
        }
      } else {
        // Air steering
        if (inputState.left) {
          this.vx = Math.max(-CONFIG.PHYSICS.AIR_MAX_SPEED, this.vx - CONFIG.PHYSICS.AIR_STEER_ACCEL);
          this.facing = -1;
        } else if (inputState.right) {
          this.vx = Math.min(CONFIG.PHYSICS.AIR_MAX_SPEED, this.vx + CONFIG.PHYSICS.AIR_STEER_ACCEL);
          this.facing = 1;
        }
      }"""

assert code.count(old_horiz_input) == 1, "old_horiz_input match failed"
code = code.replace(old_horiz_input, new_horiz_input)
print("OK: Player.handleInput")

old_update_blends = """      // Smooth 60 FPS animation blend weights
      const isMovingHoriz = this.isGrounded && Math.abs(this.vx) > 0.15 && (this.state === 'walk');
      const targetDanceWeight = isMovingHoriz ? 1.0 : 0.0;
      this.danceWeight += (targetDanceWeight - this.danceWeight) * 0.20;

      if (isMovingHoriz) {
        this.dancePhase += 0.24;
      }

      const isAir = !this.isGrounded || this.state === 'jump' || this.state === 'fall';
      const targetJumpWeight = isAir ? 1.0 : 0.0;
      this.jumpWeight += (targetJumpWeight - this.jumpWeight) * 0.22;"""

new_update_blends = """      // Smooth 60 FPS normal platformer animation blend weights
      const absVx = Math.abs(this.vx);
      const isMovingHoriz = this.isGrounded && absVx > 0.14;
      const targetMoveWeight = isMovingHoriz ? 1.0 : 0.0;
      this.moveWeight += (targetMoveWeight - this.moveWeight) * 0.28;

      const targetRunWeight = (isMovingHoriz && absVx >= 1.85) ? 1.0 : 0.0;
      this.runWeight += (targetRunWeight - this.runWeight) * 0.18;

      if (isMovingHoriz) {
        const prevSin = Math.sin(this.walkPhase);
        // Stride speed tied directly to velocity so ground-planted feet never slide
        this.walkPhase += 0.06 + absVx * 0.145;
        const currSin = Math.sin(this.walkPhase);
        if ((prevSin < 0 && currSin >= 0) || (prevSin > 0 && currSin <= 0)) {
          if (this.state === 'walk' || this.state === 'run') SFX.footstep();
        }
      } else if (this.isGrounded) {
        // Settle legs smoothly back to neutral standing stance
        const mod = ((this.walkPhase % Math.PI) + Math.PI) % Math.PI;
        if (mod > 0.16 && mod < Math.PI - 0.16) {
          this.walkPhase += (mod > Math.PI / 2 ? 0.16 : -0.16);
        }
      }

      const isJumpingAir = !this.isGrounded && (this.vy <= 0.4 || this.state === 'jump');
      const isFallingAir = !this.isGrounded && this.vy > 0.4;
      this.jumpWeight += ((isJumpingAir ? 1.0 : 0.0) - this.jumpWeight) * 0.28;
      this.fallWeight += ((isFallingAir ? 1.0 : 0.0) - this.fallWeight) * 0.26;"""

assert code.count(old_update_blends) == 1, "old_update_blends match failed"
code = code.replace(old_update_blends, new_update_blends)
print("OK: Player.update blend weights")

old_step_sound = """      // Rhythmic dance step sound while dancing/walking across platforms
      if (this.isGrounded && this.state === 'walk' && Math.abs(this.vx) > 0.2) {
        if (this.animTimer % 18 === 0) {
          SFX.danceStep();
        }
      }

      if (this.landSquashTimer > 0) {
        this.landSquashTimer--;
        if (this.landSquashTimer === 0 && this.state === 'land') {
          this.state = Math.abs(this.vx) > 0.1 ? 'walk' : 'idle';
        }
      }"""

new_step_sound = """      if (this.landSquashTimer > 0) {
        this.landSquashTimer--;
        if (this.landSquashTimer === 0 && this.state === 'land') {
          const avx = Math.abs(this.vx);
          this.state = avx >= 1.85 ? 'run' : (avx > 0.14 ? 'walk' : 'idle');
        }
      }"""

assert code.count(old_step_sound) == 1, "old_step_sound match failed"
code = code.replace(old_step_sound, new_step_sound)
print("OK: Player.update removed danceStep & updated land resume")

# Verify zero remaining references to dance/bhuri
remaining_dance = [line.strip() for line in code.splitlines() if any(w in line.lower() for w in ['dance', 'bhuri'])]
if remaining_dance:
    print("WARNING: remaining dance/bhuri refs:", remaining_dance)
else:
    print("CLEAN: 0 remaining dance or bhuri references in js/game.js!")

if has_crlf:
    code = code.replace('\n', '\r\n')

with open(game_path, 'w', encoding='utf-8') as f:
    f.write(code)

print("SUCCESSFULLY APPLIED SHINCHAN REDESIGN & NORMAL MOVEMENT!")
