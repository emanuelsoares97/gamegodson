// Configuração visual do Denzel.
// Este ficheiro foi criado para poderes ajustar as asas sem mexer no game.js.
// Dica rápida:
// - y maior = asa mais para baixo
// - y menor = asa mais para cima
// - scale maior = asa maior
// - leftX/rightX controlam abertura lateral
// - drawOrder.mapWings: 'behind' fica atrás do corpo | 'front' fica à frente do corpo
// - as cutscenes usam estes mesmos valores de mapWings, não há uma configuração separada

window.DENZEL_VISUAL_CONFIG = {
  drawOrder: {
    mapWings: 'behind',
  },

  mapWings: {
    front: {
      y: 17,
      scale: 0.54,
      leftX: 14,
      rightX: 18,
      alpha: 0.86,
    },
    back: {
      // Denzel de costas para o ecrã.
      // Como o corpo está virado para trás, estas asas são desenhadas à frente do corpo.
      // leftX/rightX mais abertos para não parecerem tortas.
      y: 17,
      scale: 0.56,
      leftX: 11,
      rightX: 21,
      alpha: 0.88,
    },
    side: {
      y: 17,
      scale: 0.48,
      leftX: 13,
      rightX: 18,
      alpha: 0.86,
    },
  },

  battleHero: {
    // Posição do Denzel na tela de luta.
    translateX: 16,
    translateY: 18,
    scale: 1.35,
  },
};
