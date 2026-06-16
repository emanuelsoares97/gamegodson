// CENA: Revelação do Guerreiro Sombrio como Lurei
window.GAME_SCENES = window.GAME_SCENES || {};

window.GAME_SCENES.lureiReveal = {
  title: 'Revelação — O Guerreiro Sombrio é Lurei',
  lines: [
    'O Guerreiro Sombrio recua. A energia roxa à volta dele cresce como fogo vivo.',
    'Ele invoca uma lança negra. O golpe rasga o ar e passa a centímetros do rosto de Denzel.',
    'O capuz cai. Denzel vê o rosto do irmão: Lurei está diante dele, preso à escuridão.',
    'Denzel hesita. Lurei aproveita a abertura e acerta-lhe no peito com a lança negra.',
    'Denzel mantém as Asas de Luz abertas. Ele não vai matar o irmão. Vai salvá-lo.',
  ],
  actors: {
    beforeReveal: { form: 'guerreiro', x: 398, y: 210, scale: 1.10 },
    afterReveal: { form: 'dominado', x: 398, y: 210, scale: 1.10 },
    denzel: { x: 118, y: 300, scale: 0.96, direction: 'right' },
  },
};
