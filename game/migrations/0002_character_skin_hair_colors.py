# Generated manually for the OFDD prototype.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('game', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='character',
            name='skin_color',
            field=models.CharField(default='#8d5524', max_length=20),
        ),
        migrations.AddField(
            model_name='character',
            name='hair_color',
            field=models.CharField(default='#1e293b', max_length=20),
        ),
    ]
