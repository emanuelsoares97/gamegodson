// CENA: Nilzin rapta Lurei
// Aqui defines se Lurei aparece normal, dominado, guerreiro, etc.
window.GAME_SCENES = window.GAME_SCENES || {};

window.GAME_SCENES.nilzinAbduction = {
  title: 'Rapto de Lurei',
  lines: [
    'Nilzin desaparece no meio da sombra e reaparece ao lado de Lurei.',
    'A roda sombria abre-se atrás deles e começa a puxar a luz à volta.',
    'Denzel corre na direção de Lurei com as asas abertas.',
    'Antes de Denzel o alcançar, Nilzin agarra Lurei e puxa-o para dentro do portal.',
    'A roda fecha-se. Nilzin desaparece com Lurei e a praça fica em silêncio.',
  ],
  actors: {
    lurei: { form: 'normal', x: 310, y: 214, scale: 1.15 },
    nilzin: { x: 356, y: 198, scale: 1.18 },
    denzel: { startX: 108, endX: 278, y: 290, yLift: 10, scale: 0.58, direction: 'right' },
  },
  // As asas desta cena usam a mesma configuração do mapa: js/config/denzel-visual-config.js -> mapWings.

  portal: {
    x: 334,
    y: 210,
    scale: 1.32,
    showFromStep: 1,
    fadeOutOnStep: 3,
  },
};
