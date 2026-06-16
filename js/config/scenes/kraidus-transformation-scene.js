// CENA: Transformação contra Kraidus
// Este ficheiro controla posições, falas e cajado desta cutscene.
// As asas usam a configuração geral do Denzel: js/config/denzel-visual-config.js.
window.GAME_SCENES = window.GAME_SCENES || {};

window.GAME_SCENES.kraidusTransformation = {
  title: 'Transformação — Asas de Luz',
  lines: [
    'Kraidus domina o combate. Denzel cai de joelhos, já sem forças para acompanhar o poder do Rei Demoníaco.',
    'Com um golpe brutal, Kraidus separa Denzel do Cajado Sagrado e fere-lhe o braço.',
    'O cajado cai longe. Denzel sente o corpo falhar, como se a luz tivesse sido arrancada dele.',
    'Kraidus avança para esmagar Denzel diante dos demónios que cercam o salão.',
    'Denzel arrasta-se até ao cajado. Uma luz desce sobre ele e começa a regenerar o braço ferido.',
    'Asas de luz pura abrem-se nas suas costas. Denzel desperta no nível 18 e regressa ao combate com vida e energia restauradas.',
  ],
  denzelPositions: {
    down: { x: 278, y: 236, scale: 0.42, direction: 'down' },
    crawling: { x: 238, y: 256, scale: 0.42, direction: 'down' },
    reachingStaff: { x: 292, y: 242, scale: 0.42, direction: 'down' },
    transformed: { x: 282, y: 224, scale: 0.42, direction: 'down' },
  },
  staffPositions: {
    first: { x: 332, y: 290, scale: 0.62 },
    far: { x: 350, y: 290, scale: 0.62 },
    glowing: { x: 350, y: 288, scale: 0.62 },
  },
};
