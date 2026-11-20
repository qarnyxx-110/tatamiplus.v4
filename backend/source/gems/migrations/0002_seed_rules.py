from django.db import migrations


# Starting values, not business constants: every one of these is edited from
# Django Admin afterwards. They exist so a fresh database can award gems
# without anyone remembering to create rows first.
DEFAULT_RULES = [
    # (reason, amount, is_percentage, daily_limit)
    ('profile_complete', 50, False, 0),
    ('episode_complete', 10, False, 100),
    ('purchase', 2, True, 0),
]


def seed_rules(apps, schema_editor):
    GemRule = apps.get_model('gems', 'GemRule')
    for reason, amount, is_percentage, daily_limit in DEFAULT_RULES:
        GemRule.objects.get_or_create(
            reason=reason,
            defaults={
                'amount': amount,
                'is_percentage': is_percentage,
                'daily_limit': daily_limit,
                'is_active': True,
            },
        )


def unseed_rules(apps, schema_editor):
    GemRule = apps.get_model('gems', 'GemRule')
    GemRule.objects.filter(reason__in=[rule[0] for rule in DEFAULT_RULES]).delete()


class Migration(migrations.Migration):
    dependencies = [
        ('gems', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed_rules, unseed_rules),
    ]
