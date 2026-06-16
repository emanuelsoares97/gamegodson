# V31 — Correção das falas e aviso de save

## Correções

- Corrigido problema em que algumas falas ficavam vazias porque estavam em formato de texto simples e o motor esperava objetos com `text`.
- O motor de diálogo agora aceita os dois formatos: texto simples ou `{ text: ... }`.
- Converti as falas novas para o formato correto.
- O aviso “Progresso guardado” deixou de aparecer a cada movimento/segundo.
- Agora o aviso aparece apenas em momentos relevantes, como conclusão de missão ou vitória em combate.

## Nota

O jogo continua a guardar automaticamente em vários pontos, mas sem mostrar sempre a mensagem no ecrã.
