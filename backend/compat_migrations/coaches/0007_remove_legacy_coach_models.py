from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("coaches", "0006_unify_coach_portfolio"),
        ("club", "0003_course_coach_portfolio"),
    ]

    operations = [
        migrations.DeleteModel(name="CoachProfile"),
        migrations.DeleteModel(name="CoachApplication"),
    ]
