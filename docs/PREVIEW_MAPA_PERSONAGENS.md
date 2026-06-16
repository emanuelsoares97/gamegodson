# Preview mapa personagens

Abre `preview_mapa_personagens.html` para veres os personagens no estilo de mapa, com botões para frente/costas/esquerda/direita e movimento.

O jogo principal ficou baseado no teu v17. Só ajustei ligeiramente as asas do Denzel quando está de costas, no ficheiro:

`js/config/denzel-visual-config.js`

Bloco alterado:

```js
mapWings: {
  back: {
    y: 17,
    scale: 0.56,
    leftX: 11,
    rightX: 21,
    alpha: 0.88,
  }
}
```

Ainda não apliquei o novo visual dos personagens ao jogo inteiro. A ideia é aprovares primeiro no preview.
