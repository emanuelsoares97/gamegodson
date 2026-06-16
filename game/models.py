from django.db import models
from django.utils.text import slugify


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Chapter(TimeStampedModel):
    key = models.SlugField(max_length=80, unique=True)
    title = models.CharField(max_length=150)
    order = models.PositiveIntegerField(default=1)
    summary = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['order', 'title']

    def __str__(self):
        return f'{self.order}. {self.title}'


class Character(TimeStampedModel):
    class Kind(models.TextChoices):
        PLAYER = 'player', 'Jogador'
        NPC = 'npc', 'NPC'
        VILLAIN = 'villain', 'Vilão'
        SUPPORT = 'support', 'Apoio'

    key = models.SlugField(max_length=80, unique=True)
    name = models.CharField(max_length=120)
    kind = models.CharField(max_length=20, choices=Kind.choices, default=Kind.NPC)
    role = models.CharField(max_length=220, blank=True)
    description = models.TextField(blank=True)
    portrait = models.CharField(max_length=255, blank=True, help_text='Ex: game/assets/cajado.jpg')
    sprite_key = models.CharField(max_length=80, blank=True, help_text='Chave visual usada pelo JavaScript para sprite temporário.')
    color_primary = models.CharField(max_length=20, default='#2563eb')
    color_secondary = models.CharField(max_length=20, default='#dbeafe')
    skin_color = models.CharField(max_length=20, default='#8d5524')
    hair_color = models.CharField(max_length=20, default='#1e293b')

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class MapArea(TimeStampedModel):
    key = models.SlugField(max_length=80, unique=True)
    chapter = models.ForeignKey(Chapter, on_delete=models.CASCADE, related_name='maps')
    name = models.CharField(max_length=140)
    description = models.TextField(blank=True)
    width = models.PositiveIntegerField(default=20)
    height = models.PositiveIntegerField(default=15)
    tile_size = models.PositiveIntegerField(default=32)
    start_x = models.PositiveIntegerField(default=8)
    start_y = models.PositiveIntegerField(default=8)
    map_data = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['chapter__order', 'name']

    def __str__(self):
        return self.name


class NPCPlacement(TimeStampedModel):
    map_area = models.ForeignKey(MapArea, on_delete=models.CASCADE, related_name='npc_placements')
    character = models.ForeignKey(Character, on_delete=models.CASCADE, related_name='placements')
    x = models.PositiveIntegerField()
    y = models.PositiveIntegerField()
    direction = models.CharField(max_length=20, default='down')
    wander = models.BooleanField(default=False)
    visible_from_quest = models.SlugField(max_length=80, blank=True)
    hidden_after_quest = models.SlugField(max_length=80, blank=True)
    movement_bounds = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['map_area__name', 'character__name']
        unique_together = ['map_area', 'character']

    def __str__(self):
        return f'{self.character.name} em {self.map_area.name}'


class Quest(TimeStampedModel):
    key = models.SlugField(max_length=80, unique=True)
    chapter = models.ForeignKey(Chapter, on_delete=models.CASCADE, related_name='quests')
    title = models.CharField(max_length=160)
    objective = models.TextField()
    order = models.PositiveIntegerField(default=1)
    next_quest = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL, related_name='previous_quests')
    completion_flag = models.SlugField(max_length=100, blank=True)

    class Meta:
        ordering = ['chapter__order', 'order']

    def __str__(self):
        return self.title


class Dialogue(TimeStampedModel):
    character = models.ForeignKey(Character, on_delete=models.CASCADE, related_name='dialogues')
    quest = models.ForeignKey(Quest, on_delete=models.CASCADE, related_name='dialogues')
    order = models.PositiveIntegerField(default=1)
    text = models.TextField()
    advances_to_next_quest = models.BooleanField(default=False)
    trigger_key = models.SlugField(max_length=120, blank=True, help_text='Opcional. Ex: maria_intro, pai_ferido')

    class Meta:
        ordering = ['quest__order', 'character__name', 'order']

    def __str__(self):
        return f'{self.character.name} — {self.quest.key} — {self.order}'


class Cutscene(TimeStampedModel):
    key = models.SlugField(max_length=100, unique=True)
    quest = models.ForeignKey(Quest, on_delete=models.CASCADE, related_name='cutscenes')
    title = models.CharField(max_length=160)
    image = models.CharField(max_length=255, blank=True, help_text='Ex: game/assets/aldeia_destruida.jpg')
    text = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=1)
    show_when_quest_starts = models.BooleanField(default=False)
    show_when_quest_completes = models.BooleanField(default=False)

    class Meta:
        ordering = ['quest__order', 'order']

    def __str__(self):
        return self.title


class PlayerSave(TimeStampedModel):
    session_key = models.CharField(max_length=80, unique=True)
    current_chapter = models.ForeignKey(Chapter, null=True, blank=True, on_delete=models.SET_NULL)
    current_map = models.ForeignKey(MapArea, null=True, blank=True, on_delete=models.SET_NULL)
    current_quest = models.ForeignKey(Quest, null=True, blank=True, on_delete=models.SET_NULL)
    player_x = models.PositiveIntegerField(default=8)
    player_y = models.PositiveIntegerField(default=8)

    # Base RPG do jogador. Ainda é simples, mas já permite evoluir para combate real.
    level = models.PositiveIntegerField(default=1)
    xp = models.PositiveIntegerField(default=0)
    xp_to_next = models.PositiveIntegerField(default=50)
    hp = models.PositiveIntegerField(default=35)
    max_hp = models.PositiveIntegerField(default=35)
    attack = models.PositiveIntegerField(default=5)
    defense = models.PositiveIntegerField(default=2)

    # Sistema RPG v9: moedas e inventário simples.
    # Exemplo: {'potion': 2, 'light_shard': 1}
    gold = models.PositiveIntegerField(default=0)
    inventory = models.JSONField(default=dict, blank=True)

    flags = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return f'Save {self.session_key}'
