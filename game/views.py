import json
from django.contrib.staticfiles.storage import staticfiles_storage
from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.http import require_http_methods

from .models import Chapter, Character, Dialogue, MapArea, NPCPlacement, PlayerSave, Quest


def game_page(request):
    return render(request, 'game/index.html')


def ensure_session(request):
    if not request.session.session_key:
        request.session.create()
    return request.session.session_key


def asset_url(path):
    if not path:
        return ''
    return staticfiles_storage.url(path)


def quest_payload(quest):
    return {
        'key': quest.key,
        'title': quest.title,
        'objective': quest.objective,
        'order': quest.order,
        'nextQuestKey': quest.next_quest.key if quest.next_quest else None,
        'completionFlag': quest.completion_flag,
        'cutscenes': [
            {
                'key': c.key,
                'title': c.title,
                'image': asset_url(c.image),
                'text': c.text,
                'order': c.order,
                'showWhenQuestStarts': c.show_when_quest_starts,
                'showWhenQuestCompletes': c.show_when_quest_completes,
            }
            for c in quest.cutscenes.all()
        ],
    }


def character_payload(character):
    return {
        'key': character.key,
        'name': character.name,
        'kind': character.kind,
        'role': character.role,
        'description': character.description,
        'portrait': asset_url(character.portrait),
        'spriteKey': character.sprite_key,
        'colorPrimary': character.color_primary,
        'colorSecondary': character.color_secondary,
        'skinColor': character.skin_color,
        'hairColor': character.hair_color,
    }


def map_payload(map_area):
    placements = []
    for p in map_area.npc_placements.select_related('character'):
        placements.append({
            'characterKey': p.character.key,
            'x': p.x,
            'y': p.y,
            'direction': p.direction,
            'wander': p.wander,
            'visibleFromQuest': p.visible_from_quest,
            'hiddenAfterQuest': p.hidden_after_quest,
            'movementBounds': p.movement_bounds,
        })

    return {
        'key': map_area.key,
        'name': map_area.name,
        'description': map_area.description,
        'chapterKey': map_area.chapter.key,
        'width': map_area.width,
        'height': map_area.height,
        'tileSize': map_area.tile_size,
        'startX': map_area.start_x,
        'startY': map_area.start_y,
        'mapData': map_area.map_data,
        'npcs': placements,
    }


def build_dialogue_payload():
    payload = {}
    dialogues = Dialogue.objects.select_related('character', 'quest').order_by('quest__order', 'character__key', 'order')
    for dialogue in dialogues:
        character_key = dialogue.character.key
        quest_key = dialogue.quest.key
        payload.setdefault(character_key, {}).setdefault(quest_key, []).append({
            'text': dialogue.text,
            'order': dialogue.order,
            'advancesToNextQuest': dialogue.advances_to_next_quest,
            'triggerKey': dialogue.trigger_key,
        })
    return payload




def repair_save_progress(save, chapter, first_map, first_quest):
    """Mantém saves antigos compatíveis quando o seed adiciona missões novas.

    Exemplo: se o jogador terminou a última missão da versão anterior e agora
    existe uma continuação, o save avança automaticamente para a primeira missão
    ainda não concluída. Isto evita ter de carregar em R/recomeçar tudo.
    """
    changed = False
    flags = save.flags or {}

    if not save.current_chapter:
        save.current_chapter = chapter
        changed = True

    if not save.current_quest:
        save.current_quest = first_quest
        changed = True

    if not save.current_map:
        save.current_map = first_map
        changed = True

    guard = 0
    while save.current_quest and (
        flags.get(f'quest_{save.current_quest.key}_done')
        or save.current_quest.key in {'v14_done', 'v15_done'}
        or save.current_quest.title.lower().startswith('fim da versão')
    ) and guard < 80:
        next_quest = save.current_quest.next_quest
        if not next_quest:
            next_quest = Quest.objects.filter(
                chapter=chapter,
                order__gt=save.current_quest.order,
            ).order_by('order').first()

        if not next_quest:
            break

        save.current_quest = next_quest
        save.current_chapter = next_quest.chapter
        changed = True
        guard += 1

    if changed:
        save.save()

    return save

def get_or_create_save(request, first_chapter, first_map, first_quest):
    session_key = ensure_session(request)
    save, _ = PlayerSave.objects.get_or_create(
        session_key=session_key,
        defaults={
            'current_chapter': first_chapter,
            'current_map': first_map,
            'current_quest': first_quest,
            'player_x': first_map.start_x if first_map else 8,
            'player_y': first_map.start_y if first_map else 8,
            'flags': {},
        },
    )
    return save


@require_http_methods(['GET'])
def bootstrap_api(request):
    chapter = Chapter.objects.filter(is_active=True).order_by('order').first()
    if not chapter:
        return JsonResponse({'error': 'Sem capítulos. Corre: python manage.py seed_denzel_demo'}, status=404)

    maps = list(MapArea.objects.filter(chapter=chapter).order_by('name'))
    quests = list(Quest.objects.filter(chapter=chapter).order_by('order'))

    if not maps or not quests:
        return JsonResponse({'error': 'Sem mapa ou missão. Corre: python manage.py seed_denzel_demo'}, status=404)

    first_map = maps[0]
    first_quest = quests[0]
    save = get_or_create_save(request, chapter, first_map, first_quest)
    save = repair_save_progress(save, chapter, first_map, first_quest)

    data = {
        'game': {
            'title': 'O Filho do Dono',
            'subtitle': 'Denzel 1 — RPG em Django — v22 Respawn e preparação de Elranor',
        },
        'save': {
            'currentChapterKey': save.current_chapter.key if save.current_chapter else chapter.key,
            'currentMapKey': save.current_map.key if save.current_map else first_map.key,
            'currentQuestKey': save.current_quest.key if save.current_quest else first_quest.key,
            'playerX': save.player_x,
            'playerY': save.player_y,
            'stats': {
                'level': save.level,
                'xp': save.xp,
                'xpToNext': save.xp_to_next,
                'hp': save.hp,
                'maxHp': save.max_hp,
                'attack': save.attack,
                'defense': save.defense,
            },
            'gold': save.gold,
            'inventory': save.inventory or {},
            'flags': save.flags or {},
        },
        'chapters': [{
            'key': chapter.key,
            'title': chapter.title,
            'summary': chapter.summary,
            'order': chapter.order,
        }],
        'characters': {c.key: character_payload(c) for c in Character.objects.all()},
        'maps': {m.key: map_payload(m) for m in maps},
        'quests': {q.key: quest_payload(q) for q in quests},
        'dialogues': build_dialogue_payload(),
    }
    return JsonResponse(data)


@require_http_methods(['POST'])
def save_api(request):
    chapter = Chapter.objects.filter(is_active=True).order_by('order').first()
    first_map = MapArea.objects.filter(chapter=chapter).order_by('name').first() if chapter else None
    first_quest = Quest.objects.filter(chapter=chapter).order_by('order').first() if chapter else None

    if not chapter or not first_map or not first_quest:
        return JsonResponse({'error': 'Dados iniciais em falta.'}, status=400)

    save = get_or_create_save(request, chapter, first_map, first_quest)

    try:
        payload = json.loads(request.body.decode('utf-8') or '{}')
    except json.JSONDecodeError:
        return JsonResponse({'error': 'JSON inválido.'}, status=400)

    map_key = payload.get('currentMapKey')
    quest_key = payload.get('currentQuestKey')

    if map_key:
        map_area = MapArea.objects.filter(key=map_key).first()
        if map_area:
            save.current_map = map_area

    if quest_key:
        quest = Quest.objects.filter(key=quest_key).first()
        if quest:
            save.current_quest = quest
            save.current_chapter = quest.chapter

    if 'playerX' in payload:
        save.player_x = max(0, int(payload.get('playerX') or 0))
    if 'playerY' in payload:
        save.player_y = max(0, int(payload.get('playerY') or 0))
    stats = payload.get('stats')
    if isinstance(stats, dict):
        save.level = max(1, int(stats.get('level') or save.level))
        save.xp = max(0, int(stats.get('xp') or 0))
        save.xp_to_next = max(1, int(stats.get('xpToNext') or save.xp_to_next))
        save.max_hp = max(1, int(stats.get('maxHp') or save.max_hp))
        save.hp = max(0, min(save.max_hp, int(stats.get('hp') if stats.get('hp') is not None else save.hp)))
        save.attack = max(1, int(stats.get('attack') or save.attack))
        save.defense = max(0, int(stats.get('defense') if stats.get('defense') is not None else save.defense))

    if 'gold' in payload:
        save.gold = max(0, int(payload.get('gold') or 0))

    if isinstance(payload.get('inventory'), dict):
        # Mantém só quantidades inteiras e não negativas.
        save.inventory = {str(k): max(0, int(v or 0)) for k, v in payload['inventory'].items()}

    if isinstance(payload.get('flags'), dict):
        save.flags = payload['flags']

    save.save()
    return JsonResponse({'ok': True})


@require_http_methods(['POST'])
def reset_api(request):
    session_key = ensure_session(request)
    PlayerSave.objects.filter(session_key=session_key).delete()
    return JsonResponse({'ok': True})
