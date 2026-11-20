from django.contrib.auth.decorators import login_required
from django.core.paginator import Paginator
from django.shortcuts import render

from .models import GemRule
from .services import balance_of


@login_required
def history(request):
	entries = request.user.gem_transactions.all()
	page = Paginator(entries, 20).get_page(request.GET.get('page'))
	return render(request, 'gems/history.html', {
		'page': page,
		'balance': balance_of(request.user),
		'rules': GemRule.objects.filter(is_active=True),
	})
