import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("club", "0002_episodecompletion"),
        ("coaches", "0006_unify_coach_portfolio"),
    ]

    operations = [
        migrations.AlterField(
            model_name="course",
            name="coach",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="courses",
                to="coaches.coachportfolio",
                verbose_name="مربی",
            ),
        ),
    ]
