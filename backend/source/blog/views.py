from django.shortcuts import get_object_or_404, render

from .models import Post


def post_list(request):
	"""Public index: only posts the team has published."""
	posts = Post.objects.filter(is_published=True).select_related('author')
	return render(request, 'blog/post_list.html', {'posts': posts})


def post_detail(request, slug):
	"""One post; drafts and unpublished rows are simply not found."""
	post = get_object_or_404(Post, slug=slug, is_published=True)
	return render(request, 'blog/post_detail.html', {'post': post})
