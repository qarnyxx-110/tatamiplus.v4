from django.db import migrations


# Seeded turned off on purpose: the team decides in Django Admin whether an
# invitation pays anything and how much each side gets. `award()` treats a
# zero amount as "nothing happened", so 0 is a real off switch, not a promise.
INVITE_RULES = [
    # (reason, amount, is_percentage, daily_limit, is_active)
    ('invite_student', 0, False, 0, True),
    ('invite_coach', 0, False, 0, True),
]


def seed_rules(apps, schema_editor):
    GemRule = apps.get_model('gems', 'GemRule')
    for reason, amount, is_percentage, daily_limit, is_active in INVITE_RULES:
        GemRule.objects.get_or_create(
            reason=reason,
            defaults={
                'amount': amount,
                'is_percentage': is_percentage,
                'daily_limit': daily_limit,
                'is_active': is_active,
            },
        )


def unseed_rules(apps, schema_editor):
    GemRule = apps.get_model('gems', 'GemRule')
    GemRule.objects.filter(reason__in=[rule[0] for rule in INVITE_RULES]).delete()


class Migration(migrations.Migration):
    dependencies = [
        ('gems', '0003_add_invite_gem_reasons'),
    ]

    operations = [
        migrations.RunPython(seed_rules, unseed_rules),
    ]
