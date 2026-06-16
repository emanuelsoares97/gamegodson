# Guia modular — personagens e cenas

Agora o jogo está mais modular para poderes mexer em personagens/cenas sem andar sempre perdido no `game.js`.

## 1. Lurei em formas separadas

Os ficheiros estão em:

```txt
js/config/characters/lurei-normal.js
js/config/characters/lurei-guerreiro.js
js/config/characters/lurei-dominio.js
```

### Formas disponíveis

```js
'normal'        // Lurei normal, antes de ser raptado
'purificado'    // Lurei com roupa dourada depois da cura
'guerreiro'     // Guerreiro Sombrio encapuzado
'dominado'      // Lurei revelado, ainda dominado pela sombra
'caido_sombra'  // Lurei caído no chão antes da purificação
```

Se quiseres trocar o Lurei numa cena, não mexas no desenho. Basta mudares o `form` na cena.

Exemplo:

```js
lurei: { form: 'normal', x: 312, y: 212, scale: 1.05 }
```

Podes trocar para:

```js
lurei: { form: 'guerreiro', x: 312, y: 212, scale: 1.05 }
```

---

## 2. Cenas separadas

As asas das cutscenes usam `denzel-visual-config.js`, igual ao mapa. As cenas controlam posições, falas, formas e efeitos próprios.

As cenas estão em:

```txt
js/config/scenes/kraidus-transformation-scene.js
js/config/scenes/nilzin-transformation-scene.js
js/config/scenes/lurei-shadow-entrance-scene.js
js/config/scenes/nilzin-abduction-scene.js
js/config/scenes/lurei-reveal-scene.js
js/config/scenes/lurei-purification-scene.js
```

### Kraidus — transformação

Ficheiro:

```txt
js/config/scenes/kraidus-transformation-scene.js
```

Neste ficheiro mexes nas posições do Denzel, do cajado e nas falas.

As asas NÃO são configuradas aqui. As cutscenes usam a mesma configuração do mapa:

```txt
js/config/denzel-visual-config.js
```

Dentro de:

```js
mapWings: {
  front: {...},
  back: {...},
  side: {...},
}
```

### Nilzin rapta Lurei

Ficheiro:

```txt
js/config/scenes/nilzin-abduction-scene.js
```

Aqui escolhes se Lurei aparece normal ou sombra:

```js
lurei: { form: 'normal', x: 312, y: 212, scale: 1.05 }
```

O portal/roda também fica aqui:

```js
portal: {
  x: 330,
  y: 210,
  scale: 1.25,
  showFromStep: 1,
  fadeOutOnStep: 3,
}
```

### Guerreiro Sombrio atrás da Nilzin

Ficheiro:

```txt
js/config/scenes/lurei-shadow-entrance-scene.js
```

Aqui controlas se o Lurei aparece atrás/à frente da Nilzin:

```js
lurei: {
  formBehind: 'guerreiro',
  formFront: 'guerreiro',
  x: 320,
  behindY: 170,
  frontY: 232,
  scale: 1.04,
}
```

### Revelação do Lurei

Ficheiro:

```txt
js/config/scenes/lurei-reveal-scene.js
```

Antes da revelação:

```js
beforeReveal: { form: 'guerreiro', x: 398, y: 210, scale: 1.05 }
```

Depois da revelação:

```js
afterReveal: { form: 'dominado', x: 398, y: 210, scale: 1.05 }
```

### Purificação do Lurei

Ficheiro:

```txt
js/config/scenes/lurei-purification-scene.js
```

Aqui defines o antes/depois:

```js
forms: {
  before: 'caido_sombra',
  after: 'purificado',
}
```

---

## 3. Onde o `game.js` ainda entra

O `game.js` ainda desenha as formas base, mas agora lê os ficheiros modulares.

Funções principais:

```js
getSceneConfig(key)
getLureiFormConfig(formKey)
drawLureiFormAt(formKey, x, y, scale)
drawDenzelCinematic(..., sceneKey)
```

Na prática, tenta mexer primeiro nos ficheiros dentro de `js/config/characters` e `js/config/scenes`.
Só mexe no `game.js` se quiseres criar uma forma/desenho completamente novo.


## Análise de duplicações

Ver também: `docs/MODULARIZACAO_ANALISE.md`.
