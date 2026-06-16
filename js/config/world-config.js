// Configuração do mundo/mapas.
// Aqui mexes na sensibilidade das passagens automáticas entre mapas.

window.WORLD_CONFIG = {
  autoMapExit: {
    // Distância permitida em relação à seta/saída marcada no mapa.
    exactOrAdjacent: true,

    // Regras de borda. Mantém isto mais restrito para evitar bugs após o salto de 5 anos.
    nearY: 2,
    nearX: 2,
    rightEdgeOffset: 2,
    leftEdgeMax: 1,
    topEdgeMax: 1,
    bottomEdgeOffset: 2,
    requireDirection: true,
  },
};
