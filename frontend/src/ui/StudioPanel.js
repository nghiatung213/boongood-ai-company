import {
  BODY_GESTURES,
  BODY_GESTURE_LABELS,
  CHARACTER_META,
  CHARACTER_ORDER,
  FACE_EXPRESSIONS,
  FACE_EXPRESSION_LABELS,
} from '../3d/characters/CharacterMeta.js';

/**
 * Interactive Studio Inspect Mode panel allowing instant testing of:
 * - Lineup (6 characters side-by-side) vs Close-up Portrait (360° orbit)
 * - All 6 Friends characters
 * - All 12 face_expressions + 10 body_gestures + Talk Lip-Sync + Blink + Walk
 */
export class StudioPanel {
  constructor(container, controller) {
    this.container = container;
    this.controller = controller;
    this.visible = false;
  }

  show() {
    this.visible = true;
    this.container.classList.remove('hidden');
    this.render();
  }

  hide() {
    this.visible = false;
    this.container.classList.add('hidden');
  }

  render() {
    const c = this.controller;
    const meta = CHARACTER_META[c.selectedId];

    this.container.innerHTML = `
      <div class="studio-header">
        <h2>Studio Inspect</h2>
        <span class="studio-badge">${c.viewMode === 'lineup' ? 'Cả 6 nhân vật' : meta.name}</span>
      </div>
      <div class="studio-body">
        <div>
          <p class="studio-section-title">Góc nhìn kiểm thử</p>
          <div class="studio-segmented">
            <button id="studio-view-lineup" class="studio-seg-btn ${c.viewMode === 'lineup' ? 'active' : ''}" type="button">
              Hàng ngang 6 người
            </button>
            <button id="studio-view-portrait" class="studio-seg-btn ${c.viewMode === 'portrait' ? 'active' : ''}" type="button">
              Soi cận mặt 360°
            </button>
          </div>
        </div>

        <div>
          <p class="studio-section-title">Nhân vật Friends (6)</p>
          <div class="studio-char-grid">
            ${CHARACTER_ORDER.map((id) => {
              const m = CHARACTER_META[id];
              const active = id === c.selectedId ? 'active' : '';
              return `
                <button class="studio-chip ${active}" data-char="${id}" type="button">
                  <span class="dock-swatch" style="background:${m.accentColor}"></span>
                  <span>${m.name}</span>
                </button>
              `;
            }).join('')}
          </div>
        </div>

        <div class="studio-info-card">
          <strong>${meta.fullName}</strong>
          <span>${meta.role}</span>
        </div>

        <div>
          <p class="studio-section-title">Diễn xuất trực tiếp</p>
          <div class="studio-toggles">
            <button id="studio-btn-talk" class="studio-chip ${c.isSpeaking ? 'active' : ''}" type="button">
              💬 Nói
            </button>
            <button id="studio-btn-blink" class="studio-chip" type="button">
              👁️ Chớp mắt
            </button>
            <button id="studio-btn-walk" class="studio-chip ${c.isWalking ? 'active' : ''}" type="button">
              🚶 Bước đi
            </button>
          </div>
        </div>

        <div>
          <p class="studio-section-title">12 Biểu cảm khuôn mặt</p>
          <div class="studio-chip-grid">
            ${FACE_EXPRESSIONS.map((expr) => {
              const active = expr === c.currentExpression ? 'active' : '';
              return `
                <button class="studio-chip ${active}" data-expr="${expr}" type="button">
                  <span>${FACE_EXPRESSION_LABELS[expr]}</span>
                </button>
              `;
            }).join('')}
          </div>
        </div>

        <div>
          <p class="studio-section-title">10 Động tác cơ thể</p>
          <div class="studio-chip-grid">
            ${BODY_GESTURES.map((gest) => {
              const active = !c.isWalking && gest === c.currentGesture ? 'active' : '';
              return `
                <button class="studio-chip ${active}" data-gesture="${gest}" type="button">
                  <span>${BODY_GESTURE_LABELS[gest]}</span>
                </button>
              `;
            }).join('')}
          </div>
        </div>

        <p class="studio-hint">Kéo chuột hoặc vuốt để xoay 360° · Cuộn để phóng to soi mặt</p>
      </div>
    `;

    this._bindEvents();
  }

  _bindEvents() {
    this.container.querySelector('#studio-view-lineup')?.addEventListener('click', () => {
      this.controller.setViewMode('lineup');
      this.render();
    });
    this.container.querySelector('#studio-view-portrait')?.addEventListener('click', () => {
      this.controller.setViewMode('portrait');
      this.render();
    });

    this.container.querySelectorAll('[data-char]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-char');
        this.controller.selectCharacter(id, true);
        this.render();
      });
    });

    this.container.querySelectorAll('[data-expr]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.controller.applyExpression(btn.getAttribute('data-expr'));
        this.render();
      });
    });

    this.container.querySelectorAll('[data-gesture]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.controller.applyGesture(btn.getAttribute('data-gesture'));
        this.render();
      });
    });

    this.container.querySelector('#studio-btn-talk')?.addEventListener('click', () => {
      this.controller.toggleSpeaking();
      this.render();
    });

    this.container.querySelector('#studio-btn-blink')?.addEventListener('click', () => {
      this.controller.triggerBlink();
    });

    this.container.querySelector('#studio-btn-walk')?.addEventListener('click', () => {
      this.controller.toggleWalking();
      this.render();
    });
  }
}
