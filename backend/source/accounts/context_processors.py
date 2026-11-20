from .models import SignupLead


def call_center_lead_count(request):
	user = request.user
	if user.is_authenticated and (user.is_superuser or user.groups.filter(name='call_center').exists()):
		return {'new_coach_leads_count': SignupLead.objects.filter(status=SignupLead.Status.NEW).count()}
	return {'new_coach_leads_count': 0}