// Índice de personagens modular.
// Este ficheiro é só guia. As formas específicas do Lurei estão em js/config/characters/.

window.CHARACTER_VISUAL_CONFIG = {
  denzel: {
    file: 'js/config/denzel-visual-config.js',
    notes: 'Asas, posição na luta e transformação geral do Denzel.',
  },
  lurei: {
    forms: {
      normal: 'js/config/characters/lurei-normal.js',
      purificado: 'js/config/characters/lurei-normal.js',
      guerreiro: 'js/config/characters/lurei-guerreiro.js',
      dominado: 'js/config/characters/lurei-dominio.js',
      caido_sombra: 'js/config/characters/lurei-dominio.js',
    },
    notes: 'Para encaixar o Lurei nas cenas, muda o form dentro dos ficheiros em js/config/scenes/.',
  },
  nilzin: {
    gameJsFunction: 'drawNilzinShadowAt',
    mapSpriteArea: "drawCharacter -> if (style === 'nilzin')",
    notes: 'Nilzin ainda é desenhada no game.js, mas as cenas onde aparece estão em js/config/scenes/.',
  },
  kraidus: {
    sceneFile: 'js/config/scenes/kraidus-transformation-scene.js',
    gameJsFunction: 'drawKraidusBattleSprite / drawKraidusMiniAt',
    notes: 'A cutscene do Kraidus já tem configuração própria para asas/posição.',
  },
};
