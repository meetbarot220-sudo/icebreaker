with open('js/game.js', 'r', encoding='utf-8') as f:
    content = f.read()

has_crlf = '\r\n' in content
code = content.replace('\r\n', '\n')

# Clean comments
code = code.replace(
    '// Gentle idle breathing + crisp subtle step bob (zero dance bounce or hip sway!)',
    '// Gentle idle breathing + subtle natural vertical step bounce'
).replace(
    '// Rock-solid upright head with only tiny comfortable sprint lean (no dance bobble!)',
    '// Stable upright head with subtle natural sprint tilt'
).replace(
    'ctx.scale(1.0 + lw * 0.15, 1.0 - lw * 0.14);',
    'ctx.scale(1.0 + lw * 0.08, 1.0 - lw * 0.08);'
)

# Fix arm swing directions (opposite to legs!) & jump/fall raised arms
old_back_arm = """      // --- 3. BACK ARM (LEFT ARM - SWINGS OPPOSITE TO BACK LEG!) ---
      const armAmp = mw * (0.48 + rw * 0.34) * (1.0 - airW);
      let backArmAngle = (+sinP * armAmp) + (0.08 * (1.0 - mw) * (1.0 - airW));
      backArmAngle += (-0.95 * jw) + (-1.20 * fw) + (0.45 * sw);
      if (isHurt || isDeadFall) backArmAngle = -1.65;"""

new_back_arm = """      // --- 3. BACK ARM (SWINGS OPPOSITE TO BACK LEG; RAISED IN JUMP/FALL) ---
      const armAmp = mw * (0.54 + rw * 0.36) * (1.0 - airW);
      let backArmAngle = (-sinP * armAmp) + (0.14 * (1.0 - mw) * (1.0 - airW));
      backArmAngle += (1.75 * jw) + (1.30 * fw) + (0.55 * sw);
      if (isHurt || isDeadFall) backArmAngle = 1.95;"""

assert code.count(old_back_arm) == 1, "old_back_arm match failed"
code = code.replace(old_back_arm, new_back_arm)

# Fix blink eyes cleanly
old_blink = """      } else if (isBlinking) {
        // Gentle natural blink arc
        ctx.strokeStyle = '#0e0e0e';
        ctx.lineWidth = 1.9;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(eyeLX, eyeLY + 0.8, 3.2, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
        ctx.beginPath(); ctx.arc(eyeRX, eyeRY + 0.8, 3.0, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();"""

new_blink = """      } else if (isBlinking) {
        // Natural closed eyelid blink line
        ctx.strokeStyle = '#14100e';
        ctx.lineWidth = 1.8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(eyeLX - 2.8, eyeLY + 0.4); ctx.quadraticCurveTo(eyeLX, eyeLY + 1.4, eyeLX + 2.8, eyeLY + 0.4);
        ctx.moveTo(eyeRX - 2.6, eyeRY + 0.4); ctx.quadraticCurveTo(eyeRX, eyeRY + 1.4, eyeRX + 2.6, eyeRY + 0.4);
        ctx.stroke();"""

assert code.count(old_blink) == 1, "old_blink match failed"
code = code.replace(old_blink, new_blink)

# Fix Front Arm & compact tucked cuff vs full sock attack (never overlapping white socks & red shoes!)
old_front_arm = """      // --- 6. FRONT ARM & ELECTRIC SHOCK SOCK WEAPON ---
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

      ctx.restore();"""

new_front_arm = """      // --- 6. FRONT ARM & ELECTRIC SHOCK SOCK WEAPON ---
      // Natural opposite arm swing in walk/run, raised arms in jump/fall, full shock sock on attack!
      ctx.save();
      const frontShoulderX = 0.2 + bodyLean * 7.5;
      const frontShoulderY = -20.2 + bodyBob;

      let frontArmAngle = (+sinP * armAmp) + (-0.08 * (1.0 - mw) * (1.0 - airW));
      frontArmAngle += (-2.05 * jw) + (-1.55 * fw);
      if (isHurt || isDeadFall) frontArmAngle = -1.95;

      if (isSwinging) {
        const swingProg = (CONFIG.TIMINGS.HAMMER_COOLDOWN - p.hammerTimer) / CONFIG.TIMINGS.HAMMER_COOLDOWN;
        // Dramatic overhead-to-forward electric sock swing!
        frontArmAngle = -Math.PI * 0.85 + swingProg * Math.PI * 1.15;

        // Lightning arc swoosh trail around forward swing arc
        const arcEnd = Math.min(0.45, -Math.PI * 0.42 + swingProg * Math.PI * 0.95);
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.85)';
        ctx.lineWidth = 6.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(frontShoulderX + 6, frontShoulderY + 2, 24, -Math.PI * 0.42, arcEnd);
        ctx.stroke();

        ctx.strokeStyle = '#ffea00';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(frontShoulderX + 6, frontShoulderY + 2, 24, -Math.PI * 0.42, arcEnd);
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

      // Attack Sock or compact waist-clear grip accent (keeps white socks & red shoes 100% clear during walk/idle/jump!)
      if (isSwinging) {
        ctx.save();
        ctx.translate(0, 8.8);
        ctx.rotate(-0.35);
        ctx.scale(0.95, 0.95);
        ctx.translate(0, 15);
        CartoonArtist.drawHairyElectricSock(ctx, true);
        ctx.restore();
      }

      // Front chubby hand (clean toddler hand silhouette!)
      ctx.fillStyle = skinBase;
      ctx.strokeStyle = outline;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 8.8, 2.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Subtle compact tucked electric sock cuff peeking beside knuckles when not actively swinging
      if (!isSwinging && !isHurt && !isDeadFall) {
        ctx.save();
        ctx.translate(1.5, 9.2);
        ctx.rotate(-0.2);
        ctx.fillStyle = '#eceff1';
        ctx.strokeStyle = outline;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.roundRect(-2.0, -1.2, 4.4, 3.2, 1.2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#00e5ff';
        ctx.fillRect(-1.4, -0.4, 3.2, 1.0);
        ctx.restore();
      }

      ctx.restore();"""

assert code.count(old_front_arm) == 1, "old_front_arm match failed"
code = code.replace(old_front_arm, new_front_arm)

# Double check zero remaining dance/bhuri occurrences anywhere!
rem = [l for l in code.splitlines() if any(w in l.lower() for w in ['dance', 'bhuri'])]
assert not rem, f"Remaining refs found: {rem}"

if has_crlf:
    code = code.replace('\n', '\r\n')

with open('js/game.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("REFINEMENTS APPLIED CLEANLY! ZERO DANCE REFS REMAIN!")
