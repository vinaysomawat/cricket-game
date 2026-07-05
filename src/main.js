import { Game } from './game/Game.js';

function boot() {
  const container = document.getElementById('stadium-3d');
  window.__game = new Game(container);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
