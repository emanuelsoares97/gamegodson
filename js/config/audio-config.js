// Configuração de som.
// V24 já inclui sons gerados em WAV dentro de assets/audio/.
// Quando quiseres trocar por sons profissionais, mantém os mesmos nomes ou altera aqui.
window.OFDD_AUDIO_CONFIG = {
  defaultVolume: 0.28,
  tracks: {
    menu: { label: 'Menu', file: 'assets/audio/menu-theme.wav', synth: 'menu' },
    peace: { label: 'Cidade em paz', file: 'assets/audio/map-peace.wav', synth: 'peace' },
    dark: { label: 'Mapa sombrio', file: 'assets/audio/map-dark.wav', synth: 'dark' },
    battle: { label: 'Batalha', file: 'assets/audio/battle-theme.wav', synth: 'battle' },
    boss: { label: 'Boss', file: 'assets/audio/boss-theme.wav', synth: 'boss' },
  },
  sfx: {
    click: 'assets/audio/click.wav',
    light: 'assets/audio/light-attack.wav',
    dark: 'assets/audio/dark-hit.wav',
    victory: 'assets/audio/victory.wav',
    heal: 'assets/audio/heal.wav',
    angel: 'assets/audio/angel-aaa.wav',
  },
};
