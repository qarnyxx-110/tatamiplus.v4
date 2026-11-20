from django.apps import AppConfig


class GemsConfig(AppConfig):
	default_auto_field = 'django.db.models.BigAutoField'
	name = 'gems'

	def ready(self):
		import gems.receivers  # noqa: F401  (registers the award receivers)
