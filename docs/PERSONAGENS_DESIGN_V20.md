# Personagens — design v20 aplicado

Esta versão usa a base do v17 e aplica o design aprovado no preview do mapa.

## O que foi aplicado

- Denzel continua a seguir a lógica do jogo: antes da coroação mantém roupa normal; depois passa a ter visual de Filho do Dono.
- A marca discreta na cabeça aparece depois da fase de Filho do Dono/Asas.
- As asas continuam a seguir a configuração unificada do mapa em `js/config/denzel-visual-config.js`.
- Lurei normal/purificado usa vestes pretas, sem cajado.
- Lurei guerreiro/dominado usa a lógica das formas modulares já existentes.
- Nilzin mantém cabelo até ao ombro e ganha aura negra nas fases de sombra.
- Divan fica sem cajado.
- Velho Sábio tem pele clara/branca.

## Onde está o novo visual

`js/visuals/character-design-v20.js`

Este ficheiro substitui apenas o desenho dos personagens. A lógica das quests, batalhas, cutscenes, flags e progressão continua no `game.js`.
