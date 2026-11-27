import * as THREE from 'three';

const EXPRESSION_EMOTES = {
  hearts: { symbol: '♥', color: '#e94f6e' },
  panic: { symbol: '💦', color: '#47b1e3' },
  angry: { symbol: '💢', color: '#df4138' },
  happy: { symbol: '✨', color: '#e6a82e' },
  laugh: { symbol: '✦', color: '#e6a82e' },
  dreamy_sing: { symbol: '♪', color: '#d66236' },
  shock: { symbol: '❗', color: '#d9534f' },
  obsessive_intense: { symbol: '★', color: '#d48d28' },
};

const spriteTexCache = new Map();

function getEmoteTexture(symbol, color) {
  const key = `${symbol}_${color}`;
  if (spriteTexCache.has(key)) return spriteTexCache.get(key);

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 128, 128);
  ctx.font = 'bold 82px "Be Vietnam Pro", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.strokeStyle = 'rgba(255, 253, 249, 0.92)';
  ctx.lineWidth = 10;
  ctx.strokeText(symbol, 64, 68);
  ctx.fillStyle = color;
  ctx.fillText(symbol, 64, 68);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  spriteTexCache.set(key, tex);
  return tex;
}

/**
 * Lightweight 3D floating emote sprite pool triggered on expressive character moments.
 */
export class EmoteParticles {
  constructor(scene) {
    this.scene = scene;
    this.active = [];
  }

  burstForExpression(worldPos, expression) {
    const spec = EXPRESSION_EMOTES[expression];
    if (!spec) return;

    const tex = getEmoteTexture(spec.symbol, spec.color);
    const count = expression === 'hearts' || expression === 'dreamy_sing' ? 3 : 2;

    for (let i = 0; i < count; i += 1) {
      const mat = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        opacity: 1,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(mat);
      const spreadX = (i - (count - 1) * 0.5) * 0.24 + (Math.random() - 0.5) * 0.08;
      sprite.position.set(
        worldPos.x + spreadX,
        worldPos.y + 0.08 + i * 0.06,
        worldPos.z + (Math.random() - 0.5) * 0.1
      );
      sprite.scale.setScalar(0.26);
      this.scene.add(sprite);

      this.active.push({
        sprite,
        mat,
        age: 0,
        life: 1.15 + Math.random() * 0.35,
        vy: 0.42 + Math.random() * 0.18,
        swayPhase: Math.random() * Math.PI * 2,
      });
    }
  }

  update(dt) {
    const safeDt = Math.min(dt, 0.08);
    for (let i = this.active.length - 1; i >= 0; i -= 1) {
      const p = this.active[i];
      p.age += safeDt;
      const ratio = p.age / p.life;
      if (ratio >= 1) {
        this.scene.remove(p.sprite);
        p.mat.dispose();
        this.active.splice(i, 1);
        continue;
      }
      p.sprite.position.y += p.vy * safeDt;
      p.sprite.position.x += Math.sin(p.age * 5.2 + p.swayPhase) * 0.12 * safeDt;
      const pop = ratio < 0.2 ? ratio / 0.2 : 1;
      p.sprite.scale.setScalar(0.28 * pop);
      p.mat.opacity = ratio > 0.65 ? Math.max(0, 1 - (ratio - 0.65) / 0.35) : 1;
    }
  }
}
