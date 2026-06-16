# Generated manually for the OFDD RPG prototype.
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('game', '0002_character_skin_hair_colors'),
    ]

    operations = [
        migrations.AddField(
            model_name='playersave',
            name='attack',
            field=models.PositiveIntegerField(default=5),
        ),
        migrations.AddField(
            model_name='playersave',
            name='defense',
            field=models.PositiveIntegerField(default=2),
        ),
        migrations.AddField(
            model_name='playersave',
            name='hp',
            field=models.PositiveIntegerField(default=35),
        ),
        migrations.AddField(
            model_name='playersave',
            name='level',
            field=models.PositiveIntegerField(default=1),
        ),
        migrations.AddField(
            model_name='playersave',
            name='max_hp',
            field=models.PositiveIntegerField(default=35),
        ),
        migrations.AddField(
            model_name='playersave',
            name='xp',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='playersave',
            name='xp_to_next',
            field=models.PositiveIntegerField(default=50),
        ),
    ]
