from django.dispatch import Signal

# Sent when a signed-in user marks an episode as finished, at most once per
# (user, episode). Kept as a signal so `club` does not depend on `gems`.
episode_completed = Signal()
