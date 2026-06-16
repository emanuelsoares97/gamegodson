// V24 — motor de áudio com ficheiros reais + fallback sintético.
// Primeiro tenta tocar os WAV em assets/audio/. Se algum ficheiro falhar, usa o som sintético antigo.
(function () {
  const SETTINGS_KEY = 'ofdd_audio_settings_v1';
  const DEFAULTS = {
    music: true,
    sfx: true,
    volume: window.OFDD_AUDIO_CONFIG?.defaultVolume ?? 0.28,
  };

  let ctx = null;
  let masterGain = null;
  let musicGain = null;
  let sfxGain = null;
  let activeTrack = null;
  let currentMusic = null;
  let oscillators = [];
  let usingSynthMusic = false;

  function loadSettings() {
    try {
      return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') || {}) };
    } catch (error) {
      return { ...DEFAULTS };
    }
  }

  let settings = loadSettings();
  // Segurança V26: se ficou guardado volume alto das versões anteriores, baixa para um nível seguro.
  if (!localStorage.getItem('ofdd_audio_safe_v26')) {
    settings.volume = Math.min(Number(settings.volume) || DEFAULTS.volume, 0.28);
    try { localStorage.setItem('ofdd_audio_safe_v26', '1'); } catch (error) {}
    saveSettings();
  }

  function saveSettings() {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (error) {}
  }

  function ensureContext() {
    if (ctx) return ctx;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    ctx = new AudioCtx();
    masterGain = ctx.createGain();
    musicGain = ctx.createGain();
    sfxGain = ctx.createGain();
    masterGain.gain.value = settings.volume;
    musicGain.gain.value = settings.music ? 0.10 : 0;
    sfxGain.gain.value = settings.sfx ? 0.22 : 0;
    musicGain.connect(masterGain);
    sfxGain.connect(masterGain);
    masterGain.connect(ctx.destination);
    return ctx;
  }

  async function unlock() {
    // Importante: isto nunca pode bloquear o início do jogo.
    // Alguns browsers deixam audio.play() pendurado quando ainda não existe ficheiro carregado.
    try {
      const audioCtx = ensureContext();
      if (audioCtx && audioCtx.state === 'suspended') {
        await Promise.race([
          audioCtx.resume(),
          new Promise(resolve => setTimeout(resolve, 250)),
        ]);
      }
    } catch (error) {}
    return true;
  }

  function stopSynthMusic() {
    oscillators.forEach(item => {
      try { item.stop(); } catch (error) {}
      try { item.disconnect(); } catch (error) {}
    });
    oscillators = [];
    usingSynthMusic = false;
  }

  function stopFileMusic() {
    if (!currentMusic) return;
    try { currentMusic.pause(); } catch (error) {}
    try { currentMusic.currentTime = 0; } catch (error) {}
    currentMusic = null;
  }

  function stopMusic() {
    stopFileMusic();
    stopSynthMusic();
    activeTrack = null;
  }

  function createOsc(freq, type, gainValue, detune = 0) {
    const audioCtx = ensureContext();
    if (!audioCtx || !musicGain) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;
    gain.gain.value = gainValue;
    osc.connect(gain);
    gain.connect(musicGain);
    osc.start();
    oscillators.push(osc, gain);
  }

  function playSynthMusic(track = 'menu') {
    stopFileMusic();
    stopSynthMusic();
    usingSynthMusic = true;

    const presets = {
      menu: [[196, 'sine', 0.13, -4], [392, 'triangle', 0.05, 3], [98, 'sine', 0.08, 0]],
      peace: [[220, 'sine', 0.10, 0], [330, 'triangle', 0.04, 4], [440, 'sine', 0.025, -6]],
      dark: [[82, 'sawtooth', 0.055, -8], [123, 'triangle', 0.06, 0], [246, 'sine', 0.025, 5]],
      battle: [[110, 'sawtooth', 0.075, 0], [220, 'square', 0.035, -5], [330, 'triangle', 0.03, 7]],
      boss: [[73, 'sawtooth', 0.09, -4], [146, 'square', 0.04, 0], [292, 'triangle', 0.025, 6]],
    };

    const list = presets[track] || presets.menu;
    list.forEach(([freq, type, gain, detune]) => createOsc(freq, type, gain, detune));
  }

  async function playMusic(track = 'menu') {
    if (!settings.music) return;
    if (activeTrack === track && (currentMusic || usingSynthMusic)) return;

    stopMusic();
    activeTrack = track;

    const trackCfg = window.OFDD_AUDIO_CONFIG?.tracks?.[track];
    const file = trackCfg?.file;

    if (file) {
      const audio = new Audio(file);
      audio.loop = true;
      audio.preload = 'auto';
      audio.volume = Math.max(0, Math.min(1, settings.volume * 0.22));
      currentMusic = audio;

      try {
        await audio.play();
        return;
      } catch (error) {
        // Fallback se o browser bloquear ou se o ficheiro não carregar.
        currentMusic = null;
      }
    }

    playSynthMusic(trackCfg?.synth || track);
  }

  function playSynthSfx(name = 'click') {
    if (!settings.sfx) return;
    const audioCtx = ensureContext();
    if (!audioCtx || !sfxGain) return;

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const presets = {
      click: { f1: 740, f2: 520, dur: 0.06, type: 'square', gain: 0.08 },
      light: { f1: 880, f2: 1320, dur: 0.22, type: 'sine', gain: 0.13 },
      dark: { f1: 120, f2: 68, dur: 0.22, type: 'sawtooth', gain: 0.12 },
      victory: { f1: 523, f2: 784, dur: 0.32, type: 'triangle', gain: 0.12 },
      heal: { f1: 620, f2: 980, dur: 0.26, type: 'sine', gain: 0.10 },
      error: { f1: 190, f2: 120, dur: 0.16, type: 'square', gain: 0.07 },
    };
    const p = presets[name] || presets.click;

    osc.type = p.type;
    osc.frequency.setValueAtTime(p.f1, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, p.f2), now + p.dur);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(p.gain, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + p.dur);
    osc.connect(gain);
    gain.connect(sfxGain);
    osc.start(now);
    osc.stop(now + p.dur + 0.02);
  }

  function playSfx(name = 'click') {
    if (!settings.sfx) return;

    const file = window.OFDD_AUDIO_CONFIG?.sfx?.[name];
    if (file) {
      const audio = new Audio(file);
      audio.preload = 'auto';
      audio.volume = Math.max(0, Math.min(1, settings.volume * 0.28));
      audio.play().catch(() => playSynthSfx(name));
      return;
    }

    playSynthSfx(name);
  }

  function setVolume(value) {
    settings.volume = Math.max(0, Math.min(1, Number(value) || 0));
    if (masterGain) masterGain.gain.value = settings.volume;
    if (currentMusic) currentMusic.volume = Math.max(0, Math.min(1, settings.volume * 0.22));
    saveSettings();
  }

  function setMusic(enabled) {
    settings.music = Boolean(enabled);
    if (musicGain) musicGain.gain.value = settings.music ? 0.10 : 0;
    if (currentMusic) currentMusic.volume = settings.music ? Math.max(0, Math.min(1, settings.volume * 0.22)) : 0;
    if (!settings.music) stopMusic();
    saveSettings();
  }

  function setSfx(enabled) {
    settings.sfx = Boolean(enabled);
    if (sfxGain) sfxGain.gain.value = settings.sfx ? 0.22 : 0;
    saveSettings();
  }

  function getSettings() {
    return { ...settings };
  }

  window.OFDD_AUDIO = {
    unlock,
    playMusic,
    stopMusic,
    playSfx,
    setVolume,
    setMusic,
    setSfx,
    getSettings,
  };
})();
