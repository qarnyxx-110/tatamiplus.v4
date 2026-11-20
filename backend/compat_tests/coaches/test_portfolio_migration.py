from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TransactionTestCase


class CoachPortfolioDataMigrationTests(TransactionTestCase):
    """Prove the upgrade preserves the data that old FK rows depend on."""

    migrate_from = [
        ("coaches", "0005_coachinvite_coachstudent"),
        ("club", "0002_episodecompletion"),
    ]
    migrate_to = [
        ("coaches", "0007_remove_legacy_coach_models"),
        ("club", "0003_course_coach_portfolio"),
    ]

    reset_sequences = True

    def setUp(self):
        super().setUp()
        executor = MigrationExecutor(connection)
        executor.migrate(self.migrate_from)
        old_apps = executor.loader.project_state(self.migrate_from).apps

        User = old_apps.get_model("accounts", "User")
        CoachApplication = old_apps.get_model("coaches", "CoachApplication")
        CoachProfile = old_apps.get_model("coaches", "CoachProfile")
        CoachInvite = old_apps.get_model("coaches", "CoachInvite")
        CoachStudent = old_apps.get_model("coaches", "CoachStudent")
        Course = old_apps.get_model("club", "Course")

        coach = User.objects.create(
            username="portfolio-migration-coach",
            role="coach",
        )
        student = User.objects.create(
            username="portfolio-migration-student",
            role="student",
        )
        application = CoachApplication.objects.create(
            user_id=coach.pk,
            coaching_level="Advanced",
            specializations="Judo",
            years_experience=9,
            club_name="باشگاه فرم قدیمی",
            certificate_details="مدرک معتبر",
            certificate_document="coach-certificates/2026/11/coach.pdf",
            status="approved",
            rejection_reason="",
        )
        profile = CoachProfile.objects.create(
            application_id=application.pk,
            display_name="مربی مهاجرت",
            headline="مربی ارشد",
            biography="معرفی قدیمی مربی",
            belt="مشکی دان ۲",
            club="باشگاه پروفایل",
            avatar="coaches/avatars/2026/11/avatar.jpg",
            is_published=True,
        )
        invite = CoachInvite.objects.create(
            coach_id=profile.pk,
            code="MIGRATE88",
            label="کد قدیمی",
            max_uses=0,
            uses=1,
            is_active=True,
        )
        link = CoachStudent.objects.create(
            coach_id=profile.pk,
            student_id=student.pk,
            invite_id=invite.pk,
        )
        course = Course.objects.create(
            coach_id=profile.pk,
            title="دورهٔ مهاجرت",
            slug="portfolio-migration-course",
            description="دورهٔ آزمایشی",
            level="advanced",
            price="250000.00",
            status="published",
        )

        self.expected = {
            "portfolio_id": profile.pk,
            "coach_id": coach.pk,
            "student_id": student.pk,
            "invite_id": invite.pk,
            "link_id": link.pk,
            "course_id": course.pk,
        }

        executor = MigrationExecutor(connection)
        executor.migrate(self.migrate_to)
        self.new_apps = executor.loader.project_state(self.migrate_to).apps

    def tearDown(self):
        # Leave the test database at the project's latest migration state.
        executor = MigrationExecutor(connection)
        executor.migrate(executor.loader.graph.leaf_nodes())
        super().tearDown()

    def test_profile_application_invites_students_and_courses_survive(self):
        Portfolio = self.new_apps.get_model("coaches", "CoachPortfolio")
        CoachInvite = self.new_apps.get_model("coaches", "CoachInvite")
        CoachStudent = self.new_apps.get_model("coaches", "CoachStudent")
        Course = self.new_apps.get_model("club", "Course")

        portfolio = Portfolio.objects.get(pk=self.expected["portfolio_id"])
        self.assertEqual(portfolio.user_id, self.expected["coach_id"])
        self.assertEqual(portfolio.display_name, "مربی مهاجرت")
        self.assertEqual(portfolio.headline, "مربی ارشد")
        self.assertEqual(portfolio.biography, "معرفی قدیمی مربی")
        self.assertEqual(portfolio.coaching_level, "Advanced")
        self.assertEqual(portfolio.specializations, "Judo")
        self.assertEqual(portfolio.years_experience, 9)
        self.assertEqual(portfolio.belt, "مشکی دان ۲")
        self.assertEqual(portfolio.club, "باشگاه پروفایل")
        self.assertEqual(portfolio.avatar, "coaches/avatars/2026/11/avatar.jpg")
        self.assertEqual(portfolio.certificate_document, "coach-certificates/2026/11/coach.pdf")
        self.assertEqual(portfolio.status, "approved")
        self.assertTrue(portfolio.is_published)

        invite = CoachInvite.objects.get(pk=self.expected["invite_id"])
        self.assertEqual(invite.coach_id, portfolio.pk)
        self.assertEqual(invite.code, "MIGRATE88")
        link = CoachStudent.objects.get(pk=self.expected["link_id"])
        self.assertEqual(link.coach_id, portfolio.pk)
        self.assertEqual(link.student_id, self.expected["student_id"])
        self.assertEqual(link.invite_id, invite.pk)

        course = Course.objects.get(pk=self.expected["course_id"])
        self.assertEqual(course.coach_id, portfolio.pk)
        self.assertEqual(course.title, "دورهٔ مهاجرت")
