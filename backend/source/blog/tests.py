from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils.text import slugify

from .models import Post


def make_post(**extra):
	defaults = {
		'title': 'تمرین پایه',
		'body': 'متن آزمایشی آزمایشی',
		'is_published': True,
	}
	defaults.update(extra)
	return Post.objects.create(**defaults)


class BlogViewTests(TestCase):
	def test_list_renders_and_shows_only_published_posts(self):
		make_post(slug='published-post')
		make_post(title='پیش‌نویس', slug='draft-post', is_published=False)

		response = self.client.get(reverse('blog:list'))

		self.assertEqual(response.status_code, 200)
		self.assertContains(response, 'تمرین پایه')
		self.assertNotContains(response, 'پیش‌نویس')

	def test_detail_renders_a_published_post(self):
		post = make_post(slug='published-post', excerpt='خلاصهٔ کوتاه')

		response = self.client.get(reverse('blog:detail', args=[post.slug]))

		self.assertEqual(response.status_code, 200)
		self.assertContains(response, 'متن آزمایشی آزمایشی')
		self.assertContains(response, 'خلاصهٔ کوتاه')

	def test_drafts_and_unknown_slugs_are_404(self):
		post = make_post(slug='draft-post', is_published=False)

		self.assertEqual(
			self.client.get(reverse('blog:detail', args=[post.slug])).status_code,
			404,
		)
		self.assertEqual(
			self.client.get(reverse('blog:detail', args=['nope'])).status_code,
			404,
		)

	def test_a_persian_slug_round_trips_through_the_url(self):
		post = make_post(slug='تمرین-پایه')

		response = self.client.get(reverse('blog:detail', args=[post.slug]))

		self.assertEqual(response.status_code, 200)
		self.assertContains(response, 'تمرین پایه')

	def test_the_header_links_to_the_weblog(self):
		response = self.client.get(reverse('home'))

		self.assertContains(response, reverse('blog:list'))


class BlogAdminTests(TestCase):
	def make_superuser(self):
		staff = get_user_model().objects.create_superuser(
			phone='09120000170',
			password='Safe-Training-Password-914!',
		)
		self.client.force_login(staff)
		return staff

	def test_admin_list_and_add_views_render(self):
		self.make_superuser()

		response = self.client.get(reverse('admin:blog_post_changelist'))
		self.assertEqual(response.status_code, 200)

		response = self.client.get(reverse('admin:blog_post_add'))
		self.assertEqual(response.status_code, 200)

	def test_admin_add_derives_the_slug_and_stamps_publication(self):
		staff = self.make_superuser()

		response = self.client.post(reverse('admin:blog_post_add'), {
			'title': 'تمرین صبحگاهی',
			'slug': '',
			'excerpt': '',
			'body': 'متن مطلب',
			'author': '',
			'is_published': 'on',
			'published_at': '',
		})

		self.assertRedirects(response, reverse('admin:blog_post_changelist'))
		post = Post.objects.get()
		self.assertEqual(post.slug, slugify(post.title, allow_unicode=True))
		self.assertIsNotNone(post.published_at)
		self.assertEqual(post.author, staff)

	def test_saving_a_draft_leaves_it_unpublished(self):
		self.make_superuser()

		self.client.post(reverse('admin:blog_post_add'), {
			'title': 'پیش‌نویس',
			'slug': 'draft-post',
			'excerpt': '',
			'body': 'متن',
			'author': '',
			'published_at': '',
		})

		post = Post.objects.get()
		self.assertFalse(post.is_published)
		self.assertIsNone(post.published_at)
		self.assertFalse(self.client.get(reverse('blog:list')).__contains__('پیش‌نویس'))
