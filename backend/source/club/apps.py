from django.apps import AppConfig


class ClubConfig(AppConfig):
	default_auto_field = 'django.db.models.BigAutoField'
	name = 'club'

	def ready(self):
		import club.receivers  # noqa: F401  (registers the payment receiver)
