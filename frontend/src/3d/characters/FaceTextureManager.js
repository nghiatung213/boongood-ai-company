import * as THREE from 'three';

const FACE_SIZE = 512;
const LEFT_EYE_X = 166;
const RIGHT_EYE_X = 346;
const EYE_Y = 248;
const BROW_Y = 176;
const BLUSH_Y = 308;
const MOUTH_X = 256;
const MOUTH_Y = 356;

const CLOSED_EYE_EXPRESSIONS = new Set(['laugh', 'dreamy_sing', 'hearts']);

/**
 * Dynamic Canvas Face Engine (512x512 transparent decal mapped 1:1 onto the curved chibi face patch).
 * Supports all 12 lore face_expressions, per-character facial styling, auto-blink, and lip-sync bounce.
 */
export class FaceTextureManager {
  constructor(characterId, faceStyle) {
    this.characterId = characterId;
    this.style = faceStyle;

    this.canvas = document.createElement('canvas');
    this.canvas.width = FACE_SIZE;
    this.canvas.height = FACE_SIZE;
    this.ctx = this.canvas.getContext('2d');

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 4;
    this.texture.minFilter = THREE.LinearMipmapLinearFilter;
    this.texture.magFilter = THREE.LinearFilter;

    this.expression = 'neutral';
    this.isSpeaking = false;

    // Independent randomized auto-blink state (3.0s - 5.2s)
    this._blinkTimer = 1.4 + Math.random() * 3.0;
    this._blinkProgress = -1; // -1 = not blinking, 0..1 = active blink cycle
    this._blinkStep = 0; // 0 open, 1 half, 2 closed

    // Lip-sync bounce state
    this._talkTimer = 0;
    this._mouthStep = 0; // 0..3 discrete mouth aperture steps

    this._lastRenderKey = '';
    this._redrawIfNeeded(true);
  }

  setExpression(expression) {
    const next = expression || 'neutral';
    if (this.expression !== next) {
      this.expression = next;
      this._redrawIfNeeded();
    }
  }

  setSpeaking(speaking) {
    const flag = Boolean(speaking);
    if (this.isSpeaking !== flag) {
      this.isSpeaking = flag;
      if (!flag) {
        this._mouthStep = 0;
        this._talkTimer = 0;
      }
      this._redrawIfNeeded();
    }
  }

  triggerBlink() {
    if (!CLOSED_EYE_EXPRESSIONS.has(this.expression)) {
      this._blinkProgress = 0;
    }
  }

  update(dt) {
    const safeDt = Math.min(dt, 0.1);

    // 1. Auto-blink update
    if (CLOSED_EYE_EXPRESSIONS.has(this.expression)) {
      this._blinkProgress = -1;
      this._blinkStep = 0;
    } else if (this._blinkProgress >= 0) {
      this._blinkProgress += safeDt / 0.15;
      if (this._blinkProgress >= 1) {
        this._blinkProgress = -1;
        this._blinkStep = 0;
        this._blinkTimer = 3.0 + Math.random() * 2.2;
      } else if (this._blinkProgress < 0.25 || this._blinkProgress > 0.78) {
        this._blinkStep = 1;
      } else {
        this._blinkStep = 2;
      }
    } else {
      this._blinkTimer -= safeDt;
      if (this._blinkTimer <= 0) {
        this._blinkProgress = 0;
      }
    }

    // 2. Lip-sync bounce update while speaking
    if (this.isSpeaking) {
      this._talkTimer += safeDt * 8.5;
      const pattern = [0, 2, 3, 1, 3, 2];
      this._mouthStep = pattern[Math.floor(this._talkTimer) % pattern.length];
    } else {
      this._mouthStep = 0;
    }

    this._redrawIfNeeded();
  }

  _redrawIfNeeded(force = false) {
    const key = `${this.expression}|${this._blinkStep}|${this._mouthStep}`;
    if (!force && key === this._lastRenderKey) {
      return;
    }
    this._lastRenderKey = key;
    this._drawFace();
    this.texture.needsUpdate = true;
  }

  _drawFace() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, FACE_SIZE, FACE_SIZE);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const expr = this.expression;

    // 1. Soft airbrushed rosy cheeks (varies intensity by expression)
    this._drawCheeks(ctx, expr);

    // 2. Special forehead/temple accents (sweat drops, anger vein, shock lines, notes)
    this._drawSpecialAccents(ctx, expr);

    // 3. Eyes (with auto-blink support)
    this._drawEyes(ctx, expr, this._blinkStep);

    // 4. Eyebrows
    this._drawEyebrows(ctx, expr);

    // 5. Mouth (with lip-sync bounce when speaking)
    this._drawMouth(ctx, expr, this._mouthStep);
  }

  _drawCheeks(ctx, expr) {
    let alphaScale = 1.0;
    if (expr === 'hearts' || expr === 'happy' || expr === 'laugh' || expr === 'dreamy_sing') {
      alphaScale = 1.35;
    } else if (expr === 'flirty' || expr === 'obsessive_intense') {
      alphaScale = 1.18;
    } else if (expr === 'shock' || expr === 'panic' || expr === 'facepalm_tired') {
      alphaScale = 0.45;
    }

    for (const cx of [124, 388]) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, alphaScale);
      const grad = ctx.createRadialGradient(cx, BLUSH_Y, 6, cx, BLUSH_Y, 44);
      grad.addColorStop(0, this.style.blushColor);
      grad.addColorStop(1, 'rgba(245, 130, 130, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(cx, BLUSH_Y, 44, 28, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Subtle tired under-eye crescent bags for facepalm_tired
    if (expr === 'facepalm_tired') {
      ctx.save();
      ctx.strokeStyle = 'rgba(116, 102, 132, 0.55)';
      ctx.lineWidth = 4.5;
      for (const ex of [LEFT_EYE_X, RIGHT_EYE_X]) {
        ctx.beginPath();
        ctx.arc(ex, EYE_Y + 26, 26, 0.25 * Math.PI, 0.75 * Math.PI);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  _drawEyes(ctx, expr, blinkStep) {
    const scale = this.style.eyeScale || 1.0;

    if (expr === 'hearts') {
      this._drawHeartEye(ctx, LEFT_EYE_X, EYE_Y, 39 * scale);
      this._drawHeartEye(ctx, RIGHT_EYE_X, EYE_Y, 39 * scale);
      return;
    }

    if (expr === 'laugh') {
      this._drawLaughEye(ctx, LEFT_EYE_X, EYE_Y, 1, scale * 1.12);
      this._drawLaughEye(ctx, RIGHT_EYE_X, EYE_Y, -1, scale * 1.12);
      return;
    }

    if (expr === 'dreamy_sing') {
      this._drawClosedArcEye(ctx, LEFT_EYE_X, EYE_Y + 4, scale * 1.12, 'up');
      this._drawClosedArcEye(ctx, RIGHT_EYE_X, EYE_Y + 4, scale * 1.12, 'up');
      return;
    }

    if (expr === 'happy') {
      this._drawClosedArcEye(ctx, LEFT_EYE_X, EYE_Y + 4, scale * 1.14, 'smile');
      this._drawClosedArcEye(ctx, RIGHT_EYE_X, EYE_Y + 4, scale * 1.14, 'smile');
      return;
    }

    if (expr === 'flirty') {
      // Left eye open & sparkling, right eye playfully winking
      if (blinkStep === 2) {
        this._drawClosedArcEye(ctx, LEFT_EYE_X, EYE_Y + 4, scale * 1.1, 'blink');
      } else {
        this._drawOpenChibiEye(ctx, LEFT_EYE_X, EYE_Y, scale * 1.12, {
          lidCover: blinkStep === 1 ? 0.45 : 0.14,
          side: -1,
        });
      }
      this._drawWinkEye(ctx, RIGHT_EYE_X, EYE_Y + 2, scale * 1.12);
      return;
    }

    // Both eyes closed during full blink
    if (blinkStep === 2) {
      this._drawClosedArcEye(ctx, LEFT_EYE_X, EYE_Y + 6, scale * 1.1, 'blink');
      this._drawClosedArcEye(ctx, RIGHT_EYE_X, EYE_Y + 6, scale * 1.1, 'blink');
      return;
    }

    // Standard / expressive open eyes
    const opts = { lidCover: blinkStep === 1 ? 0.5 : 0 };
    if (expr === 'smirk_sarcastic') {
      opts.lidCover = Math.max(opts.lidCover, 0.42);
      opts.gazeOffsetX = 6;
    } else if (expr === 'facepalm_tired') {
      opts.lidCover = Math.max(opts.lidCover, 0.54);
    } else if (expr === 'shock') {
      opts.shockWide = true;
    } else if (expr === 'panic') {
      opts.panicRings = true;
    } else if (expr === 'angry') {
      opts.angryCut = true;
    } else if (expr === 'obsessive_intense') {
      opts.intenseGlint = true;
      opts.lidCover = Math.max(opts.lidCover, 0.14);
    }

    this._drawOpenChibiEye(ctx, LEFT_EYE_X, EYE_Y, scale * 1.14, { ...opts, side: -1 });
    this._drawOpenChibiEye(ctx, RIGHT_EYE_X, EYE_Y, scale * 1.14, { ...opts, side: 1 });
  }

  _drawOpenChibiEye(ctx, x, y, scale, opts) {
    const rx = 31 * scale;
    const ry = 37 * scale;
    const gazeX = opts.gazeOffsetX || 0;

    ctx.save();

    if (opts.shockWide || opts.panicRings) {
      // Wide expressive white sclera + tiny shrunk pupil
      ctx.fillStyle = '#fffdf9';
      ctx.strokeStyle = '#2b1e19';
      ctx.lineWidth = 6.5;
      ctx.beginPath();
      ctx.ellipse(x, y, rx * 1.12, ry * 1.08, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      if (opts.panicRings) {
        ctx.strokeStyle = 'rgba(43, 30, 25, 0.45)';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.ellipse(x, y, rx * 0.72, ry * 0.68, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = '#241915';
      ctx.beginPath();
      ctx.arc(x + gazeX * 0.4, y + 2, opts.panicRings ? 9.5 : 11, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x - 3, y - 2, 3.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    // Soft white sclera base
    ctx.fillStyle = '#fffdf8';
    ctx.beginPath();
    ctx.ellipse(x, y, rx * 1.04, ry * 1.0, 0, 0, Math.PI * 2);
    ctx.fill();

    // Clip to eye oval so half-lids and gradients stay razor clean
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x, y, rx * 1.02, ry * 0.98, 0, 0, Math.PI * 2);
    ctx.clip();

    // Rich glossy iris gradient (Pop Mart doll eye signature!)
    const irisGrad = ctx.createLinearGradient(x, y - ry, x, y + ry);
    irisGrad.addColorStop(0, '#1e1513');
    irisGrad.addColorStop(0.32, this.style.irisTop);
    irisGrad.addColorStop(0.85, this.style.irisBottom);
    irisGrad.addColorStop(1, '#fff6e8');

    ctx.fillStyle = irisGrad;
    ctx.beginPath();
    ctx.ellipse(x + gazeX, y + 2, rx * 0.88, ry * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Deep glossy pupil core
    ctx.fillStyle = '#18110f';
    ctx.beginPath();
    ctx.ellipse(x + gazeX, y + 1, rx * 0.46, ry * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Luminous lower-iris crescent reflection
    ctx.fillStyle = 'rgba(255, 255, 255, 0.32)';
    ctx.beginPath();
    ctx.ellipse(x + gazeX, y + ry * 0.56, rx * 0.48, ry * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Dual crisp white catchlights
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x - rx * 0.34 + gazeX * 0.4, y - ry * 0.28, 10.5 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + rx * 0.34 + gazeX * 0.4, y + ry * 0.28, 4.8 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Starry determination glint for obsessive_intense
    if (opts.intenseGlint) {
      ctx.fillStyle = '#fff5cc';
      this._drawFourPointStar(ctx, x + rx * 0.18, y - ry * 0.15, 11 * scale);
    }

    // Half-lidded cover (sarcastic / tired / mid-blink)
    if (opts.lidCover > 0) {
      const cutY = y - ry + ry * 2 * opts.lidCover;
      ctx.clearRect(x - rx * 1.4, y - ry * 1.3, rx * 2.8, cutY - (y - ry * 1.3));
      ctx.strokeStyle = '#251a16';
      ctx.lineWidth = 7.5;
      ctx.beginPath();
      ctx.moveTo(x - rx * 1.08, cutY);
      ctx.quadraticCurveTo(x, cutY + 4, x + rx * 1.08, cutY);
      ctx.stroke();
    }

    // Diagonal fierce lid crop for angry
    if (opts.angryCut) {
      const tilt = opts.side * 16;
      ctx.strokeStyle = '#251a16';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(x - rx * 1.1, y - ry * 0.45 - tilt);
      ctx.lineTo(x + rx * 1.1, y - ry * 0.45 + tilt);
      ctx.stroke();
    }

    ctx.restore(); // End clip

    // Upper lash contour arch (only when not heavily covered by flat lid)
    if (opts.lidCover < 0.35 && !opts.angryCut) {
      ctx.strokeStyle = '#241915';
      ctx.lineWidth = this.style.lashStyle === 'clean' ? 7 : 8.5;
      ctx.beginPath();
      ctx.ellipse(x, y, rx * 1.02, ry * 0.98, 0, Math.PI * 1.08, Math.PI * 1.92);
      ctx.stroke();

      // Cute winged outer eyelashes for Rachel, Monica, Phoebe
      if (this.style.lashStyle === 'winged' || this.style.lashStyle === 'dreamy') {
        const dir = opts.side;
        const ox = x + dir * rx * 0.96;
        const oy = y - ry * 0.25;
        ctx.lineWidth = 5.5;
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.lineTo(ox + dir * 13, oy - 9);
        ctx.moveTo(ox + dir * 2, oy + 10);
        ctx.lineTo(ox + dir * 11, oy + 4);
        ctx.stroke();
      } else if (this.style.lashStyle === 'crisp') {
        const dir = opts.side;
        const ox = x + dir * rx * 0.96;
        const oy = y - ry * 0.2;
        ctx.lineWidth = 5.5;
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.lineTo(ox + dir * 9, oy - 6);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  _drawClosedArcEye(ctx, x, y, scale, variant) {
    const r = 30 * scale;
    ctx.save();
    ctx.strokeStyle = '#251a16';
    ctx.lineWidth = 8.5;
    ctx.beginPath();
    if (variant === 'smile') {
      // Joyful upturned ^ ^ arc
      ctx.arc(x, y + 10, r, Math.PI * 1.15, Math.PI * 1.85);
    } else if (variant === 'up') {
      // Peaceful dreamy_sing downward curve
      ctx.arc(x, y - 8, r, Math.PI * 0.16, Math.PI * 0.84);
    } else {
      // Natural mid-blink flat curved lash
      ctx.moveTo(x - r, y + 4);
      ctx.quadraticCurveTo(x, y + 14, x + r, y + 4);
    }
    ctx.stroke();
    ctx.restore();
  }

  _drawLaughEye(ctx, x, y, dir, scale) {
    const s = 26 * scale;
    ctx.save();
    ctx.strokeStyle = '#251a16';
    ctx.lineWidth = 8.5;
    ctx.beginPath();
    ctx.moveTo(x - dir * s, y - s * 0.65);
    ctx.lineTo(x + dir * s * 0.8, y);
    ctx.lineTo(x - dir * s, y + s * 0.65);
    ctx.stroke();
    ctx.restore();
  }

  _drawWinkEye(ctx, x, y, scale) {
    const s = 28 * scale;
    ctx.save();
    ctx.strokeStyle = '#251a16';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.9, y + 4);
    ctx.quadraticCurveTo(x, y - 16, x + s * 0.9, y + 6);
    ctx.stroke();
    if (this.style.lashStyle !== 'clean') {
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(x + s * 0.85, y + 4);
      ctx.lineTo(x + s * 1.18, y - 4);
      ctx.stroke();
    }
    ctx.restore();
  }

  _drawHeartEye(ctx, x, y, size) {
    ctx.save();
    ctx.translate(x, y + 4);
    const grad = ctx.createLinearGradient(0, -size, 0, size);
    grad.addColorStop(0, '#ff6b8b');
    grad.addColorStop(1, '#d92b52');
    ctx.fillStyle = grad;
    ctx.strokeStyle = '#73142a';
    ctx.lineWidth = 4;

    ctx.beginPath();
    ctx.moveTo(0, size * 0.82);
    ctx.bezierCurveTo(-size * 1.15, size * 0.15, -size * 1.08, -size * 0.88, 0, -size * 0.28);
    ctx.bezierCurveTo(size * 1.08, -size * 0.88, size * 1.15, size * 0.15, 0, size * 0.82);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Glossy specular highlight on heart
    ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
    ctx.beginPath();
    ctx.ellipse(-size * 0.36, -size * 0.24, size * 0.18, size * 0.11, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  _drawEyebrows(ctx, expr) {
    ctx.save();
    ctx.strokeStyle = this.style.browColor;
    ctx.lineWidth = this.style.browThickness || 7.5;

    const drawSide = (side, yOffset, tilt, arch) => {
      const cx = side < 0 ? LEFT_EYE_X : RIGHT_EYE_X;
      const w = 34;
      const x1 = cx - w;
      const x2 = cx + w;
      const y1 = BROW_Y + yOffset - side * tilt;
      const y2 = BROW_Y + yOffset + side * tilt;
      const cy = (y1 + y2) * 0.5 - arch;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo(cx, cy, x2, y2);
      ctx.stroke();
    };

    if (expr === 'angry') {
      drawSide(-1, 14, -18, 4);
      drawSide(1, 14, -18, 4);
    } else if (expr === 'obsessive_intense') {
      drawSide(-1, 12, -10, 2);
      drawSide(1, 12, -10, 2);
    } else if (expr === 'shock') {
      drawSide(-1, -24, 6, 16);
      drawSide(1, -24, 6, 16);
    } else if (expr === 'panic') {
      drawSide(-1, -16, 15, 10);
      drawSide(1, -16, 15, 10);
    } else if (expr === 'smirk_sarcastic') {
      drawSide(-1, 8, -4, 4);
      drawSide(1, -14, -6, 16); // Classic Chandler / Rachel skeptical brow cock!
    } else if (expr === 'flirty') {
      drawSide(-1, -12, -5, 15);
      drawSide(1, 4, 4, 8);
    } else if (expr === 'facepalm_tired') {
      drawSide(-1, 4, 14, 4);
      drawSide(1, 4, 14, 4);
    } else if (expr === 'happy' || expr === 'laugh' || expr === 'hearts') {
      drawSide(-1, -10, 4, 13);
      drawSide(1, -10, 4, 13);
    } else if (expr === 'dreamy_sing') {
      drawSide(-1, -8, 6, 10);
      drawSide(1, -8, 6, 10);
    } else {
      drawSide(-1, 0, 2, 10);
      drawSide(1, 0, 2, 10);
    }

    ctx.restore();
  }

  _drawMouth(ctx, expr, mouthStep) {
    const mx = MOUTH_X;
    const my = MOUTH_Y + (this.style.mouthOffsetY || 0);

    ctx.save();
    ctx.strokeStyle = '#3d221d';
    ctx.lineWidth = 6.5;

    // If character is actively speaking, render lively lip-sync bounce matched to mood
    if (mouthStep > 0) {
      const openFactor = [0, 0.45, 0.78, 1.0][mouthStep];
      const w = 22 + openFactor * 14;
      const h = 10 + openFactor * 22;

      ctx.fillStyle = '#993a40';
      ctx.beginPath();
      if (expr === 'angry' || expr === 'panic') {
        ctx.roundRect(mx - w, my - h * 0.45, w * 2, h, 14);
      } else {
        ctx.ellipse(mx, my + 4, w, h * 0.68, 0, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.stroke();

      // Cute coral tongue glow inside mouth
      ctx.fillStyle = '#f28b90';
      ctx.beginPath();
      ctx.ellipse(mx, my + 4 + h * 0.22, w * 0.58, h * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    // Static expressive mouth shapes
    if (expr === 'laugh' || expr === 'hearts') {
      ctx.fillStyle = '#a33d45';
      ctx.beginPath();
      ctx.moveTo(mx - 36, my - 4);
      ctx.quadraticCurveTo(mx, my - 8, mx + 36, my - 4);
      ctx.quadraticCurveTo(mx + 30, my + 34, mx, my + 34);
      ctx.quadraticCurveTo(mx - 30, my + 34, mx - 36, my - 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#f48e94';
      ctx.beginPath();
      ctx.ellipse(mx, my + 20, 18, 9, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (expr === 'happy') {
      ctx.beginPath();
      ctx.moveTo(mx - 28, my - 4);
      ctx.quadraticCurveTo(mx, my + 24, mx + 28, my - 4);
      ctx.stroke();
    } else if (expr === 'smirk_sarcastic') {
      ctx.beginPath();
      ctx.moveTo(mx - 24, my + 8);
      ctx.quadraticCurveTo(mx + 8, my + 6, mx + 30, my - 10);
      ctx.stroke();
    } else if (expr === 'flirty') {
      ctx.beginPath();
      ctx.moveTo(mx - 22, my + 2);
      ctx.quadraticCurveTo(mx + 4, my + 16, mx + 28, my - 6);
      ctx.stroke();
    } else if (expr === 'shock') {
      ctx.fillStyle = '#993a40';
      ctx.beginPath();
      ctx.ellipse(mx, my + 8, 18, 25, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (expr === 'panic') {
      ctx.fillStyle = '#993a40';
      ctx.beginPath();
      ctx.moveTo(mx - 34, my + 6);
      ctx.quadraticCurveTo(mx - 16, my - 10, mx, my + 2);
      ctx.quadraticCurveTo(mx + 16, my - 10, mx + 34, my + 6);
      ctx.quadraticCurveTo(mx + 20, my + 28, mx, my + 20);
      ctx.quadraticCurveTo(mx - 20, my + 28, mx - 34, my + 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (expr === 'angry') {
      ctx.beginPath();
      ctx.moveTo(mx - 28, my + 16);
      ctx.quadraticCurveTo(mx, my - 10, mx + 28, my + 16);
      ctx.stroke();
    } else if (expr === 'obsessive_intense') {
      ctx.fillStyle = '#fffdf8';
      ctx.beginPath();
      ctx.roundRect(mx - 28, my - 4, 56, 18, 8);
      ctx.fill();
      ctx.stroke();
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(mx - 26, my + 5);
      ctx.lineTo(mx + 26, my + 5);
      ctx.stroke();
    } else if (expr === 'dreamy_sing') {
      ctx.fillStyle = '#ba535b';
      ctx.beginPath();
      ctx.ellipse(mx, my + 6, 13, 16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (expr === 'facepalm_tired') {
      ctx.beginPath();
      ctx.moveTo(mx - 24, my + 8);
      ctx.quadraticCurveTo(mx - 8, my + 2, mx, my + 8);
      ctx.quadraticCurveTo(mx + 8, my + 14, mx + 24, my + 6);
      ctx.stroke();
    } else {
      // Neutral warm cozy smile
      const smirk = this.style.defaultSmirkTilt || 0;
      ctx.beginPath();
      ctx.moveTo(mx - 20, my + 2 + smirk * 18);
      ctx.quadraticCurveTo(mx, my + 15, mx + 20, my + 2 - smirk * 24);
      ctx.stroke();
    }

    ctx.restore();
  }

  _drawSpecialAccents(ctx, expr) {
    ctx.save();

    if (expr === 'panic' || expr === 'facepalm_tired') {
      // Glossy cyan sweat drop on upper right temple
      const sx = 414;
      const sy = 158;
      const grad = ctx.createLinearGradient(sx, sy - 22, sx, sy + 22);
      grad.addColorStop(0, '#c8f1ff');
      grad.addColorStop(1, '#4db7e8');
      ctx.fillStyle = grad;
      ctx.strokeStyle = '#256c91';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(sx, sy - 24);
      ctx.bezierCurveTo(sx + 18, sy + 2, sx + 16, sy + 24, sx, sy + 24);
      ctx.bezierCurveTo(sx - 16, sy + 24, sx - 18, sy + 2, sx, sy - 24);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    if (expr === 'angry') {
      // Classic chibi red anger mark on temple
      const ax = 98;
      const ay = 136;
      ctx.strokeStyle = '#d93838';
      ctx.lineWidth = 6.5;
      for (const [dx, dy] of [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ]) {
        ctx.beginPath();
        ctx.moveTo(ax + dx * 6, ay + dy * 20);
        ctx.quadraticCurveTo(ax + dx * 6, ay + dy * 6, ax + dx * 20, ay + dy * 6);
        ctx.stroke();
      }
    }

    if (expr === 'shock') {
      // Subtle vertical blue shock lines near brow
      ctx.strokeStyle = 'rgba(72, 118, 168, 0.55)';
      ctx.lineWidth = 4.5;
      for (const lx of [104, 118, 394, 408]) {
        ctx.beginPath();
        ctx.moveTo(lx, 108);
        ctx.lineTo(lx, 146);
        ctx.stroke();
      }
    }

    if (expr === 'dreamy_sing') {
      // Floating melodic note near right cheek
      ctx.fillStyle = '#d66236';
      ctx.font = 'bold 34px sans-serif';
      ctx.fillText('♪', 416, 210);
      ctx.font = 'bold 26px sans-serif';
      ctx.fillText('♫', 72, 224);
    }

    if (expr === 'laugh') {
      // Tiny golden joy sparkles
      ctx.fillStyle = '#f2b749';
      this._drawFourPointStar(ctx, 88, 226, 12);
      this._drawFourPointStar(ctx, 424, 226, 12);
    }

    ctx.restore();
  }

  _drawFourPointStar(ctx, cx, cy, r) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.quadraticCurveTo(cx, cy, cx + r, cy);
    ctx.quadraticCurveTo(cx, cy, cx, cy + r);
    ctx.quadraticCurveTo(cx, cy, cx - r, cy);
    ctx.quadraticCurveTo(cx, cy, cx, cy - r);
    ctx.closePath();
    ctx.fill();
  }

  dispose() {
    this.texture.dispose();
  }
}
