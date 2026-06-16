// V23 — Menu inicial e ligação ao áudio.
(function () {
  const SAVE_KEY = 'ofdd_mobile_save_v33';
  const menu = document.getElementById('titleMenu');
  if (!menu) return;
  window.OFDD_MENU_OPEN = true;

  const startBtn = document.getElementById('menuStartBtn');
  const continueBtn = document.getElementById('menuContinueBtn');
  const newGameBtn = document.getElementById('menuNewGameBtn');
  const creditsBtn = document.getElementById('menuCreditsBtn');
  const creditsPanel = document.getElementById('menuCreditsPanel');
  const creditsCloseBtn = document.getElementById('menuCreditsCloseBtn');
  const musicBtn = document.getElementById('menuMusicBtn');
  const sfxBtn = document.getElementById('menuSfxBtn');
  const volumeRange = document.getElementById('menuVolumeRange');
  const reference = document.getElementById('titleBibleReference');
  const returnMenuBtn = document.getElementById('returnMenuBtn');

  function hasSave() {
    try { return Boolean(localStorage.getItem(SAVE_KEY)); } catch (error) { return false; }
  }

  function refreshButtons() {
    const settings = window.OFDD_AUDIO?.getSettings?.() || { music: true, sfx: true, volume: 0.28 };
    if (continueBtn) continueBtn.disabled = !hasSave();
    if (musicBtn) musicBtn.textContent = `Música: ${settings.music ? 'Ligada' : 'Desligada'}`;
    if (sfxBtn) sfxBtn.textContent = `Som: ${settings.sfx ? 'Ligado' : 'Desligado'}`;
    if (volumeRange) volumeRange.value = Math.round((settings.volume ?? 0.55) * 100);
  }

  function applyMenuReference() {
    const ref = window.OFDD_BIBLE_REFERENCES?.menu;
    if (!reference || !ref) return;
    reference.innerHTML = `<strong>${ref.text}</strong><span>${ref.reference}</span>`;
  }


  async function safeUnlockAudio() {
    try {
      await Promise.race([
        window.OFDD_AUDIO?.unlock?.() || Promise.resolve(),
        new Promise(resolve => setTimeout(resolve, 300)),
      ]);
    } catch (error) {}
  }

  function startGameScreen() {
    window.OFDD_MENU_OPEN = false;
    menu.classList.add('hidden');
    document.body.classList.add('game-started');
    document.body.classList.remove('game-paused');
  }

  function openTitleMenu() {
    window.OFDD_MENU_OPEN = true;
    menu.classList.remove('hidden');
    document.body.classList.remove('game-started');
    document.body.classList.add('game-paused');
    creditsPanel?.classList.add('hidden');
    refreshButtons();
    safeUnlockAudio().then(() => {
      window.OFDD_AUDIO?.playSfx?.('click');
      window.OFDD_AUDIO?.playMusic?.('menu');
    });
  }

  function chooseTrack() {
    try {
      if (typeof battle !== 'undefined' && battle?.active) {
        return ['kraidus', 'nilzin_shadow', 'lurei_shadow'].includes(battle.enemy?.type) ? 'boss' : 'battle';
      }
      if (typeof currentMap !== 'undefined') {
        const key = currentMap?.key || '';
        if (key.includes('kraidus') || key.includes('ruin') || key.includes('shadow') || key.includes('cave')) return 'dark';
        if (key.includes('peace') || key.includes('eldoria')) return 'peace';
      }
    } catch (error) {}
    return 'peace';
  }

  async function enterGame() {
    // O jogo tem de arrancar mesmo que o browser bloqueie ou atrase o áudio.
    startGameScreen();
    safeUnlockAudio().then(() => {
      window.OFDD_AUDIO?.playSfx?.('click');
      window.OFDD_AUDIO?.playMusic?.(chooseTrack());
    });
  }

  async function playMenuMusic() {
    await safeUnlockAudio();
    window.OFDD_AUDIO?.playMusic?.('menu');
  }

  startBtn?.addEventListener('click', enterGame);
  continueBtn?.addEventListener('click', enterGame);

  newGameBtn?.addEventListener('click', async () => {
    await safeUnlockAudio();
    window.OFDD_AUDIO?.playSfx?.('dark');
    const ok = confirm('Queres mesmo começar um novo jogo? O progresso guardado neste navegador será limpo.');
    if (!ok) return;

    try { localStorage.removeItem(SAVE_KEY); } catch (error) {}
    if (typeof resetProgress === 'function') {
      resetProgress();
    } else {
      window.location.reload();
    }
  });

  creditsBtn?.addEventListener('click', async () => {
    await playMenuMusic();
    window.OFDD_AUDIO?.playSfx?.('click');
    creditsPanel?.classList.remove('hidden');
  });

  creditsCloseBtn?.addEventListener('click', () => {
    window.OFDD_AUDIO?.playSfx?.('click');
    creditsPanel?.classList.add('hidden');
  });

  musicBtn?.addEventListener('click', async () => {
    await safeUnlockAudio();
    const settings = window.OFDD_AUDIO?.getSettings?.() || { music: true };
    window.OFDD_AUDIO?.setMusic?.(!settings.music);
    if (!settings.music) window.OFDD_AUDIO?.playMusic?.(menu.classList.contains('hidden') ? chooseTrack() : 'menu');
    refreshButtons();
  });

  sfxBtn?.addEventListener('click', async () => {
    await safeUnlockAudio();
    const settings = window.OFDD_AUDIO?.getSettings?.() || { sfx: true };
    window.OFDD_AUDIO?.setSfx?.(!settings.sfx);
    window.OFDD_AUDIO?.playSfx?.('click');
    refreshButtons();
  });

  volumeRange?.addEventListener('input', () => {
    window.OFDD_AUDIO?.setVolume?.((Number(volumeRange.value) || 0) / 100);
  });

  returnMenuBtn?.addEventListener('click', openTitleMenu);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menu.classList.contains('hidden')) {
      event.preventDefault();
      openTitleMenu();
    }
  });

  // Pequenos hooks de som no jogo, sem mexer na lógica principal.
  function installAudioHooks() {
    if (window.__ofddAudioHooksInstalled) return;
    window.__ofddAudioHooksInstalled = true;

    if (typeof addBattleEffect === 'function') {
      const originalAddBattleEffect = addBattleEffect;
      addBattleEffect = function (type, payload) {
        if (type === 'light_beam' || type === 'light_rain' || type === 'falling_light' || type === 'heal') {
          window.OFDD_AUDIO?.playSfx?.('light');
        }
        if (type === 'dark_hit' || type === 'slash') {
          window.OFDD_AUDIO?.playSfx?.('dark');
        }
        return originalAddBattleEffect(type, payload);
      };
    }

    if (typeof finishBattleVictory === 'function') {
      const originalFinishBattleVictory = finishBattleVictory;
      finishBattleVictory = function () {
        window.OFDD_AUDIO?.playSfx?.('victory');
        return originalFinishBattleVictory();
      };
    }
  }

  setInterval(() => {
    installAudioHooks();
    if (!menu.classList.contains('hidden')) return;
    const settings = window.OFDD_AUDIO?.getSettings?.() || { music: true };
    if (settings.music) window.OFDD_AUDIO?.playMusic?.(chooseTrack());
  }, 1600);

  applyMenuReference();
  refreshButtons();
})();
