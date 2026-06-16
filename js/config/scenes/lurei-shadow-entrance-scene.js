// CENA: Nilzin apresenta o Guerreiro Sombrio
// Nilzin e o Guerreiro Sombrio começam lado a lado.
// Depois o Guerreiro Sombrio avança para proteger Nilzin.
window.GAME_SCENES = window.GAME_SCENES || {};

window.GAME_SCENES.lureiShadowEntrance = {
  title: 'Ruínas de Elranor — O Guerreiro Sombrio',
  lines: [
    'No centro das ruínas, Nilzin aparece ao lado do Guerreiro Sombrio.',
    'O Guerreiro Sombrio permanece imóvel, com a lança negra baixa, como se obedecesse apenas à voz dela.',
    'Quando Denzel se aproxima, o Guerreiro Sombrio avança e coloca-se entre ele e Nilzin.',
    'Nilzin sorri: “Se queres chegar até mim, primeiro passa por ele.”',
  ],
  actors: {
    nilzin: { x: 292, y: 170, scale: 1.18 },
    lurei: {
      formBehind: 'guerreiro',
      formFront: 'guerreiro',
      x: 354,
      behindY: 170,
      frontY: 232,
      scale: 1.18,
    },
    denzel: { x: 132, y: 288, runToX: 202, runToY: 280, scale: 0.58, direction: 'right' },
  },
};
