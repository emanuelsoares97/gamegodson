# Generated manually for OFDD v9 RPG inventory.
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('game', '0003_playersave_rpg_stats'),
    ]

    operations = [
        migrations.AddField(
            model_name='playersave',
            name='gold',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='playersave',
            name='inventory',
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
