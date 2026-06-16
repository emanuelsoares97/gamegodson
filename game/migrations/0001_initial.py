# Generated manually for the OFDD demo project.

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='Chapter',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('key', models.SlugField(max_length=80, unique=True)),
                ('title', models.CharField(max_length=150)),
                ('order', models.PositiveIntegerField(default=1)),
                ('summary', models.TextField(blank=True)),
                ('is_active', models.BooleanField(default=True)),
            ],
            options={'ordering': ['order', 'title']},
        ),
        migrations.CreateModel(
            name='Character',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('key', models.SlugField(max_length=80, unique=True)),
                ('name', models.CharField(max_length=120)),
                ('kind', models.CharField(choices=[('player', 'Jogador'), ('npc', 'NPC'), ('villain', 'Vilão'), ('support', 'Apoio')], default='npc', max_length=20)),
                ('role', models.CharField(blank=True, max_length=220)),
                ('description', models.TextField(blank=True)),
                ('portrait', models.CharField(blank=True, help_text='Ex: game/assets/cajado.jpg', max_length=255)),
                ('sprite_key', models.CharField(blank=True, help_text='Chave visual usada pelo JavaScript para sprite temporário.', max_length=80)),
                ('color_primary', models.CharField(default='#2563eb', max_length=20)),
                ('color_secondary', models.CharField(default='#dbeafe', max_length=20)),
            ],
            options={'ordering': ['name']},
        ),
        migrations.CreateModel(
            name='MapArea',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('key', models.SlugField(max_length=80, unique=True)),
                ('name', models.CharField(max_length=140)),
                ('description', models.TextField(blank=True)),
                ('width', models.PositiveIntegerField(default=20)),
                ('height', models.PositiveIntegerField(default=15)),
                ('tile_size', models.PositiveIntegerField(default=32)),
                ('start_x', models.PositiveIntegerField(default=8)),
                ('start_y', models.PositiveIntegerField(default=8)),
                ('map_data', models.JSONField(blank=True, default=dict)),
                ('chapter', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='maps', to='game.chapter')),
            ],
            options={'ordering': ['chapter__order', 'name']},
        ),
        migrations.CreateModel(
            name='Quest',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('key', models.SlugField(max_length=80, unique=True)),
                ('title', models.CharField(max_length=160)),
                ('objective', models.TextField()),
                ('order', models.PositiveIntegerField(default=1)),
                ('completion_flag', models.SlugField(blank=True, max_length=100)),
                ('chapter', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='quests', to='game.chapter')),
                ('next_quest', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='previous_quests', to='game.quest')),
            ],
            options={'ordering': ['chapter__order', 'order']},
        ),
        migrations.CreateModel(
            name='Cutscene',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('key', models.SlugField(max_length=100, unique=True)),
                ('title', models.CharField(max_length=160)),
                ('image', models.CharField(blank=True, help_text='Ex: game/assets/aldeia_destruida.jpg', max_length=255)),
                ('text', models.TextField(blank=True)),
                ('order', models.PositiveIntegerField(default=1)),
                ('show_when_quest_starts', models.BooleanField(default=False)),
                ('show_when_quest_completes', models.BooleanField(default=False)),
                ('quest', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='cutscenes', to='game.quest')),
            ],
            options={'ordering': ['quest__order', 'order']},
        ),
        migrations.CreateModel(
            name='Dialogue',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('order', models.PositiveIntegerField(default=1)),
                ('text', models.TextField()),
                ('advances_to_next_quest', models.BooleanField(default=False)),
                ('trigger_key', models.SlugField(blank=True, help_text='Opcional. Ex: maria_intro, pai_ferido', max_length=120)),
                ('character', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='dialogues', to='game.character')),
                ('quest', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='dialogues', to='game.quest')),
            ],
            options={'ordering': ['quest__order', 'character__name', 'order']},
        ),
        migrations.CreateModel(
            name='NPCPlacement',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('x', models.PositiveIntegerField()),
                ('y', models.PositiveIntegerField()),
                ('direction', models.CharField(default='down', max_length=20)),
                ('wander', models.BooleanField(default=False)),
                ('visible_from_quest', models.SlugField(blank=True, max_length=80)),
                ('hidden_after_quest', models.SlugField(blank=True, max_length=80)),
                ('movement_bounds', models.JSONField(blank=True, default=dict)),
                ('character', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='placements', to='game.character')),
                ('map_area', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='npc_placements', to='game.maparea')),
            ],
            options={
                'ordering': ['map_area__name', 'character__name'],
                'unique_together': {('map_area', 'character')},
            },
        ),
        migrations.CreateModel(
            name='PlayerSave',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('session_key', models.CharField(max_length=80, unique=True)),
                ('player_x', models.PositiveIntegerField(default=8)),
                ('player_y', models.PositiveIntegerField(default=8)),
                ('flags', models.JSONField(blank=True, default=dict)),
                ('current_chapter', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='game.chapter')),
                ('current_map', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='game.maparea')),
                ('current_quest', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='game.quest')),
            ],
        ),
    ]
