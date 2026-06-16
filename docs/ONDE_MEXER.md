# Onde mexer no código

## 1. Asas do Denzel

Ficheiro principal para ajustar:

`js/config/denzel-visual-config.js`

A partir desta versão, as asas das cutscenes usam a mesma configuração das asas do mapa. Ou seja, corriges uma vez aqui e afeta:

- mapa;
- luta;
- cutscenes;
- transformação do Kraidus;
- rapto da Nilzin;
- revelação do Lurei.

### Denzel de frente

```js
front: {
  y: 17,
  scale: 0.54,
  leftX: 14,
  rightX: 18,
  alpha: 0.86,
}
```

### Denzel de costas

```js
back: {
  y: 17,
  scale: 0.56,
  leftX: 11,
  rightX: 18,
  alpha: 0.86,
}
```

### Denzel de lado

```js
side: {
  y: 17,
  scale: 0.48,
  leftX: 13,
  rightX: 18,
  alpha: 0.86,
}
```

- `y` maior = asas mais para baixo
- `y` menor = asas mais para cima
- `scale` maior = asas maiores
- `scale` menor = asas menores
- `leftX` e `rightX` controlam se ficam mais abertas ou mais juntas ao corpo
- `alpha` controla transparência

### Asas atrás ou à frente do corpo

No mesmo ficheiro:

```js
drawOrder: {
  mapWings: 'behind',
}
```

Regra atual no `game.js`:

- de frente/lado: asas atrás;
- de costas: asas à frente, para parecerem nas costas quando o Denzel está virado para cima.

## 2. Denzel na tela de luta

Mesmo ficheiro:

```js
battleHero: {
  translateX: 16,
  translateY: 18,
  scale: 1.35,
}
```

- `translateX` move Denzel para esquerda/direita
- `translateY` move Denzel para cima/baixo
- `scale` aumenta/diminui o Denzel na luta

## 3. Cenas

Ficheiros:

```txt
js/config/scenes/kraidus-transformation-scene.js
js/config/scenes/nilzin-transformation-scene.js
js/config/scenes/lurei-shadow-entrance-scene.js
js/config/scenes/nilzin-abduction-scene.js
js/config/scenes/lurei-reveal-scene.js
js/config/scenes/lurei-purification-scene.js
```

Nesses ficheiros mexes em:

- posições dos personagens;
- formas do Lurei;
- falas;
- portal/roda da Nilzin;
- avanço do Guerreiro Sombrio.

As asas já não são configuradas nesses ficheiros. Usam sempre `js/config/denzel-visual-config.js`.

## 4. Personagens específicos

Guia/configuração:

`js/config/characters-config.js`

Lurei já está separado em:

```txt
js/config/characters/lurei-normal.js
js/config/characters/lurei-guerreiro.js
js/config/characters/lurei-dominio.js
```

Ainda fazem sentido sair do `game.js` futuramente:

- Nilzin;
- Kraidus;
- efeitos de batalha;
- portais;
- indicadores de interação.

## 5. Mundo / mudança de mapas

Ficheiro:

`js/config/world-config.js`

Procura:

```js
autoMapExit: {
  nearY: 2,
  nearX: 2,
  requireDirection: true,
}
```

Se a mudança de mapa estiver difícil demais, aumenta `nearY` e `nearX` para 3.
Se estiver a mudar de mapa sem quereres, diminui para 1.

## 6. História, mapas e inimigos

Ficheiro:

`js/data.js`

Aqui ficam:

- mapas;
- NPCs;
- inimigos;
- missões;
- textos;
- níveis dos bosses.

## 7. Análise de duplicações

Ver também:

`docs/MODULARIZACAO_ANALISE.md`
