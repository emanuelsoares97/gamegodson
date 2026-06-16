from django.contrib import admin
from .models import Chapter, Character, Cutscene, Dialogue, MapArea, NPCPlacement, PlayerSave, Quest


class DialogueInline(admin.TabularInline):
    model = Dialogue
    extra = 0
    fields = ('character', 'order', 'text', 'advances_to_next_quest', 'trigger_key')


class CutsceneInline(admin.TabularInline):
    model = Cutscene
    extra = 0
    fields = ('key', 'title', 'image', 'order', 'show_when_quest_starts', 'show_when_quest_completes')


@admin.register(Chapter)
class ChapterAdmin(admin.ModelAdmin):
    list_display = ('order', 'title', 'key', 'is_active')
    list_editable = ('is_active',)
    search_fields = ('title', 'key', 'summary')
    prepopulated_fields = {'key': ('title',)}


@admin.register(Character)
class CharacterAdmin(admin.ModelAdmin):
    list_display = ('name', 'key', 'kind', 'role', 'color_primary', 'skin_color', 'hair_color')
    list_filter = ('kind',)
    search_fields = ('name', 'key', 'role', 'description')
    prepopulated_fields = {'key': ('name',)}
    fieldsets = (
        (None, {
            'fields': ('key', 'name', 'kind', 'role', 'description')
        }),
        ('Visual temporário', {
            'fields': ('portrait', 'sprite_key', 'color_primary', 'color_secondary', 'skin_color', 'hair_color'),
            'description': 'Estas cores controlam o sprite desenhado por código até serem trocadas por sprites reais.'
        }),
    )


@admin.register(MapArea)
class MapAreaAdmin(admin.ModelAdmin):
    list_display = ('name', 'key', 'chapter', 'width', 'height', 'start_x', 'start_y')
    list_filter = ('chapter',)
    search_fields = ('name', 'key', 'description')
    prepopulated_fields = {'key': ('name',)}


@admin.register(NPCPlacement)
class NPCPlacementAdmin(admin.ModelAdmin):
    list_display = ('character', 'map_area', 'x', 'y', 'wander', 'visible_from_quest', 'hidden_after_quest')
    list_filter = ('map_area', 'wander')
    search_fields = ('character__name', 'map_area__name')


@admin.register(Quest)
class QuestAdmin(admin.ModelAdmin):
    list_display = ('order', 'title', 'key', 'chapter', 'next_quest')
    list_filter = ('chapter',)
    search_fields = ('title', 'key', 'objective')
    prepopulated_fields = {'key': ('title',)}
    inlines = [DialogueInline, CutsceneInline]


@admin.register(Dialogue)
class DialogueAdmin(admin.ModelAdmin):
    list_display = ('character', 'quest', 'order', 'advances_to_next_quest', 'trigger_key')
    list_filter = ('quest', 'character', 'advances_to_next_quest')
    search_fields = ('text', 'character__name', 'quest__title')


@admin.register(Cutscene)
class CutsceneAdmin(admin.ModelAdmin):
    list_display = ('title', 'quest', 'order', 'show_when_quest_starts', 'show_when_quest_completes')
    list_filter = ('quest', 'show_when_quest_starts', 'show_when_quest_completes')
    search_fields = ('title', 'key', 'text')


@admin.register(PlayerSave)
class PlayerSaveAdmin(admin.ModelAdmin):
    list_display = ('session_key', 'current_chapter', 'current_map', 'current_quest', 'level', 'xp', 'hp', 'max_hp', 'gold', 'player_x', 'player_y', 'updated_at')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        (None, {'fields': ('session_key', 'current_chapter', 'current_map', 'current_quest', 'player_x', 'player_y')}),
        ('Stats RPG', {'fields': ('level', 'xp', 'xp_to_next', 'hp', 'max_hp', 'attack', 'defense', 'gold')}),
        ('Inventário', {'fields': ('inventory',)}),
        ('Flags', {'fields': ('flags',)}),
        ('Datas', {'fields': ('created_at', 'updated_at')}),
    )
    search_fields = ('session_key',)
