from django.core.management.base import BaseCommand
from game.models import Chapter, Character, Cutscene, Dialogue, MapArea, NPCPlacement, Quest


class Command(BaseCommand):
    help = 'Cria a demo inicial de Denzel 1 — O Filho do Dono.'

    def handle(self, *args, **options):
        self.stdout.write('A criar dados da demo...')

        chapter, _ = Chapter.objects.update_or_create(
            key='capitulo-1-o-despertar',
            defaults={
                'title': 'O Despertar',
                'order': 1,
                'summary': 'Denzel vive em Aldara até ao ataque que muda o seu destino e o leva ao encontro do Velho Sábio.',
                'is_active': True,
            },
        )

        characters = {
            'denzel': {
                'name': 'Denzel',
                'kind': Character.Kind.PLAYER,
                'role': 'Protagonista; o Filho do Dono.',
                'description': 'Jovem de Aldara que descobre um chamado espiritual depois do ataque à aldeia.',
                'portrait': 'game/assets/cover.jpg',
                'sprite_key': 'hero',
                'color_primary': '#2563eb',
                'color_secondary': '#dbeafe',
                'skin_color': '#6b3f2a',
                'hair_color': '#111827',
            },
            'maria': {
                'name': 'Maria',
                'kind': Character.Kind.SUPPORT,
                'role': 'Mãe de Denzel; revela o sonho das duas chamas.',
                'description': 'Figura protetora que pressente o destino dos filhos.',
                'portrait': '',
                'sprite_key': 'mother',
                'color_primary': '#be185d',
                'color_secondary': '#f9a8d4',
                'skin_color': '#6b3f2a',
                'hair_color': '#111827',
            },
            'lurei': {
                'name': 'Lurei',
                'kind': Character.Kind.NPC,
                'role': 'Irmão de Denzel; raptado durante o ataque.',
                'description': 'Criança ligada ao mistério das duas chamas.',
                'portrait': '',
                'sprite_key': 'child',
                'color_primary': '#16a34a',
                'color_secondary': '#bbf7d0',
                'skin_color': '#6b3f2a',
                'hair_color': '#111827',
            },
            'pai': {
                'name': 'Pai de Denzel',
                'kind': Character.Kind.SUPPORT,
                'role': 'Pai de Denzel; ferido durante o ataque a Aldara.',
                'description': 'Entrega a Denzel a urgência da fuga e a dor do rapto de Lurei.',
                'portrait': '',
                'sprite_key': 'father',
                'color_primary': '#92400e',
                'color_secondary': '#fed7aa',
                'skin_color': '#5a3324',
                'hair_color': '#111827',
            },
            'velho-sabio': {
                'name': 'Velho Sábio',
                'kind': Character.Kind.SUPPORT,
                'role': 'Mentor espiritual de Denzel.',
                'description': 'Reconhece o despertar da luz em Denzel e conduz o início do treino.',
                'portrait': 'game/assets/cajado.jpg',
                'sprite_key': 'sage',
                'color_primary': '#78350f',
                'color_secondary': '#facc15',
                'skin_color': '#7c4a32',
                'hair_color': '#e5e7eb',
            },
            'aldeao': {
                'name': 'Aldeão',
                'kind': Character.Kind.NPC,
                'role': 'Habitante de Aldara.',
                'description': 'Ajuda a dar vida à aldeia no início da história.',
                'portrait': '',
                'sprite_key': 'villager',
                'color_primary': '#0f766e',
                'color_secondary': '#99f6e4',
                'skin_color': '#7c4a32',
                'hair_color': '#1e293b',
            },
            'estranho-preto': {
                'name': 'Velho de Vestes Pretas',
                'kind': Character.Kind.VILLAIN,
                'role': 'Figura misteriosa que aparece durante o treino de Denzel.',
                'description': 'Presença silenciosa e pesada que observa Denzel na floresta, deixando no ar a sensação de uma ameaça maior.',
                'portrait': '',
                'sprite_key': 'dark_sage',
                'color_primary': '#111827',
                'color_secondary': '#7f1d1d',
                'skin_color': '#f1d0b5',
                'hair_color': '#e5e7eb',
            },
            'guardia-lia': {
                'name': 'Lia',
                'kind': Character.Kind.SUPPORT,
                'role': 'Guardiã da Clareira e apoio ao treino.',
                'description': 'Ajuda Denzel a preparar-se para continuar a jornada, vendendo poções e recuperando HP.',
                'portrait': '',
                'sprite_key': 'healer',
                'color_primary': '#7c3aed',
                'color_secondary': '#fde68a',
                'skin_color': '#7c4a32',
                'hair_color': '#111827',
            },
            'nilzin': {
                'name': 'Nilzin',
                'kind': Character.Kind.SUPPORT,
                'role': 'Sobrevivente encontrada por Denzel depois do treino.',
                'description': 'Mulher fraca e à beira da morte, curada por Denzel quando ele regressa a Aldara.',
                'portrait': '',
                'sprite_key': 'nilzin',
                'color_primary': '#050505',
                'color_secondary': '#111827',
                'skin_color': '#f1d0b5',
                'hair_color': '#111827',
            },
        }

        created_characters = {}
        for key, data in characters.items():
            obj, _ = Character.objects.update_or_create(key=key, defaults=data)
            created_characters[key] = obj

        quest_data = [
            ('talk_maria', 'Caminha com Maria até ao Rio Lúmen', 'Fala com Maria junto ao rio.', 1),
            ('return_home', 'Regressa a Aldara', 'Volta ao centro da aldeia depois dos gritos.', 2),
            ('find_father', 'Procura a tua família', 'Entra na casa destruída de Denzel.', 3),
            ('escape_forest', 'Foge para a floresta', 'Sai pela passagem norte e procura ajuda.', 4),
            ('accept_call', 'Aceita o chamado', 'Fala com o Velho Sábio e aceita receber o Cajado Sagrado.', 5),
            ('training_intro', 'Chega à Floresta de Treino', 'Fala com o Velho Sábio na clareira.', 6),
            ('first_training', 'Primeiro treino com o cajado', 'Interage com o Cristal de Treino para ganhar XP.', 7),
            ('first_combat', 'Primeiro combate de treino', 'Derrota a Sombra de Treino usando ataque, luz do cajado e recuperação.', 8),
            ('forest_hunt', 'Treino livre na floresta', 'Derrota 3 criaturas de treino para ganhar XP, ouro e itens.', 9),
            ('prepare_journey', 'Prepara a próxima travessia', 'Usa o ouro para comprar poções, recupera HP e atravessa a passagem norte quando estiveres no nível 3.', 10),
            ('enter_shadow_valley', 'Primeira prova fora da clareira', 'Segue o Velho Sábio até ao Vale das Sombras.', 11),
            ('physical_training', 'Treino físico e mental', 'Derrota 3 demónios menores no vale para fortalecer corpo e mente.', 12),
            ('figure_in_black', 'A figura de vestes pretas', 'Aproxima-te da presença estranha entre as árvores.', 13),
            ('return_to_sage', 'Recuar para a clareira', 'Fala com o Velho Sábio sobre a figura que apareceu no vale.', 14),
            ('demo_done', 'Regresso à clareira', 'Fala com o Velho Sábio e prepara o segundo ano de treino.', 15),
            ('staff_mastery_intro', 'Domínio do Cajado', 'Fala com o Velho Sábio para iniciar o treino de precisão do cajado.', 16),
            ('staff_precision_trial', 'Prova de precisão', 'Destrói 3 alvos de luz sem desperdiçar energia.', 17),
            ('vision_of_ruin', 'Visão de destruição', 'Toca na Pedra da Visão e enfrenta o medo de desistir.', 18),
            ('staff_mastery_done', 'Determinação renovada', 'Fala com o Velho Sábio depois da visão.', 19),
            ('spiritual_training_intro', 'A Força Espiritual', 'Fala com o Velho Sábio para iniciar o terceiro ano de treino.', 20),
            ('prayer_trial', 'Treino espiritual', 'Toca nos três altares de oração espalhados pela clareira.', 21),
            ('declared_son_owner', 'Filho do Dono', 'Fala com o Velho Sábio para receber a declaração da tua missão.', 22),
            ('return_aldara_trained', 'Regresso a Aldara', 'Usa a passagem sul da clareira para regressar à tua aldeia.', 23),
            ('find_nilzin', 'Uma sobrevivente nas ruínas', 'Procura a sobrevivente caída entre as ruínas de Aldara.', 24),
            ('heal_nilzin', 'A primeira cura real', 'Usa a luz do cajado para curar Nilzin.', 25),
            ('mirlon_road', 'Rumo a Mirlon', 'Segue a estrada norte em direção à aldeia de Mirlon.', 26),
            ('v14_done', 'Fim da versão anterior', 'A versão nova vai continuar automaticamente para Mirlon.', 27),
            ('enter_mirlon', 'Chegada a Mirlon', 'Entra na praça de Mirlon e observa o que aconteceu à aldeia.', 28),
            ('mirlon_prepare', 'Mirlon sob ameaça', 'O demónio principal está no topo da aldeia. Treina no trilho a leste até estares preparado para o nível 7.', 29),
            ('public_battle_mirlon', 'A primeira batalha pública', 'Derrota o Demónio da Praça no topo de Mirlon.', 30),
            ('mirlon_after_battle', 'O povo viu a luz', 'Fala com os habitantes depois da batalha.', 31),
            ('road_after_mirlon', 'A estrada depois de Mirlon', 'Segue pela saída norte de Mirlon para continuar a história.', 32),
            ('road_to_elranor', 'Estrada para Elranor', 'Segue pela saída norte de Mirlon e entra na estrada que leva ao próximo território.', 33),
            ('survivor_camp', 'O acampamento dos sobreviventes', 'Aproxima-te da fogueira e ouve o que os sobreviventes têm para dizer.', 34),
            ('v18_done', 'Fim da versão anterior', 'A versão nova vai continuar automaticamente para a estrada de Elranor.', 35),
            ('elranor_warning', 'Sinais de Elranor', 'Segue pela estrada e escuta o aviso dos sobreviventes sobre Elranor.', 36),
            ('v19_done', 'Fim da versão anterior', 'A versão nova vai continuar automaticamente para a aproximação a Elranor.', 37),
            ('approach_elranor', 'Aproximação a Elranor', 'Segue pela estrada escura até veres os primeiros sinais das muralhas de Elranor.', 38),
            ('outer_elranor_watch', 'Sentinelas da escuridão', 'Derrota as 2 sentinelas. Se estiver difícil, derrota as sombras errantes da estrada para upar; elas reaparecem depois de 15 segundos.', 39),
            ('elranor_gate_warning', 'À porta de Elranor', 'Aproxima-te do selo negro e sente o peso da próxima batalha.', 40),
            ('break_elranor_seal', 'Preparar a quebra do selo', 'Ganha força nas sombras da estrada e aproxima-te do selo negro quando estiveres pronto.', 41),
            ('v22_done', 'Fim da versão atual', 'A próxima versão vai abrir a entrada em Elranor.', 42),
        ]

        quests = {}
        for key, title, objective, order in quest_data:
            quest, _ = Quest.objects.update_or_create(
                key=key,
                defaults={
                    'chapter': chapter,
                    'title': title,
                    'objective': objective,
                    'order': order,
                    'completion_flag': f'{key}_done',
                },
            )
            quests[key] = quest

        for index, (key, *_rest) in enumerate(quest_data):
            next_quest = quests[quest_data[index + 1][0]] if index < len(quest_data) - 1 else None
            quests[key].next_quest = next_quest
            quests[key].save(update_fields=['next_quest'])

        aldara_tiles = [
            [1,1,1,1,1,1,1,1,2,2,2,2,1,1,1,1,1,1,1,1],
            [1,0,0,5,0,0,0,0,2,2,2,2,0,0,5,0,0,3,3,1],
            [1,0,0,0,0,0,0,0,2,2,2,2,0,0,0,0,0,3,3,1],
            [1,0,0,0,0,4,0,0,2,2,2,2,0,0,4,0,0,3,3,1],
            [1,0,0,0,0,4,0,0,2,2,2,2,0,0,4,0,0,3,3,1],
            [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,6,6,3,1],
            [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,6,6,3,1],
            [1,0,0,5,0,4,0,0,2,2,2,2,0,0,4,0,0,3,3,1],
            [1,0,0,0,0,4,0,0,2,2,2,2,0,0,4,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,2,2,2,2,0,0,0,0,0,0,0,1],
            [1,0,0,5,0,0,0,0,2,2,2,2,0,0,0,5,0,0,0,1],
            [1,0,0,0,0,7,0,0,2,2,2,2,0,0,0,0,0,0,0,1],
            [1,0,0,1,1,1,0,0,2,2,2,2,0,1,1,1,0,0,0,1],
            [1,0,0,0,0,0,0,0,2,2,2,2,0,0,0,0,0,5,0,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        ]

        aldara_map_data = {
            'tiles': aldara_tiles,
            'houses': [
                {'key': 'casa_denzel', 'name': 'Casa de Denzel', 'x': 2, 'y': 2, 'w': 3, 'h': 3, 'doorX': 3, 'doorY': 4, 'roof': '#b94a48', 'wall': '#f6d6a7'},
                {'key': 'arquivo', 'name': 'Arquivo da Aldeia', 'x': 12, 'y': 2, 'w': 3, 'h': 3, 'doorX': 13, 'doorY': 4, 'roof': '#7c5cc4', 'wall': '#eadbc8'},
                {'key': 'loja', 'name': 'Loja de Aldara', 'x': 2, 'y': 9, 'w': 3, 'h': 3, 'doorX': 3, 'doorY': 11, 'roof': '#d97706', 'wall': '#f3c98b'},
                {'key': 'casa_lago', 'name': 'Casa do Lago', 'x': 12, 'y': 9, 'w': 3, 'h': 3, 'doorX': 13, 'doorY': 11, 'roof': '#2563eb', 'wall': '#cde5ff'},
            ],
            'objects': [
                {'key': 'fonte', 'type': 'fountain', 'name': 'Fonte de Aldara', 'x': 10, 'y': 5, 'solid': True, 'text': 'A fonte está calma. Antes do ataque, este era o centro da aldeia.'},
                {'key': 'placa_rio', 'type': 'sign', 'name': 'Placa', 'x': 6, 'y': 4, 'solid': True, 'text': 'Rio Lúmen →'},
                {'key': 'placa_floresta', 'type': 'sign', 'name': 'Placa', 'x': 12, 'y': 1, 'solid': True, 'text': 'Passagem para a floresta. Só atravessar em segurança.'},
                {'key': 'ruinas_casa_denzel', 'type': 'home_ruins', 'name': 'Casa destruída', 'x': 3, 'y': 4, 'solid': False, 'text': ''},
                {'key': 'nilzin_survivor', 'type': 'nilzin_survivor', 'questKey': 'find_nilzin', 'name': 'Sobrevivente', 'x': 13, 'y': 8, 'solid': True, 'text': ''},
                {'key': 'nilzin_survivor_heal', 'type': 'nilzin_heal', 'questKey': 'heal_nilzin', 'name': 'Nilzin', 'x': 13, 'y': 8, 'solid': True, 'text': ''},
                {'key': 'mirlon_gate', 'type': 'mirlon_gate', 'questKey': 'mirlon_road', 'name': 'Estrada para Mirlon', 'x': 10, 'y': 1, 'solid': True, 'text': ''},
            ],
        }

        aldara, _ = MapArea.objects.update_or_create(
            key='aldara',
            defaults={
                'chapter': chapter,
                'name': 'Aldeia de Aldara',
                'description': 'A aldeia inicial de Denzel, onde a vida simples é interrompida pelo ataque demoníaco.',
                'width': 20,
                'height': 15,
                'tile_size': 32,
                'start_x': 8,
                'start_y': 8,
                'map_data': aldara_map_data,
            },
        )

        forest_tiles = [
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            [1,0,0,0,5,0,0,0,2,2,2,2,0,0,0,5,0,0,0,1],
            [1,0,1,0,0,0,7,0,2,2,2,2,0,7,0,0,0,1,0,1],
            [1,0,0,0,1,0,0,0,2,2,2,2,0,0,0,1,0,0,0,1],
            [1,0,0,5,0,0,0,0,2,2,2,2,0,0,5,0,0,0,0,1],
            [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,0,1],
            [1,2,2,2,2,0,0,0,0,0,0,0,0,0,0,2,2,2,0,1],
            [1,2,2,2,2,0,0,0,0,0,0,0,0,0,0,2,2,2,0,1],
            [1,0,0,0,2,0,0,5,0,0,0,5,0,0,0,2,0,0,0,1],
            [1,0,0,0,2,0,0,0,0,7,0,0,0,0,0,2,0,0,0,1],
            [1,0,1,0,2,2,2,2,2,2,2,2,2,2,2,2,0,1,0,1],
            [1,0,0,0,0,0,0,0,0,0,5,0,0,0,0,0,0,0,0,1],
            [1,0,0,1,1,1,0,0,0,0,0,0,0,1,1,1,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        ]

        forest_map_data = {
            'tiles': forest_tiles,
            'houses': [],
            'objects': [
                {'key': 'training_crystal', 'type': 'training_crystal', 'name': 'Cristal de Treino', 'x': 11, 'y': 7, 'solid': True, 'text': ''},
                {'key': 'training_shadow', 'type': 'training_shadow', 'name': 'Sombra de Treino', 'x': 13, 'y': 7, 'solid': True, 'text': ''},
                {
                    'key': 'forest_wisp_1', 'type': 'forest_enemy', 'enemyType': 'wisp', 'name': 'Fagulha Sombria',
                    'x': 6, 'y': 8, 'solid': True,
                    'stats': {'level': 1, 'maxHp': 22, 'attack': 5, 'defense': 1, 'xp': 28},
                    'drop': {'goldMin': 2, 'goldMax': 5, 'potionChance': 25},
                },
                {
                    'key': 'forest_imp_1', 'type': 'forest_enemy', 'enemyType': 'imp', 'name': 'Diabrete Menor',
                    'x': 14, 'y': 8, 'solid': True,
                    'stats': {'level': 2, 'maxHp': 30, 'attack': 7, 'defense': 2, 'xp': 38},
                    'drop': {'goldMin': 4, 'goldMax': 8, 'potionChance': 35},
                },
                {
                    'key': 'forest_wisp_2', 'type': 'forest_enemy', 'enemyType': 'wisp', 'name': 'Fagulha Sombria',
                    'x': 11, 'y': 10, 'solid': True,
                    'stats': {'level': 1, 'maxHp': 24, 'attack': 6, 'defense': 1, 'xp': 32},
                    'drop': {'goldMin': 2, 'goldMax': 6, 'potionChance': 30},
                },
                {'key': 'campfire', 'type': 'campfire', 'name': 'Fogueira do Treino', 'x': 8, 'y': 7, 'solid': True, 'text': 'A fogueira aquece a clareira. O treino começa aqui.'},
                {'key': 'training_sign', 'type': 'sign', 'name': 'Placa', 'x': 9, 'y': 9, 'solid': True, 'text': 'Clareira de Treino. Aprende a controlar a luz antes de enfrentar as trevas.'},
                {'key': 'healer_shop', 'type': 'healer_shop', 'name': 'Lia, Guardiã da Clareira', 'x': 6, 'y': 6, 'solid': True, 'text': 'Lia organiza pequenas poções e ervas junto à clareira.'},
                {'key': 'north_gate', 'type': 'north_gate', 'name': 'Passagem Norte', 'x': 10, 'y': 1, 'solid': True, 'text': 'A passagem continua para a próxima região, mas só deve ser atravessada depois do treino.'},
                {
                    'key': 'light_target_1', 'type': 'light_target', 'enemyType': 'light_target', 'questKey': 'staff_precision_trial', 'name': 'Alvo de Luz',
                    'x': 5, 'y': 8, 'solid': True,
                    'stats': {'level': 3, 'maxHp': 38, 'attack': 8, 'defense': 2, 'xp': 42},
                    'drop': {'goldMin': 4, 'goldMax': 8, 'potionChance': 20, 'lightShardChance': 35},
                },
                {
                    'key': 'light_target_2', 'type': 'light_target', 'enemyType': 'light_target', 'questKey': 'staff_precision_trial', 'name': 'Alvo de Luz',
                    'x': 14, 'y': 6, 'solid': True,
                    'stats': {'level': 3, 'maxHp': 40, 'attack': 9, 'defense': 2, 'xp': 45},
                    'drop': {'goldMin': 5, 'goldMax': 9, 'potionChance': 20, 'lightShardChance': 35},
                },
                {
                    'key': 'light_target_3', 'type': 'light_target', 'enemyType': 'light_target', 'questKey': 'staff_precision_trial', 'name': 'Alvo de Luz Instável',
                    'x': 11, 'y': 10, 'solid': True,
                    'stats': {'level': 4, 'maxHp': 48, 'attack': 10, 'defense': 3, 'xp': 55},
                    'drop': {'goldMin': 6, 'goldMax': 10, 'potionChance': 25, 'lightShardChance': 45},
                },
                {'key': 'prayer_altar_1', 'type': 'prayer_altar', 'questKey': 'prayer_trial', 'name': 'Altar de Oração', 'x': 4, 'y': 4, 'solid': True, 'text': ''},
                {'key': 'prayer_altar_2', 'type': 'prayer_altar', 'questKey': 'prayer_trial', 'name': 'Altar de Oração', 'x': 16, 'y': 4, 'solid': True, 'text': ''},
                {'key': 'prayer_altar_3', 'type': 'prayer_altar', 'questKey': 'prayer_trial', 'name': 'Altar de Oração', 'x': 10, 'y': 12, 'solid': True, 'text': ''},
                {'key': 'return_aldara_gate', 'type': 'return_aldara_gate', 'questKey': 'return_aldara_trained', 'name': 'Passagem para Aldara', 'x': 9, 'y': 13, 'solid': True, 'text': ''},
                {'key': 'vision_stone', 'type': 'vision_stone', 'name': 'Pedra da Visão', 'x': 16, 'y': 11, 'solid': True, 'text': ''},
            ],
        }

        forest, _ = MapArea.objects.update_or_create(
            key='floresta_treino',
            defaults={
                'chapter': chapter,
                'name': 'Floresta de Treino',
                'description': 'Clareira isolada onde o Velho Sábio começa a treinar Denzel.',
                'width': 20,
                'height': 15,
                'tile_size': 32,
                'start_x': 9,
                'start_y': 11,
                'map_data': forest_map_data,
            },
        )

        shadow_tiles = [
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            [1,0,0,0,7,0,0,0,2,2,2,2,0,0,7,0,0,0,0,1],
            [1,0,1,0,0,0,8,0,2,2,2,2,0,8,0,0,0,1,0,1],
            [1,0,0,0,1,0,0,0,2,2,2,2,0,0,0,1,0,0,0,1],
            [1,0,0,5,0,0,0,0,2,2,2,2,0,0,5,0,0,0,0,1],
            [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,0,1],
            [1,2,2,2,2,0,0,0,0,7,0,0,0,0,0,2,2,2,0,1],
            [1,2,2,2,2,0,0,5,0,0,0,5,0,0,0,2,2,2,0,1],
            [1,0,0,0,2,0,0,0,0,8,0,0,0,0,0,2,0,0,0,1],
            [1,0,0,0,2,0,0,0,0,7,0,0,0,0,0,2,0,0,0,1],
            [1,0,1,0,2,2,2,2,2,2,2,2,2,2,2,2,0,1,0,1],
            [1,0,0,0,0,0,0,0,0,0,5,0,0,0,0,0,0,0,0,1],
            [1,0,0,1,1,1,0,0,0,0,0,0,0,1,1,1,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        ]

        shadow_map_data = {
            'theme': 'dark',
            'tiles': shadow_tiles,
            'houses': [],
            'objects': [
                {'key': 'vale_sign', 'type': 'sign', 'name': 'Placa partida', 'x': 9, 'y': 12, 'solid': True, 'text': 'Vale das Sombras. Aqui começa o treino fora da protecção da clareira.'},
                {'key': 'shadow_campfire', 'type': 'campfire', 'name': 'Brasa fria', 'x': 11, 'y': 11, 'solid': True, 'text': 'A chama quase não aquece, mas ainda devolve algum fôlego a Denzel.'},
                {
                    'key': 'shadow_imp_1', 'type': 'forest_enemy', 'enemyType': 'imp', 'questKey': 'physical_training', 'name': 'Demónio Menor',
                    'x': 7, 'y': 7, 'solid': True,
                    'stats': {'level': 2, 'maxHp': 34, 'attack': 8, 'defense': 2, 'xp': 46},
                    'drop': {'goldMin': 5, 'goldMax': 9, 'potionChance': 25, 'lightShardChance': 15},
                },
                {
                    'key': 'shadow_imp_2', 'type': 'forest_enemy', 'enemyType': 'brute', 'questKey': 'physical_training', 'name': 'Demónio Guerreiro',
                    'x': 13, 'y': 7, 'solid': True,
                    'stats': {'level': 3, 'maxHp': 36, 'attack': 9, 'defense': 2, 'xp': 50},
                    'drop': {'goldMin': 5, 'goldMax': 10, 'potionChance': 30, 'lightShardChance': 20},
                },
                {
                    'key': 'shadow_wisp_1', 'type': 'forest_enemy', 'enemyType': 'wisp', 'questKey': 'physical_training', 'name': 'Sombra Errante',
                    'x': 10, 'y': 9, 'solid': True,
                    'stats': {'level': 2, 'maxHp': 30, 'attack': 8, 'defense': 1, 'xp': 42},
                    'drop': {'goldMin': 4, 'goldMax': 8, 'potionChance': 25, 'lightShardChance': 15},
                },
            ],
        }

        shadow_valley, _ = MapArea.objects.update_or_create(
            key='vale_sombras',
            defaults={
                'chapter': chapter,
                'name': 'Vale das Sombras',
                'description': 'Área sombria onde o Velho Sábio testa o corpo e a mente de Denzel contra ameaças reais.',
                'width': 20,
                'height': 15,
                'tile_size': 32,
                'start_x': 10,
                'start_y': 12,
                'map_data': shadow_map_data,
            },
        )

        mirlon_tiles = [
            [1,1,1,1,1,1,1,1,2,2,2,2,1,1,1,1,1,1,1,1],
            [1,0,0,5,0,0,0,0,2,2,2,2,0,0,5,0,0,0,0,1],
            [1,0,0,0,0,8,0,0,2,2,2,2,0,0,0,8,0,0,0,1],
            [1,0,0,0,0,0,0,0,2,2,2,2,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,2,2,2,2,0,0,0,0,0,0,0,1],
            [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
            [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
            [1,0,0,8,0,4,0,0,2,2,2,2,0,0,4,0,8,0,2,2],
            [1,0,0,0,0,4,0,0,2,2,2,2,0,0,4,0,0,0,2,2],
            [1,0,0,0,0,0,0,0,2,2,2,2,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,2,2,2,2,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,7,0,0,2,2,2,2,0,0,0,0,0,7,0,1],
            [1,0,0,1,1,1,0,0,2,2,2,2,0,1,1,1,0,0,0,1],
            [1,0,0,0,0,0,0,0,2,2,2,2,0,0,0,0,0,5,0,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        ]

        mirlon_map_data = {
            'theme': 'mirlon_burning',
            'tiles': mirlon_tiles,
            'houses': [
                {'key': 'mirlon_casa_1', 'name': 'Casa queimada de Mirlon', 'x': 2, 'y': 2, 'w': 3, 'h': 3, 'doorX': 3, 'doorY': 4, 'roof': '#5f1f14', 'wall': '#a16207', 'burning': True},
                {'key': 'mirlon_casa_2', 'name': 'Casa partida de Mirlon', 'x': 14, 'y': 2, 'w': 3, 'h': 3, 'doorX': 15, 'doorY': 4, 'roof': '#292524', 'wall': '#854d0e', 'ruined': True},
                {'key': 'mirlon_casa_3', 'name': 'Armazém em ruínas', 'x': 2, 'y': 10, 'w': 4, 'h': 3, 'doorX': 4, 'doorY': 12, 'roof': '#1c1917', 'wall': '#78350f', 'burning': True},
                {'key': 'mirlon_casa_4', 'name': 'Casa da praça destruída', 'x': 14, 'y': 10, 'w': 3, 'h': 3, 'doorX': 15, 'doorY': 12, 'roof': '#3b1d12', 'wall': '#6b4424', 'burning': True},
                {'key': 'mirlon_casa_5', 'name': 'Abrigo rachado', 'x': 6, 'y': 2, 'w': 2, 'h': 2, 'doorX': 6, 'doorY': 3, 'roof': '#57534e', 'wall': '#a16207', 'ruined': True},
            ],
            'objects': [
                {'key': 'mirlon_arrival', 'type': 'story_marker', 'autoTrigger': True, 'questKey': 'enter_mirlon', 'name': 'Praça de Mirlon', 'x': 10, 'y': 6, 'solid': False, 'text': 'Denzel chega a Mirlon. A aldeia está ferida, as casas ardem e há demónios espalhados pelas ruas.', 'nextText': 'No topo da aldeia, um demónio muito maior observa tudo. A saída leste leva a um trilho onde Denzel pode upar antes da luta.'},
                {'key': 'mirlon_boss_gate', 'type': 'mirlon_boss_gate', 'autoTrigger': False, 'questKey': 'mirlon_prepare', 'name': 'Demónio da Praça', 'x': 10, 'y': 2, 'solid': False, 'requiredLevel': 7, 'text': ''},
                {'key': 'mirlon_training_exit', 'type': 'map_exit', 'targetMap': 'trilho_mirlon', 'questKey': 'mirlon_prepare', 'name': 'Saída para o Trilho Sombrio', 'x': 18, 'y': 6, 'solid': False, 'text': 'Saída leste: zona de treino para upar antes do demónio principal.'},
                {'key': 'mirlon_street_imp_1', 'type': 'forest_enemy', 'enemyType': 'imp', 'questKey': 'mirlon_prepare', 'name': 'Demónio de Rua', 'x': 7, 'y': 5, 'solid': True, 'stats': {'level': 4, 'maxHp': 52, 'attack': 12, 'defense': 3, 'xp': 80}, 'drop': {'goldMin': 9, 'goldMax': 15, 'potionChance': 35, 'lightShardChance': 30}},
                {'key': 'mirlon_street_imp_2', 'type': 'forest_enemy', 'enemyType': 'imp', 'questKey': 'mirlon_prepare', 'name': 'Demónio de Rua', 'x': 13, 'y': 5, 'solid': True, 'stats': {'level': 5, 'maxHp': 62, 'attack': 14, 'defense': 4, 'xp': 105}, 'drop': {'goldMin': 12, 'goldMax': 18, 'potionChance': 42, 'lightShardChance': 35}},
                {'key': 'mirlon_street_brute', 'type': 'forest_enemy', 'enemyType': 'brute', 'questKey': 'mirlon_prepare', 'name': 'Demónio Forte', 'x': 10, 'y': 8, 'solid': True, 'stats': {'level': 6, 'maxHp': 84, 'attack': 16, 'defense': 5, 'xp': 145}, 'drop': {'goldMin': 15, 'goldMax': 24, 'potionChance': 50, 'lightShardChance': 50}},
                {'key': 'mirlon_minor_1', 'type': 'mirlon_minor_demon', 'name': 'Demónio Menor', 'x': 7, 'y': 7, 'solid': False, 'phase': 1},
                {'key': 'mirlon_minor_2', 'type': 'mirlon_minor_demon', 'name': 'Demónio Menor', 'x': 13, 'y': 7, 'solid': False, 'phase': 2},
                {
                    'key': 'mirlon_public_demon', 'type': 'forest_enemy', 'enemyType': 'boss', 'questKey': 'public_battle_mirlon', 'name': 'Demónio da Praça',
                    'x': 10, 'y': 2, 'solid': True,
                    'stats': {'level': 7, 'maxHp': 118, 'attack': 18, 'defense': 6, 'xp': 180},
                    'drop': {'goldMin': 24, 'goldMax': 40, 'potionChance': 60, 'lightShardChance': 85},
                },
                {'key': 'mirlon_people', 'type': 'story_marker', 'autoTrigger': True, 'questKey': 'mirlon_after_battle', 'name': 'Habitantes de Mirlon', 'x': 8, 'y': 7, 'solid': False, 'text': 'Os habitantes saem lentamente dos esconderijos. Alguns choram, outros apenas olham para o cajado.', 'nextText': 'Um velho sussurra: “Então é verdade... o Filho do Dono voltou.”'},
                {'key': 'mirlon_exit', 'type': 'story_marker', 'autoTrigger': True, 'questKey': 'road_after_mirlon', 'name': 'Saída de Mirlon', 'x': 10, 'y': 1, 'solid': False, 'text': 'Mirlon fica para trás, ainda ferida, mas agora com esperança.', 'nextText': 'Denzel segue pela estrada. O nome Filho do Dono começa a espalhar-se entre os sobreviventes.'},
            ],
        }

        mirlon, _ = MapArea.objects.update_or_create(
            key='mirlon',
            defaults={
                'chapter': chapter,
                'name': 'Aldeia de Mirlon',
                'description': 'Primeira aldeia onde Denzel enfrenta os demónios perante o povo.',
                'width': 20,
                'height': 15,
                'tile_size': 32,
                'start_x': 10,
                'start_y': 12,
                'map_data': mirlon_map_data,
            },
        )


        trail_tiles = [
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            [1,0,0,0,0,5,0,0,2,2,2,2,0,0,5,0,0,0,0,1],
            [1,0,1,0,0,0,7,0,2,2,2,2,0,7,0,0,0,1,0,1],
            [1,0,0,0,1,0,0,0,2,2,2,2,0,0,0,1,0,0,0,1],
            [1,0,0,5,0,0,0,0,2,2,2,2,0,0,5,0,0,0,0,1],
            [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
            [2,2,2,2,2,0,0,0,0,8,0,0,0,0,0,2,2,2,2,1],
            [2,2,2,2,2,0,0,5,0,0,0,5,0,0,0,2,2,2,2,1],
            [2,0,0,0,2,0,0,0,0,8,0,0,0,0,0,2,0,0,2,1],
            [2,0,0,0,2,0,0,0,0,7,0,0,0,0,0,2,0,0,2,1],
            [1,0,1,0,2,2,2,2,2,2,2,2,2,2,2,2,0,1,0,1],
            [1,0,0,0,0,0,0,0,0,0,5,0,0,0,0,0,0,0,0,1],
            [1,0,0,1,1,1,0,0,0,0,0,0,0,1,1,1,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        ]

        trail_map_data = {
            'theme': 'dark',
            'tiles': trail_tiles,
            'houses': [],
            'objects': [
                {'key': 'trail_return', 'type': 'sign', 'name': 'Placa', 'x': 2, 'y': 7, 'solid': True, 'text': '← Mirlon. Zona de treino para ganhar níveis antes do demónio principal.'},
                {'key': 'trail_campfire', 'type': 'campfire', 'name': 'Fogueira fraca', 'x': 4, 'y': 9, 'solid': True, 'text': 'Uma pequena fogueira usada por viajantes.'},
                {'key': 'trail_imp_1', 'type': 'forest_enemy', 'enemyType': 'imp', 'questKey': 'mirlon_prepare', 'name': 'Demónio Errante', 'x': 8, 'y': 6, 'solid': True, 'stats': {'level': 4, 'maxHp': 54, 'attack': 12, 'defense': 4, 'xp': 85}, 'respawnSeconds': 15, 'noQuestProgress': True, 'drop': {'goldMin': 10, 'goldMax': 16, 'potionChance': 40, 'lightShardChance': 35}},
                {'key': 'trail_imp_2', 'type': 'forest_enemy', 'enemyType': 'imp', 'questKey': 'mirlon_prepare', 'name': 'Demónio Errante', 'x': 13, 'y': 7, 'solid': True, 'stats': {'level': 5, 'maxHp': 64, 'attack': 14, 'defense': 4, 'xp': 105}, 'respawnSeconds': 15, 'noQuestProgress': True, 'drop': {'goldMin': 12, 'goldMax': 18, 'potionChance': 45, 'lightShardChance': 40}},
                {'key': 'trail_brute_1', 'type': 'forest_enemy', 'enemyType': 'brute', 'questKey': 'mirlon_prepare', 'name': 'Demónio Pesado', 'x': 10, 'y': 10, 'solid': True, 'stats': {'level': 6, 'maxHp': 82, 'attack': 16, 'defense': 5, 'xp': 135}, 'respawnSeconds': 15, 'noQuestProgress': True, 'drop': {'goldMin': 14, 'goldMax': 22, 'potionChance': 50, 'lightShardChance': 50}},
                {'key': 'trail_wisp_1', 'type': 'forest_enemy', 'enemyType': 'wisp', 'questKey': 'mirlon_prepare', 'name': 'Sombra da Estrada', 'x': 15, 'y': 5, 'solid': True, 'stats': {'level': 4, 'maxHp': 48, 'attack': 12, 'defense': 3, 'xp': 78}, 'respawnSeconds': 15, 'noQuestProgress': True, 'drop': {'goldMin': 8, 'goldMax': 14, 'potionChance': 35, 'lightShardChance': 30}},
                {'key': 'trail_brute_2', 'type': 'forest_enemy', 'enemyType': 'brute', 'questKey': 'mirlon_prepare', 'name': 'Guarda Sombrio', 'x': 16, 'y': 10, 'solid': True, 'stats': {'level': 6, 'maxHp': 88, 'attack': 17, 'defense': 5, 'xp': 145}, 'respawnSeconds': 15, 'noQuestProgress': True, 'drop': {'goldMin': 16, 'goldMax': 24, 'potionChance': 55, 'lightShardChance': 55}},
            ],
        }

        trilho_mirlon, _ = MapArea.objects.update_or_create(
            key='trilho_mirlon',
            defaults={
                'chapter': chapter,
                'name': 'Trilho Sombrio de Mirlon',
                'description': 'Zona de treino fora de Mirlon, criada para ganhar XP antes da batalha pública.',
                'width': 20,
                'height': 15,
                'tile_size': 32,
                'start_x': 4,
                'start_y': 7,
                'map_data': trail_map_data,
            },
        )


        estrada_tiles = [
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            [1,0,0,5,0,0,0,0,2,2,2,2,0,0,0,5,0,0,0,1],
            [1,0,1,0,0,7,0,0,2,2,2,2,0,0,7,0,0,1,0,1],
            [1,0,0,0,0,0,0,0,2,2,2,2,0,0,0,0,0,0,0,1],
            [1,0,0,5,0,0,1,0,2,2,2,2,0,1,0,0,5,0,0,1],
            [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,0,1],
            [1,2,2,2,2,0,0,0,0,8,0,0,0,0,0,2,2,2,0,1],
            [1,2,2,2,2,0,0,5,0,0,0,5,0,0,0,2,2,2,0,1],
            [1,0,0,0,2,0,0,0,0,8,0,0,0,0,0,2,0,0,0,1],
            [1,0,0,0,2,0,0,0,0,7,0,0,0,0,0,2,0,0,0,1],
            [1,0,1,0,2,2,2,2,2,2,2,2,2,2,2,2,0,1,0,1],
            [1,0,0,0,0,0,0,0,0,0,5,0,0,0,0,0,0,0,0,1],
            [1,0,0,1,1,1,0,0,0,0,0,0,0,1,1,1,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        ]

        estrada_map_data = {
            'theme': 'dark',
            'tiles': estrada_tiles,
            'houses': [],
            'objects': [
                {'key': 'estrada_intro', 'type': 'story_marker', 'autoTrigger': True, 'questKey': 'road_to_elranor', 'name': 'Estrada queimada', 'x': 10, 'y': 5, 'solid': False, 'text': 'A estrada depois de Mirlon está marcada por cinzas. O nome de Denzel começa a correr mais depressa do que os seus próprios passos.', 'nextText': 'Ao longe, pequenas luzes tremem junto a uma fogueira. Há sobreviventes escondidos no caminho para Elranor.'},
                {'key': 'campfire_survivors', 'type': 'story_marker', 'autoTrigger': True, 'questKey': 'survivor_camp', 'name': 'Acampamento dos sobreviventes', 'x': 10, 'y': 8, 'solid': False, 'text': 'Os sobreviventes recuam quando veem o cajado. Depois, reconhecem a luz que libertou Mirlon.', 'nextText': 'Um deles aponta para norte: “Se vais continuar, prepara-te. As aldeias à frente já sabem que o Filho do Dono apareceu.”'},
                {'key': 'elranor_warning_marker', 'type': 'story_marker', 'autoTrigger': True, 'questKey': 'elranor_warning', 'name': 'Aviso na estrada', 'x': 14, 'y': 6, 'solid': False, 'text': 'A estrada fica mais fria. As árvores deixam de fazer ruído, como se a própria terra prendesse a respiração.', 'nextText': 'Um símbolo negro aparece gravado numa pedra: Elranor está sob domínio direto da escuridão. Denzel aperta o cajado e segue em frente.'},
                {'key': 'approach_elranor_marker', 'type': 'story_marker', 'autoTrigger': True, 'questKey': 'approach_elranor', 'name': 'Primeira visão de Elranor', 'x': 11, 'y': 4, 'solid': False, 'text': 'Depois de horas de caminhada, Denzel vê no horizonte as torres partidas de Elranor.', 'nextText': 'As muralhas parecem respirar escuridão. Não é apenas uma cidade destruída: é uma cidade dominada.'},
                {'key': 'outer_watch_marker', 'type': 'story_marker', 'autoTrigger': True, 'noAdvance': True, 'questKey': 'outer_elranor_watch', 'name': 'Sentinelas da escuridão', 'x': 13, 'y': 5, 'solid': False, 'text': 'Dois demónios patrulham a estrada exterior. Se ainda não conseguires vencê-los, procura as sombras errantes da estrada e ganha nível.', 'nextText': 'As sombras menores reaparecem pouco depois de caírem. É aqui que Denzel pode upar antes de tocar no selo negro.'},
                {'key': 'gate_warning_marker', 'type': 'story_marker', 'autoTrigger': True, 'questKey': 'elranor_gate_warning', 'name': 'Selo negro', 'x': 10, 'y': 2, 'solid': False, 'text': 'À frente, um selo negro bloqueia a entrada. A luz do cajado toca no símbolo e recua por um instante.', 'nextText': 'Denzel percebe que Elranor não vai abrir só com força. Vai precisar de mais nível, mais controlo e talvez aliados.'},
                {'key': 'break_seal_marker', 'type': 'story_marker', 'autoTrigger': True, 'questKey': 'break_elranor_seal', 'name': 'Selo negro rachado', 'x': 10, 'y': 2, 'solid': False, 'text': 'Denzel ergue o cajado. A luz branca e dourada bate contra o selo e uma primeira rachadura aparece.', 'nextText': 'Do outro lado, Elranor responde com um rugido profundo. A entrada não abriu totalmente, mas agora a escuridão sabe que ele chegou.'},
                {'key': 'road_wisp_1', 'type': 'forest_enemy', 'enemyType': 'wisp', 'questKey': 'survivor_camp', 'name': 'Sombra Faminta', 'x': 7, 'y': 6, 'solid': True, 'stats': {'level': 6, 'maxHp': 76, 'attack': 16, 'defense': 4, 'xp': 125}, 'respawnSeconds': 15, 'noQuestProgress': True, 'drop': {'goldMin': 12, 'goldMax': 20, 'potionChance': 35, 'lightShardChance': 45}},
                {'key': 'road_imp_1', 'type': 'forest_enemy', 'enemyType': 'imp', 'questKey': 'survivor_camp', 'name': 'Demónio Perdido', 'x': 14, 'y': 7, 'solid': True, 'stats': {'level': 7, 'maxHp': 92, 'attack': 18, 'defense': 5, 'xp': 160}, 'respawnSeconds': 15, 'noQuestProgress': True, 'drop': {'goldMin': 15, 'goldMax': 25, 'potionChance': 45, 'lightShardChance': 50}},
                {'key': 'elranor_farm_wisp_1', 'type': 'forest_enemy', 'enemyType': 'wisp', 'questKey': 'elranor_farm', 'name': 'Sombra Errante', 'x': 5, 'y': 8, 'solid': True, 'stats': {'level': 6, 'maxHp': 82, 'attack': 17, 'defense': 4, 'xp': 145}, 'respawnSeconds': 15, 'noQuestProgress': True, 'drop': {'goldMin': 16, 'goldMax': 26, 'potionChance': 45, 'lightShardChance': 55}},
                {'key': 'elranor_farm_imp_1', 'type': 'forest_enemy', 'enemyType': 'imp', 'questKey': 'elranor_farm', 'name': 'Demónio de Patrulha', 'x': 12, 'y': 10, 'solid': True, 'stats': {'level': 7, 'maxHp': 98, 'attack': 19, 'defense': 5, 'xp': 175}, 'respawnSeconds': 15, 'noQuestProgress': True, 'drop': {'goldMin': 18, 'goldMax': 30, 'potionChance': 50, 'lightShardChance': 60}},
                {'key': 'elranor_farm_brute_1', 'type': 'forest_enemy', 'enemyType': 'brute', 'questKey': 'elranor_farm', 'name': 'Bruto da Estrada', 'x': 17, 'y': 11, 'solid': True, 'stats': {'level': 7, 'maxHp': 108, 'attack': 20, 'defense': 6, 'xp': 195}, 'respawnSeconds': 15, 'noQuestProgress': True, 'drop': {'goldMin': 20, 'goldMax': 32, 'potionChance': 55, 'lightShardChance': 65}},
                {'key': 'elranor_sentinel_1', 'type': 'forest_enemy', 'enemyType': 'brute', 'questKey': 'outer_elranor_watch', 'name': 'Sentinela de Elranor', 'x': 8, 'y': 6, 'solid': True, 'stats': {'level': 8, 'maxHp': 120, 'attack': 21, 'defense': 7, 'xp': 220}, 'drop': {'goldMin': 22, 'goldMax': 34, 'potionChance': 45, 'lightShardChance': 65}},
                {'key': 'elranor_sentinel_2', 'type': 'forest_enemy', 'enemyType': 'brute', 'questKey': 'outer_elranor_watch', 'name': 'Sentinela de Elranor', 'x': 15, 'y': 8, 'solid': True, 'stats': {'level': 8, 'maxHp': 124, 'attack': 22, 'defense': 7, 'xp': 230}, 'drop': {'goldMin': 24, 'goldMax': 36, 'potionChance': 50, 'lightShardChance': 70}},
            ],
        }

        estrada_elranor, _ = MapArea.objects.update_or_create(
            key='estrada_elranor',
            defaults={
                'chapter': chapter,
                'name': 'Estrada para Elranor',
                'description': 'Caminho sombrio depois de Mirlon, onde os primeiros sobreviventes começam a falar do Filho do Dono.',
                'width': 20,
                'height': 15,
                'tile_size': 32,
                'start_x': 10,
                'start_y': 12,
                'map_data': estrada_map_data,
            },
        )

        placements = [
            (aldara, 'maria', 16, 7, 'left', False, '', 'return_home', {}),
            (aldara, 'lurei', 4, 6, 'down', True, '', 'return_home', {'minX': 1, 'maxX': 6, 'minY': 5, 'maxY': 8}),
            (aldara, 'aldeao', 13, 6, 'left', True, '', '', {'minX': 11, 'maxX': 17, 'minY': 5, 'maxY': 10}),
            (aldara, 'velho-sabio', 10, 1, 'down', False, 'escape_forest', 'training_intro', {}),
            (forest, 'velho-sabio', 10, 6, 'down', False, 'training_intro', '', {}),
            (forest, 'guardia-lia', 6, 6, 'down', False, 'forest_hunt', '', {}),
            (shadow_valley, 'velho-sabio', 10, 12, 'up', False, 'enter_shadow_valley', 'demo_done', {}),
            (shadow_valley, 'estranho-preto', 10, 3, 'down', False, 'figure_in_black', 'return_to_sage', {}),
            (mirlon, 'aldeao', 7, 8, 'right', False, 'mirlon_after_battle', '', {}),
            (mirlon, 'nilzin', 12, 8, 'left', False, 'mirlon_after_battle', '', {}),
        ]

        for map_area, char_key, x, y, direction, wander, visible, hidden, bounds in placements:
            NPCPlacement.objects.update_or_create(
                map_area=map_area,
                character=created_characters[char_key],
                defaults={
                    'x': x,
                    'y': y,
                    'direction': direction,
                    'wander': wander,
                    'visible_from_quest': visible,
                    'hidden_after_quest': hidden,
                    'movement_bounds': bounds,
                },
            )

        Dialogue.objects.all().delete()

        def add_dialogue(character_key, quest_key, lines, advance_last=False):
            for idx, line in enumerate(lines, start=1):
                Dialogue.objects.create(
                    character=created_characters[character_key],
                    quest=quests[quest_key],
                    order=idx,
                    text=line,
                    advances_to_next_quest=advance_last and idx == len(lines),
                )

        add_dialogue('maria', 'talk_maria', [
            'Denzel, antes de regressarmos, preciso contar-te uma coisa.',
            'Sonhei com duas chamas. Uma brilhava com luz pura. A outra ardia na escuridão.',
            'Não sei o que significa, mas senti que esse sonho estava ligado a ti e ao teu irmão.',
            'Ouve... são gritos vindos da aldeia. Temos de voltar já!',
        ], advance_last=True)

        add_dialogue('lurei', 'talk_maria', [
            'Denzel! Depois brincas comigo? A mãe disse para não me afastar da aldeia.',
        ])

        add_dialogue('aldeao', 'talk_maria', [
            'Hoje Aldara está tranquila. Mas o céu tem uma cor estranha, não achas?',
        ])

        add_dialogue('aldeao', 'return_home', [
            'Corre! Vem do centro da aldeia! Há fumo por todo o lado!',
        ])

        add_dialogue('velho-sabio', 'escape_forest', [
            'Denzel... finalmente acordaste para aquilo que sempre esteve dentro de ti.',
            'A tua dor não pode transformar-se em vingança. Precisa tornar-se luz.',
            'Vem comigo. O treino começa agora.',
        ], advance_last=True)

        add_dialogue('velho-sabio', 'accept_call', [
            'O cajado não escolhe força. Escolhe propósito.',
            'Se aceitares este caminho, nunca mais serás apenas um rapaz de Aldara.',
            'Toma-o. A partir de agora, cada passo teu deve proteger a luz que ainda existe neste mundo.',
        ], advance_last=True)

        add_dialogue('velho-sabio', 'training_intro', [
            'Esta clareira vai ensinar-te a controlar a energia que explodiu em Aldara.',
            'Agora tens vida, força, defesa, nível e experiência. Não vais vencer as trevas apenas com coragem.',
            'Aproxima-te do Cristal de Treino e usa o cajado. Precisas ganhar XP antes de enfrentar demónios maiores.',
        ], advance_last=True)

        add_dialogue('velho-sabio', 'first_training', [
            'O cristal responde à luz do cajado. Interage com ele para treinar.',
        ])

        add_dialogue('velho-sabio', 'first_combat', [
            'Muito bem. Agora falta uma coisa: aprender a manter a calma quando algo te ataca.',
            'A Sombra de Treino não é um demónio verdadeiro, mas vai testar a tua luz.',
            'Derrota-a. Ataca, usa a luz do cajado, recupera quando for necessário e usa poções se ficares em perigo.',
        ])

        add_dialogue('velho-sabio', 'forest_hunt', [
            'Agora a clareira vai reagir à tua presença. Criaturas menores vão aparecer à tua volta.',
            'Derrota três delas. Ganha XP, recolhe ouro e aprende a gerir as tuas poções.',
            'Um guerreiro não avança só porque quer. Avança quando está preparado.',
        ])

        add_dialogue('velho-sabio', 'prepare_journey', [
            'Boa. Agora já sabes que coragem sem preparação pode destruir-te.',
            'Fala com a Lia, compra poções se precisares e recupera o teu HP.',
            'Quando estiveres no nível 3, segue pela passagem norte. A próxima prova espera por ti.',
        ])

        add_dialogue('velho-sabio', 'enter_shadow_valley', [
            'A clareira ensinou-te a usar a luz em segurança. O vale vai ensinar-te a usá-la com medo à tua volta.',
            'Não procures vencer depressa. Procura permanecer firme.',
            'Quando estiveres pronto, enfrenta as criaturas que rondam estas árvores.',
        ], advance_last=True)

        add_dialogue('velho-sabio', 'physical_training', [
            'Este treino já não é ilusão. São demónios menores atraídos pela tua luz.',
            'Derrota três criaturas. Aprende a atacar, a recuperar e a escolher quando usar a Luz do Cajado.',
        ])

        add_dialogue('estranho-preto', 'figure_in_black', [
            'Então és tu a chama que acordou depois de trezentos anos...',
            'Ainda és pequeno. Ainda tremes. Mas a escuridão já sabe o teu nome.',
            'Diz ao teu mestre que o silêncio acabou.',
        ], advance_last=True)

        add_dialogue('velho-sabio', 'return_to_sage', [
            'Não agora, Denzel.',
            'Aquela presença não era um inimigo comum. Se avançasses, ele teria visto tudo o que ainda não sabes controlar.',
            'Hoje aprendeste uma coisa mais importante do que atacar: saber recuar.',
            'A partir daqui o treino será mais duro. O teu corpo, a tua mente e a tua fé terão de crescer juntos.',
        ], advance_last=True)

        add_dialogue('velho-sabio', 'demo_done', [
            'A presença de vestes pretas não apareceu por acaso. As sombras já começaram a medir a tua luz.',
            'Mas ainda não estás pronto para perseguir respostas. O primeiro ano deu-te resistência. O segundo vai ensinar-te controlo.',
            'No próximo treino, não vais atacar com raiva. Vais aprender a fazer o cajado obedecer ao teu espírito.',
        ], advance_last=True)

        add_dialogue('velho-sabio', 'staff_mastery_intro', [
            'O Cajado Sagrado não é apenas uma arma. Ele cura, protege e revela o que o coração tenta esconder.',
            'Se o usares apenas para destruir, vais tornar-te previsível. Se o dominares, a luz vai responder com precisão.',
            'Procura os três Alvos de Luz espalhados pela clareira e destrói-os sem perder o foco.',
        ], advance_last=True)

        add_dialogue('velho-sabio', 'staff_precision_trial', [
            'Não persigas os alvos como se fossem demónios. Respira, observa e ataca no momento certo.',
            'Alguns inimigos fracos podem ser vencidos com o Grito do Filho do Dono, se o timing for perfeito.',
        ])

        add_dialogue('velho-sabio', 'vision_of_ruin', [
            'A tua força cresceu, mas a solidão também. Eu vi o teu olhar quando pensaste em desistir.',
            'Toca na Pedra da Visão. Não para sofreres, mas para entenderes o peso de abandonar este caminho.',
        ])

        add_dialogue('velho-sabio', 'staff_mastery_done', [
            'Aquilo que viste não é uma sentença. É um aviso.',
            'Se desistires, Elranor cairá mais fundo. Se continuares, ainda haverá esperança para a tua família e para o teu povo.',
            'Agora estás pronto para deixar a clareira e caminhar em direção às aldeias dominadas pelos demónios.',
        ], advance_last=True)

        add_dialogue('velho-sabio', 'spiritual_training_intro', [
            'No terceiro ano, a tua força já não pode depender apenas do corpo nem do cajado.',
            'A tua maior arma será a tua ligação ao propósito que te trouxe até aqui.',
            'Toca nos três altares da clareira. Não lutes. Escuta, ora e deixa a luz responder.',
        ], advance_last=True)

        add_dialogue('velho-sabio', 'prayer_trial', [
            'Cada altar vai testar uma parte diferente de ti: dor, medo e obediência.',
            'Quando os três responderem, volta a falar comigo.',
        ])

        add_dialogue('velho-sabio', 'declared_son_owner', [
            'Sempre soube que eras digno desse cajado.',
            'A minha missão era encontrar-te e preparar-te. A tua é salvar esta terra.',
            'Hoje declaro diante da luz que te guia: o teu nome será lembrado como o Filho do Dono.',
            'As vestes de Denzel tornam-se brancas, como sinal de que a missão já não é apenas dele.',
        ], advance_last=True)

        add_dialogue('velho-sabio', 'return_aldara_trained', [
            'Chegou a hora de voltares a Aldara.',
            'Não vais encontrar a aldeia como a deixaste. Mas agora tens força para olhar para as ruínas sem fugir.',
            'Usa a passagem sul da clareira. Depois procura qualquer sinal da tua família.',
        ])

        add_dialogue('nilzin', 'find_nilzin', [
            'Água... por favor...',
        ])

        add_dialogue('nilzin', 'heal_nilzin', [
            'Quem... és tu?',
            'Essa luz... esse cajado...',
            'Tu és... o Filho do Dono?',
        ], advance_last=True)

        add_dialogue('velho-sabio', 'mirlon_road', [
            'Mirlon está a resistir como pode. Se os demónios chegaram lá, vais ver o peso real da tua missão.',
            'Leva Nilzin para um lugar seguro quando puderes. Mas primeiro abre caminho.',
        ])

        add_dialogue('nilzin', 'mirlon_after_battle', [
            'Eu vi a luz a crescer no cajado... não era só força, era esperança.',
            'As pessoas de Mirlon vão falar deste dia. Agora já não és apenas o rapaz de Aldara.',
        ], advance_last=True)

        add_dialogue('nilzin', 'road_after_mirlon', [
            'Denzel... depois do que fizeste em Mirlon, outras aldeias vão começar a acreditar outra vez.',
            'Mas isso também significa que as sombras vão prestar mais atenção a ti.',
        ])

        add_dialogue('nilzin', 'approach_elranor', [
            'Elranor era enorme. Antes da escuridão, as pessoas vinham de várias aldeias para negociar aqui.',
            'Se agora está tudo assim... então Kraidus já não está só a atacar aldeias pequenas.',
        ])

        add_dialogue('nilzin', 'elranor_gate_warning', [
            'Esse selo... eu já vi marcas parecidas nas histórias antigas.',
            'Denzel, talvez não seja uma porta para abrir hoje. Talvez seja um aviso de que precisas preparar-te ainda mais.',
        ])

        add_dialogue('aldeao', 'mirlon_after_battle', [
            'Nós pensávamos que ninguém viria.',
            'Quando o demónio caiu, todos vimos. A luz voltou a Mirlon.',
        ])

        add_dialogue('guardia-lia', 'forest_hunt', [
            'Sou Lia. Quando o treino apertar, junta ouro e volta aqui.',
            'Mais tarde vou conseguir vender poções, recuperar HP e preparar-te para zonas mais perigosas.',
        ])

        add_dialogue('guardia-lia', 'prepare_journey', [
            'Antes de atravessares a passagem norte, garante que tens poções e HP suficiente.',
            'O ouro que apanhaste no treino já tem utilidade. Fala comigo e prepara-te.',
        ])

        add_dialogue('maria', 'find_father', [
            'Denzel, a nossa casa... não pode ser...',
        ])

        Cutscene.objects.all().delete()

        Cutscene.objects.create(
            key='abertura-aldara',
            quest=quests['talk_maria'],
            title='Aldeia de Aldara',
            image='game/assets/cover.jpg',
            text='Antes da lenda, Denzel era apenas um jovem de Aldara. Mas uma visão mudaria tudo.',
            order=1,
            show_when_quest_starts=True,
        )
        Cutscene.objects.create(
            key='ataque-aldara',
            quest=quests['return_home'],
            title='Depois do grito',
            image='',
            text='A onda de poder desaparece. Onde estavam os dois demónios menores, restam apenas cinzas e silêncio.',
            order=1,
            show_when_quest_completes=True,
        )
        Cutscene.objects.create(
            key='cajado-sagrado',
            quest=quests['accept_call'],
            title='O Cajado Sagrado',
            image='game/assets/cajado.jpg',
            text='O Velho Sábio entrega o cajado a Denzel. A luz que destruiu os demónios começa agora a ter direção.',
            order=1,
            show_when_quest_completes=True,
        )
        Cutscene.objects.create(
            key='partida-treino',
            quest=quests['accept_call'],
            title='Partida para o treino',
            image='game/assets/partida.jpg',
            text='Denzel deixa Aldara para trás. A sua missão ainda mal começou.',
            order=2,
            show_when_quest_completes=True,
        )
        Cutscene.objects.create(
            key='floresta-treino',
            quest=quests['training_intro'],
            title='Floresta de Treino',
            image='game/assets/treino.jpg',
            text='Longe das cinzas de Aldara, Denzel começa a aprender o que significa lutar com propósito.',
            order=1,
            show_when_quest_starts=True,
        )
        Cutscene.objects.create(
            key='rpg-base',
            quest=quests['first_training'],
            title='Base RPG desbloqueada',
            image='',
            text='A partir daqui, Denzel pode ganhar XP, subir de nível e fortalecer HP, Ataque e Defesa.',
            order=1,
            show_when_quest_starts=True,
        )
        Cutscene.objects.create(
            key='primeiro-combate',
            quest=quests['first_combat'],
            title='Primeiro combate',
            image='',
            text='Uma Sombra de Treino surge na clareira. Este é o primeiro passo para transformar a história num RPG completo.',
            order=1,
            show_when_quest_starts=True,
        )
        Cutscene.objects.create(
            key='treino-livre-rpg',
            quest=quests['forest_hunt'],
            title='Treino livre desbloqueado',
            image='',
            text='A partir daqui, Denzel precisa derrotar criaturas, ganhar XP, juntar ouro e usar poções para sobreviver. O jogo começa a ganhar estrutura de RPG.',
            order=1,
            show_when_quest_starts=True,
        )
        Cutscene.objects.create(
            key='preparar-jornada',
            quest=quests['prepare_journey'],
            title='Preparação desbloqueada',
            image='',
            text='O ouro passa a ter utilidade: compra poções, recupera HP e prepara Denzel antes de atravessar novas zonas.',
            order=1,
            show_when_quest_starts=True,
        )
        Cutscene.objects.create(
            key='vale-sombras',
            quest=quests['enter_shadow_valley'],
            title='Vale das Sombras',
            image='game/assets/caminho_sombrio.jpg',
            text='O Velho Sábio conduz Denzel para fora da clareira. A partir daqui, o treino deixa de ser apenas preparação e começa a tocar no perigo real.',
            order=1,
            show_when_quest_starts=True,
        )
        Cutscene.objects.create(
            key='treino-fisico-mental',
            quest=quests['physical_training'],
            title='Treino físico e mental',
            image='game/assets/treino_sombrio.jpg',
            text='Nas zonas mais escuras da floresta, Denzel aprende que a luz precisa de disciplina. O corpo cansa, a mente hesita, mas o cajado continua a brilhar.',
            order=1,
            show_when_quest_starts=True,
        )
        Cutscene.objects.create(
            key='figura-preta',
            quest=quests['figure_in_black'],
            title='Uma presença inesperada',
            image='',
            text='Quando a última criatura cai, o ar fica pesado. Entre as árvores surge uma figura de vestes pretas, silenciosa, como se já esperasse por Denzel.',
            order=1,
            show_when_quest_starts=True,
        )
        Cutscene.objects.create(
            key='sabio-recua',
            quest=quests['return_to_sage'],
            title='Não agora',
            image='game/assets/caminho_sombrio.jpg',
            text='O Velho Sábio agarra o braço de Denzel e afasta-o rapidamente. A figura de preto desaparece nas sombras, deixando para trás uma ameaça que ainda não pode ser enfrentada.',
            order=1,
            show_when_quest_starts=True,
        )
        Cutscene.objects.create(
            key='proxima-fase',
            quest=quests['demo_done'],
            title='Segundo ano de treino',
            image='game/assets/treino_sombrio.jpg',
            text='Denzel completou a primeira prova fora da clareira. A partir daqui, o treino deixa de ser apenas resistência e passa a exigir controlo do Cajado Sagrado.',
            order=1,
            show_when_quest_starts=True,
        )
        Cutscene.objects.create(
            key='dominio-cajado',
            quest=quests['staff_mastery_intro'],
            title='Domínio do Cajado',
            image='game/assets/treino.jpg',
            text='No segundo ano, Denzel aprende que as chamas do cajado não servem apenas para destruir. A luz também pode curar, proteger e revelar.',
            order=1,
            show_when_quest_starts=True,
        )
        Cutscene.objects.create(
            key='visao-elranor',
            quest=quests['vision_of_ruin'],
            title='Se desistires agora...',
            image='game/assets/visao_elranor.jpg',
            text='A visão mostra Elranor em ruínas, pessoas subjugadas por Kraidus e demónios a dominar a terra. O horror devolve a Denzel a determinação que a solidão quase roubara.',
            order=1,
            show_when_quest_starts=True,
        )
        Cutscene.objects.create(
            key='caminho-aldeias',
            quest=quests['staff_mastery_done'],
            title='Rumo às aldeias dominadas',
            image='game/assets/partida.jpg',
            text='Com o corpo, a mente e o cajado mais firmes, Denzel prepara-se para deixar a floresta e procurar sinais da sua família.',
            order=1,
            show_when_quest_starts=True,
        )

        Cutscene.objects.create(
            key='forca-espiritual',
            quest=quests['spiritual_training_intro'],
            title='A Força Espiritual',
            image='game/assets/treino.jpg',
            text='No terceiro ano, Denzel aprende que a maior arma não está apenas no braço, mas no propósito que guia a luz.',
            order=1,
            show_when_quest_starts=True,
        )
        Cutscene.objects.create(
            key='filho-do-dono-declaracao',
            quest=quests['declared_son_owner'],
            title='Filho do Dono',
            image='game/assets/cajado.jpg',
            text='O Velho Sábio declara que Denzel está pronto. O jovem deixa de ser apenas um sobrevivente de Aldara e assume o peso da missão.',
            order=1,
            show_when_quest_completes=True,
        )
        Cutscene.objects.create(
            key='regresso-aldara-treino',
            quest=quests['return_aldara_trained'],
            title='Regresso a Aldara',
            image='game/assets/partida.jpg',
            text='Três anos depois, Denzel volta às ruínas da aldeia onde tudo começou.',
            order=1,
            show_when_quest_completes=True,
        )
        Cutscene.objects.create(
            key='nilzin-encontrada',
            quest=quests['heal_nilzin'],
            title='A primeira cura real',
            image='game/assets/cajado.jpg',
            text='A luz do cajado deixa de ser apenas ataque. Pela primeira vez, Denzel cura alguém que estava à beira da morte.',
            order=1,
            show_when_quest_completes=True,
        )
        Cutscene.objects.create(
            key='mirlon-preparacao-nivel',
            quest=quests['mirlon_prepare'],
            title='Treinar antes da batalha',
            image='',
            text='O demónio principal de Mirlon é muito mais forte. Denzel precisa ganhar níveis no trilho antes de o enfrentar.',
            order=1,
            show_when_quest_starts=True,
        )

        Cutscene.objects.create(
            key='mirlon-primeira-batalha',
            quest=quests['mirlon_after_battle'],
            title='A primeira batalha pública',
            image='game/assets/cajado.jpg',
            text='Depois de Mirlon, o nome do Filho do Dono começa a correr entre aldeias dominadas pelo medo.',
            order=1,
            show_when_quest_completes=True,
        )

        Cutscene.objects.create(
            key='estrada-apos-mirlon',
            quest=quests['road_after_mirlon'],
            title='A luz começa a espalhar-se',
            image='game/assets/partida.jpg',
            text='Depois de Mirlon, Denzel percebe que cada aldeia salva também revela a sua existência aos inimigos maiores.',
            order=1,
            show_when_quest_starts=True,
        )

        Cutscene.objects.create(
            key='aproximacao-elranor',
            quest=quests['approach_elranor'],
            title='As muralhas de Elranor',
            image='game/assets/visao_elranor.jpg',
            text='Pela primeira vez, Denzel vê a dimensão real da guerra. Elranor não é apenas uma aldeia. É uma cidade ferida pela escuridão.',
            order=1,
            show_when_quest_starts=True,
        )
        Cutscene.objects.create(
            key='sentinelas-elranor',
            quest=quests['outer_elranor_watch'],
            title='Sentinelas da escuridão',
            image='',
            text='Os demónios à entrada de Elranor têm disciplina. Já não são apenas criaturas perdidas: são guardas de um domínio maior.',
            order=1,
            show_when_quest_starts=True,
        )
        Cutscene.objects.create(
            key='selo-negro-elranor',
            quest=quests['elranor_gate_warning'],
            title='O selo negro',
            image='game/assets/caminho_sombrio.jpg',
            text='A luz do cajado encontra resistência pela primeira vez. Para entrar em Elranor, Denzel terá de crescer ainda mais.',
            order=1,
            show_when_quest_starts=True,
        )
        Cutscene.objects.create(
            key='primeira-rachadura-selo',
            quest=quests['break_elranor_seal'],
            title='A primeira rachadura',
            image='game/assets/visao_elranor.jpg',
            text='O selo negro não cai por completo, mas a luz de Denzel deixa uma marca nele. A guerra por Elranor está prestes a começar.',
            order=1,
            show_when_quest_completes=True,
        )

        self.stdout.write(self.style.SUCCESS('Demo criada com sucesso.'))
        self.stdout.write('Agora corre: python manage.py runserver')
