import { CHARACTER_META, CHARACTER_ORDER } from '../3d/characters/CharacterMeta.js';

/**
 * Bottom quick-select dock for the 6 Friends characters (shows live agent state dot).
 */
export class CharacterDock {
  constructor(container, { onSelectCharacter, onResetOverview }) {
    this.container = container;
    this.onSelectCharacter = onSelectCharacter;
    this.onResetOverview = onResetOverview;
    this.selectedId = null;
    this.agentStates = {};
    this.render();
  }

  show() {
    this.container.classList.remove('hidden');
  }

  hide() {
    this.container.classList.add('hidden');
  }

  setSelected(characterId) {
    this.selectedId = characterId;
    this.render();
  }

  setAgentState(characterId, state) {
    this.agentStates[characterId] = state;
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <button id="dock-overview-btn" class="dock-char-btn ${this.selectedId === null ? 'active' : ''}" type="button" title="Toàn cảnh văn phòng">
        🏢 Toàn cảnh
      </button>
      ${CHARACTER_ORDER.map((id) => {
        const m = CHARACTER_META[id];
        const active = this.selectedId === id ? 'active' : '';
        const st = this.agentStates[id] || 'IDLE';
        const statusClass =
          st === 'WAITING_APPROVAL'
            ? 'state-approval'
            : st === 'WORKING'
              ? 'state-working'
              : '';
        return `
          <button class="dock-char-btn ${active}" data-dock-char="${id}" type="button" title="${m.fullName} — ${m.role}">
            <span class="dock-swatch ${statusClass}" style="background:${m.accentColor}"></span>
            <span>${m.name}</span>
          </button>
        `;
      }).join('')}
    `;

    this.container.querySelector('#dock-overview-btn')?.addEventListener('click', () => {
      this.onResetOverview?.();
    });
    this.container.querySelectorAll('[data-dock-char]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.onSelectCharacter?.(btn.getAttribute('data-dock-char'));
      });
    });
  }
}
