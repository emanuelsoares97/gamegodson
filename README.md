# O Filho do Dono — RPG Django v17

Protótipo RPG 2D narrativo em Django + HTML/CSS/JavaScript Canvas.

## Como correr

```powershell
python -m venv .venv
.venv\Scripts\activate
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py seed_denzel_demo
python manage.py runserver
```

Abrir:

```txt
http://127.0.0.1:8000/
```

## Atualizar sem perder save

Para atualizar conteúdo/história:

```powershell
python manage.py migrate
python manage.py seed_denzel_demo
python manage.py runserver
```

Não carregues em `R` a menos que queiras reiniciar o save.

## v17 — principais alterações

- Denzel passa a usar vestes brancas depois da declaração como Filho do Dono.
- Nilzin tem visual próprio: mulher pequena, pele clara e vestido/vestes pretas.
- Mirlon ficou mais forte visualmente: casas diferentes, algumas queimadas/destruídas, demónios espalhados e boss no topo da aldeia.
- Demónios têm níveis visíveis no mapa e no combate.
- Demónio da Praça de Mirlon é nível 7, obrigando a treinar antes.
- Nova zona de farm: Trilho Sombrio de Mirlon. Basta andar pela saída leste de Mirlon para trocar de mapa, sem carregar E.
- Sistema de energia do cajado:
  - Ataque 1: dano básico e recarrega energia.
  - Ataque 2: Luz do Cajado, mais dano, mas custa energia.
- Sistema de derrota: se Denzel cair, não perde o save. Regressa a um ponto seguro, recupera parte do HP e perde parte do ouro.
- Ao derrotar o boss de Mirlon, Denzel liberta um grito e os demónios menores dissipam-se.
- Continuação da história depois de Mirlon preparada para a próxima versão.

## Controlos

- WASD / setas: mover
- E: interagir
- Espaço: avançar diálogo/cutscene
- 1: ataque básico
- 2: Luz do Cajado
- 3: recuperar HP
- 4: usar poção
- R: reiniciar save


## v17 — correções desta versão

- Corrigido bug do diálogo do Demónio Menor em Mirlon que podia ficar preso no ecrã.
- Velho de Vestes Pretas atualizado para pele clara, mantendo vestes pretas.
- Mirlon deixou de ter rio/água no mapa; o rio fica associado à aldeia de Denzel/Aldara.
- Casas de Mirlon redesenhadas para ficarem menos deformadas, com melhor destruição, telhados queimados e fogo controlado.
- Cache atualizada para `?v=17`.


## v19 — Mirlon e continuação
- Corrigido o fluxo de Mirlon: o boss abre combate por proximidade, sem precisar carregar E.
- A saída leste de Mirlon ficou visível e leva ao Trilho Sombrio para upar.
- Casas de Mirlon redesenhadas para ficarem menos deformadas.
- Boss no mapa passou a usar o mesmo visual sombrio do painel de batalha.
- Adicionada continuação da história na estrada para Elranor.


## v20 — Correção Trilho Sombrio

- Corrigida a transição Mirlon ⇄ Trilho Sombrio para não devolver o jogador imediatamente para trás.
- A entrada do trilho agora coloca Denzel alguns tiles para dentro da zona de treino.
- Foram abertas passagens nas bordas do mapa, sem árvores a bloquear a entrada/saída.
- A saída leste de Mirlon e a saída oeste do trilho ficam mais claras visualmente.
- Mantém save antigo: não carregar em R se quiser continuar.

## v22 — Trilho Sombrio noturno + aproximação a Elranor

- O Trilho Sombrio de Mirlon ganhou ambiente mais escuro, como se fosse de noite.
- Adicionada névoa mais pesada, pequenas luzes/estrelas e vinheta em torno do jogador.
- Save antigo continua compatível: se estavas no fim da v19/v20, o jogo avança para a nova missão.
- Continuação da história na estrada para Elranor:
  - primeira visão das muralhas de Elranor;
  - sentinelas de Elranor de nível 8;
  - selo negro à porta de Elranor;
  - preparação para a próxima versão, onde a entrada na cidade pode abrir.
- A missão das Sentinelas exige derrotar 2 inimigos antes de avançar para o selo negro.

Para atualizar sem perder progresso:

```powershell
python manage.py migrate
python manage.py seed_denzel_demo
python manage.py runserver
```

Depois faz `CTRL + F5` no browser. Não carregues em `R` se quiseres manter o save.


## v22
- Inimigos de farm com respawn de 15 segundos.
- Sombras errantes na estrada de Elranor para upar antes das sentinelas.
- Continuação da história com a primeira rachadura no selo negro de Elranor.
