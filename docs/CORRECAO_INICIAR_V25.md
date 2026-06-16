# Correção V25 — Botão Iniciar

O botão Iniciar deixou de depender do áudio para entrar no jogo.

Antes, em alguns browsers, o desbloqueio do áudio podia ficar pendurado e o menu não fechava.
Agora o menu fecha primeiro e o som tenta arrancar logo a seguir.

Alterado em:

- `js/title-menu.js`
- `js/audio-engine.js`
