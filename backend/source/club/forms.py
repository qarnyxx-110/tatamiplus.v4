from django import forms
from django.conf import settings

from coaches.models import CoachPortfolio
from coaches.storage import PrivateFileInput

# Approved-and-published is what counts as a live public coach page.
PUBLIC_COACH_STATUSES = (
	CoachPortfolio.Status.APPROVED,
	CoachPortfolio.Status.PUBLISHED,
)

from .models import Course, Episode
from .services import build_unique_slug


class CourseFilterForm(forms.Form):
	coach = forms.ModelChoiceField(
		label='مربی',
		queryset=CoachPortfolio.objects.none(),
		required=False,
		empty_label='همهٔ مربیان',
	)
	level = forms.ChoiceField(label='سطح', required=False, choices=())
	q = forms.CharField(label='جست‌وجو', required=False, max_length=100)

	def __init__(self, *args, **kwargs):
		super().__init__(*args, **kwargs)
		# Only coaches who actually have a published course are offered, so the
		# dropdown cannot produce an empty result by design.
		published_coach_ids = Course.objects.filter(
			status=Course.Status.PUBLISHED,
		).values_list('coach_id', flat=True)
		self.fields['coach'].queryset = CoachPortfolio.objects.filter(
			pk__in=published_coach_ids,
			status__in=PUBLIC_COACH_STATUSES,
			is_published=True,
		).order_by('display_name')
		self.fields['level'].choices = [('', 'همهٔ سطح‌ها'), *Course.Level.choices]


class CourseForm(forms.ModelForm):
	class Meta:
		model = Course
		fields = ('title', 'slug', 'description', 'level', 'price', 'cover')
		widgets = {
			'description': forms.Textarea(attrs={'rows': 5}),
		}

	def __init__(self, *args, **kwargs):
		super().__init__(*args, **kwargs)
		self.fields['slug'].required = False
		self.fields['slug'].help_text = 'اگر خالی بگذارید از عنوان ساخته می‌شود.'

	def clean(self):
		cleaned_data = super().clean()
		if not cleaned_data.get('slug') and cleaned_data.get('title'):
			cleaned_data['slug'] = build_unique_slug(Course, cleaned_data['title'], self.instance)
		return cleaned_data


class EpisodeForm(forms.ModelForm):
	class Meta:
		model = Episode
		fields = ('title', 'order', 'duration', 'is_free', 'video_file')
		widgets = {
			# Private videos have no URL to link to, so the clearable widget
			# that tries to build one would raise.
			'video_file': PrivateFileInput,
		}

	def __init__(self, *args, **kwargs):
		super().__init__(*args, **kwargs)
		self.fields['is_free'].help_text = 'قسمت اول همیشه رایگان است.'
		if self.instance.pk:
			self.fields['video_file'].required = False
			self.fields['video_file'].help_text = 'برای نگه داشتن فایل فعلی، خالی بگذارید.'

	def clean_video_file(self):
		video = self.cleaned_data.get('video_file')
		if video and getattr(video, 'size', 0) > settings.COURSE_VIDEO_MAX_BYTES:
			max_mb = settings.COURSE_VIDEO_MAX_BYTES // (1024 * 1024)
			raise forms.ValidationError(f'حجم فایل باید کمتر از {max_mb} مگابایت باشد.')
		return video

	def clean(self):
		cleaned_data = super().clean()
		# The model enforces this too; setting it here keeps the bound form honest.
		if cleaned_data.get('order') == 1:
			cleaned_data['is_free'] = True
		return cleaned_data
