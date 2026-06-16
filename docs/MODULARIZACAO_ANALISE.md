# Análise de modularização — próximas limpezas

Este ficheiro resume o que ainda estava a ficar repetido no projeto e onde faz sentido separar melhor.

## Já corrigido nesta versão

### Asas do Denzel
As asas das cutscenes deixaram de ter valores próprios.
Agora o jogo usa sempre a configuração principal:

`js/config/denzel-visual-config.js`

Dentro de:

```js
mapWings: {
  front: {...},
  back: {...},
  side: {...},
}
```

Isto significa:

- mapa usa `mapWings`;
- luta usa `mapWings`;
- cutscenes usam `mapWings`;
- já não precisas corrigir Kraidus, Nilzin, rapto e Lurei em sítios diferentes.

## Coisas que ainda fazem sentido modelarizar depois

### 1. Nilzin
Ainda existe desenho direto no `game.js`:

- `drawNilzinShadowAt(...)`
- `drawNilzinBattleSprite(...)`
- bloco `style === 'nilzin'` dentro de `drawCharacter(...)`

Sugestão futura:

`js/config/characters/nilzin.js`

Com formas:

```js
normal
sombra
aura_negra
caida
```

### 2. Kraidus
Ainda existe muito código próprio no `game.js`:

- `drawKraidusBattleSprite(...)`
- `drawKraidusMiniAt(...)`
- `drawKraidusMapSymbol(...)`

Sugestão futura:

`js/config/characters/kraidus.js`

Com formas:

```js
mini
boss
fase2
caido
```

### 3. Efeitos de batalha
Os efeitos ainda estão espalhados:

- luz normal das asas;
- vários raios do ataque 2;
- slash;
- dark hit;
- light beam.

Sugestão futura:

`js/config/effects/battle-effects.js`

Com nomes tipo:

```js
wing_basic_light
wing_staff_rays
staff_light_beam
dark_hit
slash
```

### 4. Portais e rodas sombrias
A roda/portal da Nilzin ainda está em função própria:

- `drawShadowPortalRing(...)`

Sugestão futura:

`js/config/effects/portals.js`

Com configurações:

```js
nilzin_abduction
shadow_cave
kraidus_gate
```

### 5. Indicadores de interação
O `!` e o balão de conversa estão no `game.js`.

Sugestão futura:

`js/config/ui/interaction-indicators.js`

Com:

```js
nearSymbol: '!'
farSymbol: '…'
showDistance: 4
```

### 6. Cutscenes grandes
As cenas já começaram a sair para `js/config/scenes/`, mas ainda há lógica visual no `game.js`.

Sugestão futura:

Criar um pequeno motor genérico:

`js/engine/scene-runner.js`

Para uma cena poder ser escrita quase toda como dados:

```js
actors: []
camera: {}
effects: []
lines: []
autoStartBattle: true
```

## Prioridade recomendada

1. Nilzin modular.
2. Efeitos de batalha modular.
3. Portais/rodas modular.
4. Kraidus modular.
5. Scene runner genérico.

Assim evitamos mexer em 10 sítios sempre que uma coisa visual muda.
