from django.apps import AppConfig


class CoachesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'coaches'

    def ready(self):
        import coaches.signals  # noqa: F401  (creates the profile on approval)
