const overlayMarkup = `
  <div class="alert-layer hidden" data-alert-layer aria-hidden="true"></div>
  <div class="hud-layer" aria-live="polite">
    <div class="hud-top">
      <div class="hud-top-row">
        <header class="hud-bar">
          <div class="hud-heading-line">
            <div class="title level-title">Level 1: Opuštěná laboratoř</div>
            <div class="subtitle sr-only" data-controls-hint>WASD/šipky = pohyb · E = interakce · Mezerník = střelba</div>
          </div>
        <div class="hud-health" aria-label="Stav životů a nábojů">
          <div class="hud-health-display">
            <span class="hud-health-hearts" data-health-hearts>❤❤❤</span>
            <span class="sr-only"><span class="hud-health-current">12</span> / <span class="hud-health-total">12</span></span>
          </div>
          <div class="hud-ammo" data-ammo aria-label="Stav nábojů: 0">
              <span class="hud-ammo-icon" aria-hidden="true">•</span>
              <span class="hud-ammo-label">Náboje</span>
              <span class="hud-ammo-count" data-ammo-count>0</span>
            </div>
          </div>
        </header>
        <div class="hud-actions">
          <button
            type="button"
            class="hud-button"
            data-quest-toggle
            aria-pressed="false"
            aria-label="Zobrazit úkol (I)"
            title="Úkoly (I)"
          >
            📜
          </button>
          <button
            type="button"
            class="hud-button"
            data-inventory-toggle
            aria-pressed="false"
            aria-label="Otevřít batoh (B)"
            title="Otevřít batoh (B)"
          >
            🎒
          </button>
          <div class="hud-toast hidden" role="status" aria-live="polite"></div>
          <button type="button" class="hud-button" data-fullscreen-toggle aria-pressed="false" aria-label="Celá obrazovka">
            ⛶
          </button>
        </div>
      </div>
      <section class="quest-log is-collapsed" aria-label="Quest log">
        <div class="quest-log-header">
          <div class="title">Úkol</div>
        </div>
        <div class="quest-log-body">
          <div class="quest-title" data-quest-title>Úkol načítám...</div>
          <div class="quest-description" data-quest-description></div>
        </div>
      </section>
    </div>
    <div class="hud-bottom">
      <div class="inventory-note" data-inventory-note>Mapa je ponořená do tmy. Hledej vypínače na zdech a seber všechny komponenty.</div>
    </div>
  </div>
  <div class="interaction-banner hidden" aria-live="polite">
    <div class="interaction-avatar" data-dialogue-avatar aria-hidden="true"></div>
    <div class="interaction-content">
      <div class="interaction-title">Interakce</div>
      <div class="interaction-text">Přibliž se ke starostce a stiskni E.</div>
    </div>
  </div>
  <section class="overlay safe-panel hidden" aria-label="Kód k sejfu" data-safe-panel aria-hidden="true">
    <div class="panel-title" data-safe-title>Sejf</div>
    <p class="menu-subtitle" data-safe-description>Zadej 4místnou kombinaci.</p>
    <form class="safe-form" data-safe-form>
      <label for="safe-code-input" class="menu-label">Kombinace</label>
      <div class="safe-row">
        <input
          id="safe-code-input"
          type="text"
          inputmode="numeric"
          pattern="[0-9]*"
          maxlength="4"
          placeholder="0000"
          autocomplete="one-time-code"
          data-safe-input
        />
        <button type="submit" class="menu-button" data-safe-submit>Otevřít</button>
        <button type="button" class="menu-button ghost" data-safe-cancel>Zavřít</button>
      </div>
    </form>
    <p class="menu-subtitle safe-feedback" data-safe-feedback></p>
  </section>
  <section class="overlay quiz-panel hidden" aria-label="Kvízové otázky" data-quiz-panel aria-hidden="true">
    <div class="panel-title" data-quiz-title>Kvíz</div>
    <p class="menu-subtitle" data-quiz-question>Otázka se načítá...</p>
    <div class="quiz-options" data-quiz-options></div>
    <p class="menu-subtitle quiz-feedback" data-quiz-feedback></p>
    <div class="quiz-actions">
      <button type="button" class="menu-button ghost" data-quiz-cancel>Zavřít</button>
    </div>
  </section>
  <section class="overlay menu-panel hidden" aria-label="Hlavní menu">
    <div class="menu-screen" data-menu-screen="main">
      <div class="panel-title">Hlavní menu</div>
      <div class="menu-list">
        <button type="button" class="menu-button" data-menu-newgame>Nová hra</button>
        <button type="button" class="menu-button" data-menu-continue>Pokračovat</button>
        <button type="button" class="menu-button" data-menu-levels>Výběr levelu</button>
        <button type="button" class="menu-button" data-menu-settings>Nastavení</button>
      </div>
    </div>
    <div class="menu-screen hidden" data-menu-screen="new-game">
      <div class="panel-title">Nová hra</div>
      <div class="menu-list">
        <label for="slot-input" class="menu-label">Slot</label>
        <input id="slot-input" type="text" aria-label="ID slotu pro uložení" data-slot-input placeholder="slot-1" />
        <button type="button" class="menu-button" data-menu-start>Spustit</button>
        <button type="button" class="menu-button ghost" data-menu-back>← Zpět</button>
      </div>
    </div>
    <div class="menu-screen hidden" data-menu-screen="continue">
      <div class="panel-title">Pokračovat</div>
      <div class="menu-list">
        <button type="button" class="menu-button" data-menu-continue-latest>Pokračovat z posledního savu</button>
        <div class="save-panel">
          <div class="panel-title">Uložené pozice</div>
          <div class="save-slot-list" data-save-slot-list></div>
        </div>
        <button type="button" class="menu-button ghost" data-menu-back>← Zpět</button>
      </div>
    </div>
    <div class="menu-screen hidden" data-menu-screen="levels">
      <div class="panel-title">Výběr levelu</div>
      <p class="menu-subtitle">Vyber úroveň a spusť novou hru.</p>
      <div class="menu-level-list" data-level-list></div>
      <button type="button" class="menu-button ghost" data-menu-back>← Zpět</button>
    </div>
    <div class="menu-screen hidden" data-menu-screen="settings">
      <div class="panel-title">Nastavení</div>
      <p class="menu-subtitle">Nastavení budou brzy dostupná.</p>
      <button type="button" class="menu-button ghost" data-menu-back>← Zpět</button>
    </div>
  </section>
  <section class="overlay loading-panel hidden" aria-live="polite">
    <div class="panel-title">Načítání</div>
    <p data-loading-text>Načítání...</p>
  </section>
  <section class="overlay continue-panel hidden" aria-label="Načteno">
    <div class="panel-title" data-continue-title>Level načten</div>
    <p class="menu-subtitle" data-continue-subtitle>Stiskni libovolnou klávesu pro pokračování.</p>
    <p class="menu-subtitle continue-detail hidden" data-continue-detail></p>
  </section>
  <section class="overlay prologue-panel hidden" aria-label="Prolog vyšetřování">
    <div class="panel-title">Prolog</div>
    <div class="prologue-step">
      <div class="prologue-meta">
        <div class="prologue-kicker" data-prologue-kicker>Prolog</div>
        <div class="prologue-progress" data-prologue-progress>1 / 3</div>
      </div>
      <div class="prologue-card">
        <div class="prologue-avatar" data-prologue-avatar aria-hidden="true"></div>
        <div class="prologue-content">
          <div class="prologue-heading" data-prologue-step-title>Sen</div>
          <div class="prologue-speaker" data-prologue-speaker>Ty</div>
          <div class="prologue-body" data-prologue-body></div>
        </div>
      </div>
    </div>
    <div class="prologue-actions">
      <button type="button" class="menu-button ghost" data-prologue-back>← Zpět</button>
      <button type="button" class="menu-button" data-prologue-continue>Pokračovat</button>
    </div>
  </section>
  <section class="overlay pause-panel hidden" aria-label="Pauza">
    <div class="panel-title">Pauza</div>
    <p class="menu-subtitle">Stiskni P nebo vyber možnost.</p>
    <p class="menu-subtitle binding-hint" data-pause-bindings></p>
    <div class="menu-actions">
      <button type="button" class="menu-button" data-pause-resume>Pokračovat</button>
      <button type="button" class="menu-button" data-pause-restart>Restartovat úroveň</button>
      <button type="button" class="menu-button" data-pause-save>Uložit ručně</button>
      <button type="button" class="menu-button ghost" data-pause-menu>Hlavní menu</button>
    </div>
  </section>
  <section
    class="overlay inventory inventory-modal collapsed"
    aria-label="Inventář s deseti sloty"
    aria-hidden="true"
  >
    <div class="inventory-header">
      <div class="title">Výbava</div>
    </div>
    <div class="inventory-grid" role="list"></div>
  </section>
`;

export function collectOverlayRefs(root) {
  if (!root) return {};
  return {
    gameFrame: root,
    menuPanel: root.querySelector('.menu-panel') ?? null,
    menuScreens: root.querySelectorAll('[data-menu-screen]'),
    menuLevelList: root.querySelector('[data-level-list]') ?? null,
    menuBackButtons: root.querySelectorAll('[data-menu-back]'),
    menuNewGameButton: root.querySelector('[data-menu-newgame]') ?? null,
    menuContinueButton: root.querySelector('[data-menu-continue]') ?? null,
    menuContinueLatestButton: root.querySelector('[data-menu-continue-latest]') ?? null,
    menuLevelsButton: root.querySelector('[data-menu-levels]') ?? null,
    fullscreenButton: root.querySelector('[data-fullscreen-toggle]') ?? null,
    gameShell: root.closest?.('.game-shell') ?? null,
    alertLayer: root.querySelector('[data-alert-layer]') ?? null,
    pausePanel: root.querySelector('.pause-panel') ?? null,
    loadingPanel: root.querySelector('.loading-panel') ?? null,
    continuePanel: root.querySelector('.continue-panel') ?? null,
    continueTitle: root.querySelector('[data-continue-title]') ?? null,
    continueSubtitle: root.querySelector('[data-continue-subtitle]') ?? null,
    continueDetail: root.querySelector('[data-continue-detail]') ?? null,
    prologuePanel: root.querySelector('.prologue-panel') ?? null,
    prologueContinueButton: root.querySelector('[data-prologue-continue]') ?? null,
    prologueBackButton: root.querySelector('[data-prologue-back]') ?? null,
    prologueStepTitle: root.querySelector('[data-prologue-step-title]') ?? null,
    prologueStepBody: root.querySelector('[data-prologue-body]') ?? null,
    prologueProgress: root.querySelector('[data-prologue-progress]') ?? null,
    prologueAvatar: root.querySelector('[data-prologue-avatar]') ?? null,
    prologueSpeaker: root.querySelector('[data-prologue-speaker]') ?? null,
    prologueKicker: root.querySelector('[data-prologue-kicker]') ?? null,
    slotInput: root.querySelector('[data-slot-input]') ?? null,
    saveSlotList: root.querySelector('[data-save-slot-list]') ?? null,
    startButton: root.querySelector('[data-menu-start]') ?? null,
    settingsButton: root.querySelector('[data-menu-settings]') ?? null,
    pauseResumeButton: root.querySelector('[data-pause-resume]') ?? null,
    pauseRestartButton: root.querySelector('[data-pause-restart]') ?? null,
    pauseSaveButton: root.querySelector('[data-pause-save]') ?? null,
    pauseMenuButton: root.querySelector('[data-pause-menu]') ?? null,
  };
}

export function createOverlays({ documentRoot = document, container } = {}) {
  if (!documentRoot || !container) {
    return { container: null, refs: {} };
  }
  const template = documentRoot.createElement('template');
  template.innerHTML = overlayMarkup.trim();
  container.appendChild(template.content);
  return { container, refs: collectOverlayRefs(container) };
}
