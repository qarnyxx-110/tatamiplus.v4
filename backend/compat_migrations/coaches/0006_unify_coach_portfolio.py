from django.core.management.color import no_style
from django.db import migrations, models
import django.core.validators
import django.db.models.deletion
import coaches.storage
import django_jalali.db.models


def forwards(apps, schema_editor):
    """Copy the legacy application/profile pair into one portfolio per coach.

    Existing CoachProfile primary keys are deliberately retained because
    Course, CoachInvite and CoachStudent rows still point at those IDs.
    Applications without a profile receive IDs above the old profile range.
    """
    alias = schema_editor.connection.alias
    Application = apps.get_model("coaches", "CoachApplication")
    Profile = apps.get_model("coaches", "CoachProfile")
    Portfolio = apps.get_model("coaches", "CoachPortfolio")
    User = apps.get_model("accounts", "User")

    profiles = {
        profile.application_id: profile
        for profile in Profile.objects.using(alias).all().iterator()
    }
    next_pk = (Profile.objects.using(alias).order_by("-pk").values_list("pk", flat=True).first() or 0) + 1

    for application in Application.objects.using(alias).order_by("pk").iterator():
        profile = profiles.get(application.pk)
        user = User.objects.using(alias).get(pk=application.user_id)

        full_name = " ".join(
            part for part in (getattr(user, "first_name", ""), getattr(user, "last_name", ""))
            if part
        ).strip()
        display_name = (
            (getattr(profile, "display_name", "") or "").strip()
            if profile else ""
        ) or full_name or getattr(user, "phone", "") or getattr(user, "username", "") or f"coach-{user.pk}"

        status = application.status
        if status not in ("draft", "pending_review", "incomplete", "approved", "published", "rejected", "inactive"):
            status = "pending_review"

        portfolio_id = profile.pk if profile else next_pk
        if profile is None:
            next_pk += 1

        portfolio = Portfolio.objects.using(alias).create(
            id=portfolio_id,
            user_id=application.user_id,
            display_name=display_name[:100],
            headline=getattr(profile, "headline", "") if profile else "",
            biography=getattr(profile, "biography", "") if profile else "",
            avatar=profile.avatar.name if profile and profile.avatar else "",
            coaching_level=application.coaching_level,
            specializations=application.specializations,
            years_experience=application.years_experience or 0,
            belt=getattr(profile, "belt", "") if profile else "",
            club=(getattr(profile, "club", "") if profile else "") or application.club_name,
            certificate_details=application.certificate_details,
            certificate_document=application.certificate_document.name if application.certificate_document else "",
            status=status,
            rejection_reason=application.rejection_reason,
            is_published=bool(profile and profile.is_published and status in ("approved", "published")),
            submitted_at=application.submitted_at,
            reviewed_at=application.reviewed_at,
        )

        # Preserve old public-profile timestamps where a profile existed.
        if profile is not None:
            Portfolio.objects.using(alias).filter(pk=portfolio.pk).update(
                created_at=profile.created_at,
                updated_at=profile.updated_at,
            )

    # Explicitly assigned legacy IDs do not advance PostgreSQL sequences.
    with schema_editor.connection.cursor() as cursor:
        for statement in schema_editor.connection.ops.sequence_reset_sql(no_style(), [Portfolio]):
            cursor.execute(statement)


def backwards(apps, schema_editor):
    """Reconstruct the old two-row representation if this migration is reversed."""
    alias = schema_editor.connection.alias
    Portfolio = apps.get_model("coaches", "CoachPortfolio")
    Application = apps.get_model("coaches", "CoachApplication")
    Profile = apps.get_model("coaches", "CoachProfile")

    for portfolio in Portfolio.objects.using(alias).order_by("pk").iterator():
        if portfolio.status == "rejected":
            legacy_status = "rejected"
        elif portfolio.status in ("approved", "published"):
            legacy_status = "approved"
        else:
            legacy_status = "pending_review"

        application = Application.objects.using(alias).create(
            user_id=portfolio.user_id,
            coaching_level=portfolio.coaching_level,
            specializations=portfolio.specializations,
            years_experience=portfolio.years_experience,
            club_name=portfolio.club,
            certificate_details=portfolio.certificate_details,
            certificate_document=portfolio.certificate_document.name if portfolio.certificate_document else "",
            status=legacy_status,
            rejection_reason=portfolio.rejection_reason,
            reviewed_at=portfolio.reviewed_at,
        )
        Application.objects.using(alias).filter(pk=application.pk).update(
            submitted_at=portfolio.submitted_at,
        )

        profile = Profile.objects.using(alias).create(
            id=portfolio.pk,
            application_id=application.pk,
            display_name=portfolio.display_name,
            headline=portfolio.headline,
            biography=portfolio.biography,
            belt=portfolio.belt,
            club=portfolio.club,
            avatar=portfolio.avatar.name if portfolio.avatar else "",
            is_published=bool(portfolio.is_published and legacy_status == "approved"),
        )
        Profile.objects.using(alias).filter(pk=profile.pk).update(
            created_at=portfolio.created_at,
            updated_at=portfolio.updated_at,
        )

    with schema_editor.connection.cursor() as cursor:
        for statement in schema_editor.connection.ops.sequence_reset_sql(no_style(), [Application, Profile]):
            cursor.execute(statement)


class Migration(migrations.Migration):
    dependencies = [
        ("coaches", "0005_coachinvite_coachstudent"),
    ]

    operations = [
        migrations.CreateModel(
            name="CoachPortfolio",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("display_name", models.CharField(blank=True, max_length=100, verbose_name="نام نمایشی")),
                ("headline", models.CharField(blank=True, max_length=180, verbose_name="عنوان کوتاه")),
                ("biography", models.TextField(blank=True, verbose_name="معرفی مربی")),
                ("avatar", models.ImageField(blank=True, upload_to="coaches/avatars/%Y/%m/", verbose_name="تصویر")),
                ("coaching_level", models.CharField(blank=True, max_length=100, verbose_name="سطح مربیگری")),
                ("specializations", models.TextField(blank=True, verbose_name="تخصص‌ها")),
                ("years_experience", models.PositiveSmallIntegerField(blank=True, default=0, verbose_name="سابقهٔ مربیگری، به سال")),
                ("belt", models.CharField(blank=True, max_length=40, verbose_name="رنگ و درجه کمربند")),
                ("club", models.CharField(blank=True, max_length=150, verbose_name="باشگاه محل فعالیت")),
                ("certificate_details", models.TextField(blank=True, verbose_name="توضیحات مدارک و افتخارات")),
                ("certificate_document", models.FileField(blank=True, storage=coaches.storage.PrivateUploadStorage(), upload_to="coach-certificates/%Y/%m/", validators=[django.core.validators.FileExtensionValidator(["pdf", "jpg", "jpeg", "png"], message="فقط فایل PDF یا تصویر JPG و PNG مجاز است.")], verbose_name="فایل مدرک")),
                ("status", models.CharField(choices=[("draft", "پیش‌نویس"), ("pending_review", "در انتظار بررسی"), ("incomplete", "ناقص"), ("approved", "تأییدشده"), ("published", "منتشرشده"), ("rejected", "ردشده"), ("inactive", "غیرفعال")], default="draft", max_length=20, verbose_name="وضعیت")),
                ("rejection_reason", models.TextField(blank=True, verbose_name="دلیل رد درخواست")),
                ("is_published", models.BooleanField(default=False, verbose_name="انتشار در آکادمی")),
                ("submitted_at", django_jalali.db.models.jDateTimeField(blank=True, null=True, verbose_name="زمان ثبت")),
                ("reviewed_at", django_jalali.db.models.jDateTimeField(blank=True, null=True, verbose_name="زمان بررسی")),
                ("created_at", django_jalali.db.models.jDateTimeField(auto_now_add=True, verbose_name="زمان ایجاد")),
                ("updated_at", django_jalali.db.models.jDateTimeField(auto_now=True, verbose_name="آخرین ویرایش")),
                ("user", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="portfolio", to="accounts.user", verbose_name="کاربر مربی")),
            ],
            options={
                "verbose_name": "پورتفولیوی مربی",
                "verbose_name_plural": "پورتفولیوهای مربیان",
                "ordering": ["display_name"],
            },
        ),
        migrations.RunPython(forwards, backwards),
        migrations.AlterField(
            model_name="coachinvite",
            name="coach",
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="invites", to="coaches.coachportfolio", verbose_name="مربی"),
        ),
        migrations.AlterField(
            model_name="coachstudent",
            name="coach",
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="students", to="coaches.coachportfolio", verbose_name="مربی"),
        ),
    ]
