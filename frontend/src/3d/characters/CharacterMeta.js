import * as THREE from 'three';

export const CHARACTER_ORDER = ['rachel', 'monica', 'chandler', 'ross', 'joey', 'phoebe'];

export const FACE_EXPRESSIONS = [
  'neutral',
  'happy',
  'laugh',
  'smirk_sarcastic',
  'flirty',
  'shock',
  'panic',
  'angry',
  'obsessive_intense',
  'dreamy_sing',
  'facepalm_tired',
  'hearts',
];

export const FACE_EXPRESSION_LABELS = {
  neutral: 'Bình thường',
  happy: 'Vui vẻ',
  laugh: 'Cười tít mắt',
  smirk_sarcastic: 'Cà khịa',
  flirty: 'Nháy mắt',
  shock: 'Sốc nặng',
  panic: 'Hoảng loạn',
  angry: 'Cáu gắt',
  obsessive_intense: 'Căng cực',
  dreamy_sing: 'Mơ màng hát',
  facepalm_tired: 'Bất lực',
  hearts: 'Mắt trái tim',
};

export const BODY_GESTURES = [
  'idle_talk',
  'point',
  'shrug',
  'excited_bounce',
  'lean_in',
  'wave',
  'head_shake',
  'hands_up_panic',
  'sip_coffee',
  'play_guitar',
];

export const BODY_GESTURE_LABELS = {
  idle_talk: 'Trò chuyện',
  point: 'Chỉ tay',
  shrug: 'Nhún vai',
  excited_bounce: 'Nhảy phấn khích',
  lean_in: 'Nghiêng lắng nghe',
  wave: 'Vẫy chào',
  head_shake: 'Lắc đầu',
  hands_up_panic: 'Giơ tay hoảng',
  sip_coffee: 'Nhấp cà phê',
  play_guitar: 'Chơi đàn',
};

export const CHARACTER_META = {
  rachel: {
    id: 'rachel',
    name: 'Rachel',
    fullName: 'Rachel Green',
    role: 'Thương hiệu & Thiết kế',
    accentColor: '#d97a6c',
    skinColor: '#f7d5be',
    hairColor: '#b77f4c',
    hairHighlight: '#d29c66',
    faceStyle: {
      irisTop: '#2c3d3f',
      irisBottom: '#5c8c8d',
      browColor: '#8d5b34',
      browThickness: 6.5,
      lashStyle: 'winged',
      blushColor: 'rgba(244, 130, 128, 0.44)',
      lipColor: '#d46c69',
      eyeScale: 1.04,
      mouthOffsetY: 0,
    },
  },
  monica: {
    id: 'monica',
    name: 'Monica',
    fullName: 'Monica Geller',
    role: 'Vận hành & Sản phẩm',
    accentColor: '#c94949',
    skinColor: '#f9dac6',
    hairColor: '#1d191c',
    hairHighlight: '#352f36',
    faceStyle: {
      irisTop: '#263a52',
      irisBottom: '#4f7fa8',
      browColor: '#221c20',
      browThickness: 7.5,
      lashStyle: 'crisp',
      blushColor: 'rgba(245, 125, 132, 0.40)',
      lipColor: '#c85b62',
      eyeScale: 1.05,
      mouthOffsetY: 0,
    },
  },
  chandler: {
    id: 'chandler',
    name: 'Chandler',
    fullName: 'Chandler Bing',
    role: 'Dữ liệu, Tài chính & Copywriting',
    accentColor: '#365882',
    skinColor: '#f4d3bc',
    hairColor: '#5d4230',
    hairHighlight: '#7a5a44',
    faceStyle: {
      irisTop: '#2d3f4d',
      irisBottom: '#5a7d91',
      browColor: '#4e3728',
      browThickness: 8.5,
      lashStyle: 'clean',
      blushColor: 'rgba(236, 132, 118, 0.30)',
      lipColor: '#b36b62',
      eyeScale: 0.96,
      mouthOffsetY: 2,
      defaultSmirkTilt: 0.12,
    },
  },
  ross: {
    id: 'ross',
    name: 'Ross',
    fullName: 'Ross Geller',
    role: 'Nghiên cứu & Pháp lý',
    accentColor: '#8a5d3b',
    skinColor: '#f3d0b8',
    hairColor: '#2c221d',
    hairHighlight: '#483932',
    faceStyle: {
      irisTop: '#2f241e',
      irisBottom: '#694e3f',
      browColor: '#2a201b',
      browThickness: 10,
      lashStyle: 'clean',
      blushColor: 'rgba(236, 130, 118, 0.32)',
      lipColor: '#b06960',
      eyeScale: 0.98,
      mouthOffsetY: 2,
    },
  },
  joey: {
    id: 'joey',
    name: 'Joey',
    fullName: 'Joey Tribbiani',
    role: 'Truyền thông & Video',
    accentColor: '#3d3938',
    skinColor: '#efc6a6',
    hairColor: '#29201c',
    hairHighlight: '#453630',
    faceStyle: {
      irisTop: '#2a1f18',
      irisBottom: '#6a4b35',
      browColor: '#281e1a',
      browThickness: 9.5,
      lashStyle: 'clean',
      blushColor: 'rgba(238, 126, 108, 0.34)',
      lipColor: '#b8685c',
      eyeScale: 1.0,
      mouthOffsetY: 1,
    },
  },
  phoebe: {
    id: 'phoebe',
    name: 'Phoebe',
    fullName: 'Phoebe Buffay',
    role: 'Trải nghiệm KH & Sáng tạo',
    accentColor: '#d99a2b',
    skinColor: '#fce0cc',
    hairColor: '#e8c468',
    hairHighlight: '#f5dc93',
    faceStyle: {
      irisTop: '#2d574c',
      irisBottom: '#66a892',
      browColor: '#b89448',
      browThickness: 6.5,
      lashStyle: 'dreamy',
      blushColor: 'rgba(247, 138, 146, 0.46)',
      lipColor: '#da7274',
      eyeScale: 1.07,
      mouthOffsetY: -1,
    },
  },
};

const fabricCache = new Map();

/**
 * Generates crisp procedural fabric CanvasTextures (cached across instances).
 */
export function createFabricTexture(type) {
  if (fabricCache.has(type)) {
    return fabricCache.get(type);
  }

  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (type === 'plaid') {
    // Rachel's iconic warm 90s caramel/cream/espresso tartan skirt
    ctx.fillStyle = '#a97155';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = 'rgba(48, 30, 24, 0.42)';
    ctx.fillRect(0, 18, size, 22);
    ctx.fillRect(18, 0, 22, size);
    ctx.fillRect(0, 82, size, 22);
    ctx.fillRect(82, 0, 22, size);
    ctx.fillStyle = 'rgba(246, 232, 210, 0.72)';
    ctx.fillRect(0, 56, size, 5);
    ctx.fillRect(56, 0, 5, size);
    ctx.fillStyle = 'rgba(196, 68, 54, 0.55)';
    ctx.fillRect(0, 28, size, 3);
    ctx.fillRect(28, 0, 3, size);
    ctx.fillRect(0, 92, size, 3);
    ctx.fillRect(92, 0, 3, size);
  } else if (type === 'knit') {
    // Chandler's navy knit sweater vest with subtle diamond argyle weave
    ctx.fillStyle = '#243c5e';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.lineWidth = 2;
    for (let y = 0; y <= size; y += 32) {
      for (let x = 0; x <= size; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, y - 16);
        ctx.lineTo(x + 16, y);
        ctx.lineTo(x, y + 16);
        ctx.lineTo(x - 16, y);
        ctx.closePath();
        ctx.stroke();
      }
    }
    ctx.fillStyle = 'rgba(214, 178, 120, 0.22)';
    for (let y = 16; y < size; y += 32) {
      for (let x = 16; x < size; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, y - 8);
        ctx.lineTo(x + 8, y);
        ctx.lineTo(x, y + 8);
        ctx.lineTo(x - 8, y);
        ctx.closePath();
        ctx.fill();
      }
    }
  } else if (type === 'tweed') {
    // Ross's academic warm brown herringbone/speckled tweed blazer
    ctx.fillStyle = '#73533d';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = 'rgba(42, 28, 18, 0.28)';
    ctx.lineWidth = 2;
    for (let y = 0; y < size; y += 8) {
      ctx.beginPath();
      for (let x = 0; x < size; x += 16) {
        ctx.moveTo(x, y);
        ctx.lineTo(x + 8, y + 4);
        ctx.lineTo(x + 16, y);
      }
      ctx.stroke();
    }
    const speckles = ['#9c7b5c', '#4a3425', '#b59a7a', '#5a3d2b'];
    for (let i = 0; i < 240; i += 1) {
      ctx.fillStyle = speckles[i % speckles.length];
      const sx = (i * 37) % size;
      const sy = (i * 53) % size;
      ctx.fillRect(sx, sy, 2, 2);
    }
  } else if (type === 'boho') {
    // Phoebe's warm folk-patterned bohemian cardigan
    ctx.fillStyle = '#9c5879';
    ctx.fillRect(0, 0, size, size);
    const stripes = [
      { y: 12, h: 14, color: '#d89b3c' },
      { y: 34, h: 10, color: '#4b8a7d' },
      { y: 58, h: 18, color: '#c45b47' },
      { y: 88, h: 12, color: '#e6c16a' },
      { y: 110, h: 10, color: '#58789e' },
    ];
    for (const s of stripes) {
      ctx.fillStyle = s.color;
      ctx.fillRect(0, s.y, size, s.h);
    }
    ctx.fillStyle = 'rgba(255, 248, 232, 0.65)';
    for (let x = 8; x < size; x += 24) {
      ctx.beginPath();
      ctx.arc(x, 67, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + 12, 19, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (type === 'denim') {
    // Joey's blue jeans weave
    ctx.fillStyle = '#3b5878';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = 'rgba(220, 235, 250, 0.12)';
    ctx.lineWidth = 1.5;
    for (let i = -size; i < size * 2; i += 6) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + size, size);
      ctx.stroke();
    }
  } else if (type === 'tie_stripe') {
    // Chandler's burgundy & gold diagonal stripe tie
    ctx.fillStyle = '#7e2a35';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = '#e0b868';
    ctx.lineWidth = 8;
    for (let i = -size; i < size * 2; i += 28) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + size, size);
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.colorSpace = THREE.SRGBColorSpace;
  fabricCache.set(type, texture);
  return texture;
}
