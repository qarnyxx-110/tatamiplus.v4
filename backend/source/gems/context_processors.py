def gem_balance(request):
	"""Expose the cached balance to every template, e.g. for the header chip."""
	user = getattr(request, 'user', None)
	if user is None or not user.is_authenticated:
		return {'gem_balance': None}
	return {'gem_balance': user.gem_balance}
