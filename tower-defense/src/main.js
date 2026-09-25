/* =====================================================================
 * main.js — Arranque: carga el perfil, prepara la intro y coordina el
 * cambio entre menús y partidas.
 * ===================================================================== */
window.TD = window.TD || {};

TD.App = class {
  constructor() {
    TD.Profile.load();
    TD.Profile.onToast = TD.toast;
    const s = TD.Profile.data.settings;
    TD.Audio.enabled = s.sound;
    TD.Audio.volume = s.volume;

    this.bg = new TD.BgScene(document.getElementById('bg-canvas'));
    this.menus = new TD.Menus(this);
    this.menus.sel.hero = TD.Profile.data.lastHero || 'rex';
    this.menus.sel.diff = TD.Profile.data.lastDiff || 'guardian';
    this.ui = new TD.GameUI(this);
    this.game = null;
    this.bg.start();

    // Intro: cualquier clic o tecla lleva al menú (y activa el audio)
    const go = () => {
      if (!document.getElementById('screen-intro').classList.contains('active')) return;
      TD.Audio.init();
      TD.Audio.setVolume(TD.Profile.data.settings.volume);
      TD.Audio.play('wave');
      this.showMenu();
    };
    document.getElementById('screen-intro').addEventListener('click', go);
    document.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') go(); });
  }

  inGame() { return document.getElementById('screen-game').classList.contains('active'); }

  showMenu() {
    if (this.game) { this.game.stop(); this.game = null; }
    document.getElementById('modal').hidden = true;
    this.bg.start();
    this.menus.show('menu');
  }

  startGame(opts) {
    if (this.game) this.game.stop();
    document.getElementById('modal').hidden = true;
    this.bg.stop();
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-game').classList.add('active');
    this.game = new TD.Game(document.getElementById('game-canvas'), opts, this.ui);
    this.ui.attach(this.game);
    this.game.start();
  }
};

window.addEventListener('DOMContentLoaded', () => { TD.app = new TD.App(); });
