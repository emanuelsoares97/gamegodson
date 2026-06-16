# O Filho do Dono — Adaptação de Denzel 1 para jogo

## Veredito

Denzel 1 funciona bem como base de jogo RPG 2D narrativo. O melhor formato é um jogo estilo Pokémon/Game Boy: exploração por mapas, NPCs, diálogos, missões curtas e cutscenes com imagens grandes nos momentos importantes.

A história tem uma estrutura forte para jogo porque começa com vida simples, passa para revelação espiritual, ataque à aldeia, perda familiar, despertar de poder, encontro com mentor, treino, retorno, batalha, capital, castelo e boss final.

## Observação importante sobre o ficheiro

A versão original `Denzel 1 O Filho do Dono.docx` é a melhor base narrativa. Está mais completa e com tom mais cinematográfico.

A versão em `talvez seja pt` é mais resumida e pode servir como referência, mas precisa de revisão linguística porque mistura expressões como “você”, “te”, “tu é” e alguns erros. Para o jogo, recomendo usar a versão original e depois fazer uma revisão final em português de Portugal.

Também encontrei uma repetição parcial no Capítulo 1 original: a introdução de Aldara/Denzel e a cena até ao encontro com o Velho Sábio aparecem duplicadas. Antes de fechar o roteiro definitivo, essa duplicação deve ser removida.

## Estrutura ideal do jogo

### Título
O Filho do Dono

### Género
RPG 2D narrativo, aventura, fantasia espiritual.

### Câmara
Top-down, estilo Pokémon/Game Boy.

### Loop principal
Explorar mapa → falar com NPCs → cumprir missão → desbloquear cena → avançar capítulo.

### Tom
Épico, espiritual, emocional e heroico.

## Como adaptar as imagens existentes

As imagens que tens devem ser usadas como:

- capa/menu inicial;
- cutscenes de capítulo;
- imagens grandes durante diálogos importantes;
- momentos de transição;
- galeria desbloqueável.

Para o mapa, o ideal é criar sprites pequenos em pixel art. As imagens grandes não devem ser usadas diretamente como personagem no mapa, porque são muito detalhadas e não encaixam bem no movimento tile-based.

## Demo recomendada — Capítulo 1: O Despertar

### Mapa principal
Aldeia de Aldara, com:

- casa de Denzel;
- zona central da aldeia;
- caminho para o Rio Lúmen;
- saída para a floresta;
- casas de aldeões;
- área que muda visualmente depois do ataque.

### Personagem jogável
Denzel jovem.

### NPCs principais
Maria, Lurei, Pai de Denzel, aldeões, Velho Sábio.

### Missão 1 — Caminha com Maria até ao Rio Lúmen
Objetivo: falar com Maria junto ao rio.

Função narrativa: apresentar a ligação familiar, o sonho das duas chamas e o mistério da chama escura.

### Missão 2 — Regressa à aldeia
Objetivo: voltar à aldeia depois dos gritos.

Função narrativa: transformar a aldeia calma numa aldeia atacada. Aqui o jogo pode mudar tiles normais para fogo, ruínas e fumo.

### Missão 3 — Procura a tua família
Objetivo: entrar na casa destruída.

Função narrativa: Denzel encontra o pai, descobre que Lurei foi levado e desperta o primeiro poder.

### Missão 4 — Foge para a floresta
Objetivo: sair pela passagem norte com Maria.

Função narrativa: mudar do espaço seguro para o desconhecido.

### Missão 5 — Encontra o Velho Sábio
Objetivo: falar com o Velho Sábio.

Função narrativa: revelar que Denzel é o escolhido e fechar a demo com a partida para o treino.

## Divisão do livro completo em jogo

### Capítulo de jogo 1 — Aldara
Vida simples, sonho de Maria, ataque, rapto de Lurei, primeiro despertar e encontro com o Velho Sábio.

### Capítulo de jogo 2 — Floresta de Treino
Treino físico e mental, primeiros combates contra demónios menores, figura misteriosa de trajes pretos.

### Capítulo de jogo 3 — O Cajado Divino
Aprendizagem do cajado, ataques de fogo, cura e controlo espiritual.

### Capítulo de jogo 4 — A Prova Espiritual
Oração, jejum, visão de destruição e aceitação plena do título Filho do Dono.

### Capítulo de jogo 5 — Retorno a Aldara
Aldeia destruída, encontro com Nilzin, cura, informação sobre família e partida para Mirlon.

### Capítulo de jogo 6 — Mirlon e Dravon
Primeira batalha pública, aldeões reconhecem Denzel, defesa de sobreviventes.

### Capítulo de jogo 7 — Caminho para Zaridon
Travessia, hordas de demónios e aproximação à capital.

### Capítulo de jogo 8 — Zaridon
Libertação da capital, combate em massa e entrada no castelo.

### Capítulo de jogo 9 — Kraidus
Boss final em fases: resistência, perda do cajado, quase derrota, recuperação do cajado e golpe final.

### Epílogo jogável
Libertação da família, reconhecimento público, reconstrução de Elranor e preparação para Denzel 2.

## Backend Django — quando fizer sentido

Para a demo, o jogo pode funcionar só com HTML, CSS e JavaScript.

Para uma versão mais séria, Django faz sentido para gerir:

- personagens;
- capítulos;
- missões;
- falas;
- cutscenes;
- mapas;
- progresso do jogador;
- painel admin para editar conteúdo.

### Models recomendados

- `Character`
- `Chapter`
- `Scene`
- `Quest`
- `Dialogue`
- `MapArea`
- `Cutscene`
- `PlayerSave`

## Próximo passo técnico

Depois desta adaptação, o próximo passo é criar a estrutura Django com uma app `game`, models de história e uma primeira página Canvas que consome os dados do backend.

Para já, incluí também um ficheiro `story_seed.json` com a primeira estrutura de personagens, mapas e missões.
