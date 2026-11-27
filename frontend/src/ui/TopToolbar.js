/**
 * Minimal top toolbar: Brand mark, Day/Evening lighting toggle, Studio Inspect button.
 */
export class TopToolbar {
  constructor(container, { onToggleLighting, onToggleStudio }) {
    this.container = container;
    this.onToggleLighting = onToggleLighting;
    this.onToggleStudio = onToggleStudio;
    this.lightingMode = 'day';
    this.studioActive = true;
    this.render();
  }

  setState({ lightingMode, studioActive }) {
    if (lightingMode !== undefined) this.lightingMode = lightingMode;
    if (studioActive !== undefined) this.studioActive = studioActive;
    this.render();
  }

  render() {
    const lightLabel = this.lightingMode === 'evening' ? '🌙 Tối chill' : '☀️ Ban ngày';
    this.container.innerHTML = `
      <div class="toolbar-group">
        <div class="brand-pill">
          <span class="brand-mark" aria-hidden="true"></span>
          <h1 class="brand-title">Boongood × Friends</h1>
          <span class="brand-sub">Milestone 1 · Studio</span>
        </div>
      </div>
      <div class="toolbar-group">
        <button id="btn-lighting-toggle" class="tool-btn" type="button" title="Đổi ánh sáng ngày / tối">
          ${lightLabel}
        </button>
        <button id="btn-studio-toggle" class="tool-btn ${this.studioActive ? 'active' : ''}" type="button" title="Chế độ soi cận mặt & kiểm thử nhân vật">
          🎭 Studio
        </button>
      </div>
    `;

    this.container.querySelector('#btn-lighting-toggle')?.addEventListener('click', () => {
      this.onToggleLighting?.();
    });
    this.container.querySelector('#btn-studio-toggle')?.addEventListener('click', () => {
      this.onToggleStudio?.();
    });
  }
}
