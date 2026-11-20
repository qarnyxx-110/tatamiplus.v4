# Frontend and Backend Cooperation Guide

This document describes how the frontend and backend work together in Tatami Plus. It records the current Django contracts; it is not a request to rebuild the frontend or to add a separate API.

## Architecture

Tatami Plus is a server-rendered Django application. Django owns URLs, authentication and sessions, form validation, permissions, database access, and business rules. Templates render pages; CSS and small JavaScript enhancements are served as static assets. There is currently no JSON API, CORS setup, or client-side authentication contract.

The manager's layered direction applies to how we organize and deliver work: data and constraints, application rules and permissions, page/forms integration, then workflow verification. Keep the existing modular Django apps (`accounts`, `coaches`, `store`) rather than creating duplicate frontend services or moving to a frontend framework.

## Ownership

**Frontend developer**

- Own page markup, visual styling, responsive behavior, and browser-side enhancements.
- Work in Django templates and `static/`; preserve the existing user journeys and Persian RTL design.
- Keep form field names, methods, actions, and CSRF tokens aligned with the contracts below.
- Show Django validation errors and success/error messages returned by the server.

**Backend developer**

- Own models, migrations, URL routing, forms, views, authorization, admin workflows, sessions, and server-side validation.
- Recalculate prices and check inventory on the server. Never trust values supplied by the browser.
- Confirm business rules before adding workflows that are not already specified.

Both developers should agree on route, field, or workflow changes before one side changes the contract. Prefer named Django URLs in templates over hard-coded paths.

## Template and Asset Conventions

- Shared layout: `templates/base.html`.
- Page templates: `templates/accounts/`, `templates/coaches/`, `templates/store/`, and `templates/pages/`.
- Shared CSS: `static/css/styles.css`. Put additional static files under `static/` and reference them with Django's `{% static %}` tag.
- Product uploads use `MEDIA_ROOT` and are served locally only while `DEBUG=True`. Do not use the public media route for private coach certificates; those are served through a staff-protected download view.
- Preserve `<html lang="fa" dir="rtl">`. User-facing copy should be Persian. Use logical CSS properties such as `margin-inline-start` so RTL and any future LTR content remain predictable.
- Django controls the timezone (`Asia/Tehran`) and Jalali date formatting. Do not convert business dates independently in JavaScript. Keep submitted numeric form values parseable by Django; Persian display digits are presentation only.

## Current Routes and Contracts

| Page or action | Route | Contract |
| --- | --- | --- |
| Home | `GET /` | Server-rendered page. |
| Account | `GET /account/` | Signed-in landing page. For a coach it shows the coach request state on arrival — not applied yet, `pending_review`, `rejected` with the reason and an "ویرایش و ارسال دوباره" link, or `approved` with links to courses, students/invites, and the portfolio editor. Students see quick links to the club, order history, gems, and the cart, plus the gem balance. Guests see the student/coach role chooser. Gym is visual-only. |
| Login / signup (step 1) | `GET, POST /auth/login/` | There is no separate registration page. Entering a phone number signs in an existing account, and creates a new one after the code is verified. POST fields: `phone` (any Iranian format; the server normalizes it to `09xxxxxxxxx`), `role` (`student` or `coach`; used only when the account is created), and optional hidden `next_url`. On success the server sends an OTP and redirects to `/auth/otp/verify/`. Errors: a field error on `phone` for an invalid number or a rate limit, and a non-field error when SMS delivery is not configured. |
| Resend OTP | `POST /auth/otp/send/` | Include `{% csrf_token %}`. Only valid after step 1, because the phone number is held in the session. Resends the code and returns to `/auth/otp/verify/`. A 60-second cooldown and an hourly cap apply, so disable the button or show a countdown instead of letting the user click into the error. |
| Verify OTP (step 2) | `GET, POST /auth/otp/verify/` | POST field: `code`, exactly five digits (Persian and Arabic digits are accepted). A correct code logs the user in and redirects to `/auth/complete-profile/` when the profile is incomplete, otherwise to the stored `next` target or `/account/`. A wrong code re-renders this page with a field error. Codes expire after 120 seconds and are invalidated after five wrong attempts. |
| Complete profile | `GET, POST /auth/complete-profile/` | Login required. POST fields: `name`, `city`, `role` (`student` or `coach`). Marks the profile complete, then redirects to the stored `next` target or `/account/`. Users who already completed it are redirected to `/account/`. |
| Legacy register link | `GET /accounts/register/` | 302 redirect to `/auth/login/`. `?role=coach` preselects the coach option; a safe local `?next=` value is preserved. |
| Legacy login link | `GET /accounts/login/` | 302 redirect to `/auth/login/`. Kept for old bookmarks and templates. |
| Logout | `POST /accounts/logout/` | Include `{% csrf_token %}`. Logout is not a GET link. Redirects to `/`. |
| Coach directory | `GET /coaches/` | Lists only portfolios that are approved or published **and** have `is_published` set by the team. |
| Coach profile | `GET /coaches/<profile_id>/` | Public only while the portfolio is approved/published and `is_published` holds; otherwise 404. |
| Coach application | `GET, POST /coaches/apply/` | Login required; coach role required. Writes the coach's single `CoachPortfolio` row — there is no separate application model. Multipart POST fields: `display_name` (required), `headline`, `biography`, `avatar`, `coaching_level`, `specializations`, `years_experience`, `club`, `certificate_details`, `certificate_document`. Certificate accepts PDF/JPG/JPEG/PNG up to 10 MB. A first submission creates the row with `status=pending_review` and stamps `submitted_at`. While the status is anything other than `draft`, `incomplete`, or `rejected`, the form is read-only (redirects to the status page). A rejected coach reopens the same form: it is pre-filled, keeps the previous certificate when no new file is uploaded, and resubmitting reuses the same row (back to `pending_review`, reason and review date cleared). |
| Application status | `GET /coaches/application/` | Login required; shows the current user's portfolio and its state (`draft`, `pending_review`, `incomplete`, `approved`, `published`, `rejected`, `inactive`). A rejected row shows the reason and a resubmit button; an approved row links to the coach panels and, when `is_published`, to the public page. |
| Coach portfolio | `GET, POST /coaches/portfolio/` | Login required; approved coach with a portfolio. Same content fields as the apply form (`display_name`, `headline`, `biography`, `avatar`, `coaching_level`, `specializations`, `years_experience`, `belt`, `club`, `certificate_details`, `certificate_document`). `status` and `is_published` are deliberately absent: saving prepares the public page, but only the team publishes it in Django Admin. Pending, draft, or rejected coaches are redirected to the status page. |
| Certificate download | `GET /coaches/portfolios/<portfolio_id>/certificate/` | Staff-only download for review. The certificate file is private and is never served as a public media URL. |
| Shop catalog | `GET /store/` | Optional query parameters: `query`, `category`, `size`, `color`, `training_level`, `min_price`, `max_price`, `sort`, `page`. Sorting values: `price_asc`, `price_desc`, `name`; category and choice values should come from rendered Django form controls. |
| Product detail / add to cart | `GET, POST /store/<slug>/` | POST fields: `variant` (database variant ID), `quantity` (positive integer). Include CSRF. Server validates variant/product state and stock. Success redirects to `/store/cart/`; validation errors re-render the detail page. |
| Cart | `GET /store/cart/` | Supports guests through the Django session and signed-in users through their account. A guest cart is merged into the user's cart after login. |
| Update cart line | `POST /store/cart/items/<item_id>/update/` | POST field: `quantity`. Include CSRF. Server validates availability and stock, then redirects to cart. |
| Remove cart line | `POST /store/cart/items/<item_id>/remove/` | Include CSRF. Redirects to cart. |
| Checkout: address | `GET, POST /checkout/address/` | Login required, and the cart must not be empty. GET lists the user's saved addresses plus a form for a new one. POST either `address_id` (an existing address belonging to the signed-in user; someone else's id is a 404) or the new-address fields `province`, `city`, `full_address`, `postal_code`, `receiver_name`, `receiver_phone`, `is_default`. `postal_code` is exactly 10 digits; `receiver_phone` accepts `+98`, spaces, and Persian digits and is stored as `09xxxxxxxxx`. The choice is kept in the session and the user moves to `/checkout/review/`. |
| Checkout: review | `GET /checkout/review/` | Login required. With an empty cart it redirects to `/store/cart/`; with no chosen address it redirects to `/checkout/address/`. Shows line items, subtotal, flat shipping, and the final total, all computed on the server. Unavailable or out-of-stock lines are listed and the payment button is withheld. |
| Checkout: pay | `POST /checkout/pay/` | Include `{% csrf_token %}`. No amount field is read from the request; prices, stock, shipping, and totals are recalculated. Creates an order with status `pending_payment`, snapshots prices and the address, creates the payment record, and redirects to the gateway. Business failures redirect back to `/checkout/review/` with a message. |
| Payment callback | `GET /payment/callback/?Status=OK&Authority=<token>` | Called by the gateway, never linked from a page. Repeated or refreshed calls are safe: settlement is idempotent. For a shop order, success marks it `paid`, decrements stock, and empties the cart. For a course purchase, success creates exactly one enrollment and leaves the shop cart alone. On failure the order is `failed`, no enrollment is created, and stock is untouched. |
| Mock gateway | `GET /payment/mock/<authority>/` | Development only; 404 otherwise. Stands in for the provider page with a "pay" and a "fail" action so both callback paths can be exercised. |
| Order history | `GET /orders/` | Login required. Paginated list of the signed-in user's orders only. |
| Order detail | `GET /orders/<order_number>/` | Login required. Another user's order number returns 404. |
| Virtual club | `GET /club/` | Lists published courses only. Optional query parameters: `coach` (a coach profile id), `level` (`beginner`, `intermediate`, `advanced`), `q`, `page`. Draft and `pending_review` courses never appear. |
| Coach club page | `GET /club/coach/<profile_id>/` | The coach's published courses. Public only while the application is approved and the profile is published; otherwise 404. |
| Course detail | `GET /club/course/<slug>/` | Published courses only. Course slugs may contain Persian letters, so build the URL with `{% url 'club:course_detail' course.slug %}` rather than concatenating. Shows every episode, but only the free first episode, an enrolled student, the owning coach, and staff get a play link. |
| Buy course | `POST /club/course/<slug>/buy/` | Login required. Include `{% csrf_token %}`. No amount is read from the request: the price comes from the course row. A paid course redirects to the gateway; a free course grants access immediately and redirects back to the course. The owning coach is never charged. |
| Watch an episode | `GET /club/episode/<episode_id>/` | The first episode of every course is free. Paid episodes require an enrollment, the owning coach, or staff; anyone else is redirected to the course page with a message. |
| Episode video | `GET /club/episode/<episode_id>/stream/` | The only way to read the video bytes, and the `src` of the player. Paid videos live outside `MEDIA_ROOT` and have no public URL. A user without access gets 403, so do not link to this route directly. |
| Mark an episode finished | `POST /club/episode/<episode_id>/complete/` | Login required, and the same access rule as the player. Include `{% csrf_token %}`. Idempotent: the second call only reports that the episode was already recorded. Records an `EpisodeCompletion` and, while an `episode_complete` gem rule is active, credits its gems once. |
| Coach course list | `GET /coach/courses/` | Login required; coach role with an approved application and an existing profile. Otherwise the user is redirected to the application pages. Lists only that coach's own courses, whatever their status. |
| Coach: new course | `GET, POST /coach/courses/new/` | Multipart form fields: `title`, `slug` (optional; generated from the title when empty), `description`, `level`, `price`, `cover` (optional image). New courses are always created as `pending_review`; only an administrator publishes them. |
| Coach: edit course | `GET, POST /coach/courses/<course_id>/edit/` | Same fields as the create form, plus the episode list. Another coach's course returns 404. Coaches cannot change the status or reassign the coach. |
| Coach: add episode | `GET, POST /coach/courses/<course_id>/episodes/new/` | Multipart fields: `title`, `order`, `duration` (seconds), `is_free`, `video_file` (MP4). An episode with `order=1` is forced to be free regardless of `is_free`, and the file size is capped by `COURSE_VIDEO_MAX_BYTES`. |
| Coach: edit episode | `GET, POST /coach/episodes/<episode_id>/edit/` | Same fields. Leaving `video_file` empty keeps the current file. Another coach's episode returns 404. |
| Coach: students and invites | `GET, POST /coach/students/` | Login required; coach role with an approved application and an existing profile. GET lists the coach's own invite codes and students. POST fields: `label` (optional) and `max_uses` (0 means unlimited) create a new 8-character code. Codes omit `I`, `O`, `0`, and `1`, and are matched case-insensitively. |
| Coach: toggle an invite | `POST /coach/students/invites/<invite_id>/toggle/` | Login required; include `{% csrf_token %}`. Flips `is_active` on the coach's own code; another coach's id returns 404. The code value never changes, so a disabled code can be re-enabled. |
| Student joins a coach | `GET, POST /coaches/join/<code>/` | Login required. GET shows the coach and a confirm button. POST attaches the signed-in user to that coach through a `CoachStudent` row, at most once per pair, then redirects to `/club/coach/<profile_id>/`. An unknown code is a 404; a disabled, expired, or exhausted code and a coach redeeming their own code redirect back with a message. |
| My gems | `GET /account/gems/` | Login required. Shows the authoritative balance (`Sum` of the ledger), the active earning rules, and a paginated list of the signed-in user's gem transactions. Every signed-in page also receives `gem_balance` in the template context for the header chip. |
| Weblog index | `GET /blog/` | Public. Lists only posts with `is_published`, newest first, with the Jalali publication date. Linked from the header nav. |
| Weblog post | `GET /blog/<slug>/` | Public; drafts and unpublished posts are 404. Slugs may contain Persian letters, so build the URL with `{% url 'blog:detail' post.slug %}` rather than concatenating. Posts are written only in Django Admin: an empty slug is derived from the title, the first publish stamps `published_at`, and the author defaults to the staff member saving the form. |
| Django Admin | `GET /admin/` | Admin/staff workflows for coach review, profile publication, catalog maintenance, course publication, and enrollment inspection. The portfolio list's standard "Add" button opens the regular admin form: choose the coach account in the `user` field (the "+" beside the picker creates the account in a popup and selects it), fill in the portfolio fields, and save. The form validates that the chosen account has the coach role; `certificate_document` renders through a private-file widget (no public URL) and the current file is offered by the staff-only download link. `is_published` starts off — only the team publishes. Not a public frontend route. |
| Call-center leads | `GET /admin/accounts/signuplead/` | Staff-only. Visible only to superusers and members of the `call_center` group. A `SignupLead` with status `new` is created automatically for each new coach account; operators update status, note, and assignment inline. Authorized users also receive `new_coach_leads_count` in every template's context. |

Accounts are created without a usable password, so members have no password login. Staff sign in at `/admin/login/` using their phone number in the username field; legacy username-only staff accounts still authenticate that way.

For all Django forms, retain the submitted values and render field and non-field errors when the server returns an invalid form. Product prices and cart totals are presentation data from the server; do not submit an authoritative price or total.

## Implemented and Not Yet Implemented

Implemented: phone + OTP sign-in (one flow for login and signup), persisted student/coach role, profile completion, call-center leads for new coach accounts, a unified `CoachPortfolio` record that replaces the old application/profile pair (self-submission with rejection reasons and same-row resubmission, plus CRM creation through the standard admin form and its account picker), an account hub that surfaces the portfolio's state, team-managed publication of approved portfolios, a coach portfolio editor, public approved-coach pages, product/category/variant/image models, catalog search/filter/sort, guest/user carts with stock validation, saved addresses, checkout with server-computed prices and flat shipping, a payable mock gateway with an idempotent callback, order history, the virtual club (course catalog with coach/level/search filters, published-only visibility, per-coach pages, free first episode, paid episodes behind an enrollment, private video streaming), the coach course panel where new courses wait for admin review, the gem ledger (rule-driven earning on profile completion, finished episodes, and shop orders, with a cached balance and a history page), coach invite codes that attach students to a coach, and a weblog whose published posts list at `/blog/` and open at `/blog/<slug>/` (written only in Django Admin).

Not implemented: student dashboards, class schedules, reviews, a gem **spend** surface (the service exists and checkout does not discount with gems yet), and club geo search. Do not design a frontend flow that implies these are available. There is still no real payment provider: `PAYMENT_GATEWAY` points at `orders.gateways.mock.MockGateway`, which refuses to run unless `PAYMENT_ALLOW_MOCK` is on. Coach revenue share and payouts are deliberately not modelled yet. The catalog is currently empty because the product catalog and image-mapping files have not been added to the workspace. The currency is Toman, but `SHIPPING_FLAT_RATE` is a placeholder (50,000) until the real price is confirmed. The `frontend/` directory is still empty, so every template in `templates/` is backend-authored and has not yet been reconciled with the frontend developer's markup.

Gem rates are data, not constants: `GemRule` rows are edited in Django Admin (reason, amount, percentage flag, daily cap, active). The seeded starting values are +50 for profile completion, +10 for a finished episode (capped at 100 per day), and 2% of a settled shop order. Course purchases deliberately earn no shop gems. `gems.award()` and `gems.spend()` are the only writers of the ledger; `User.gem_balance` is a cache that the service keeps in step.

A student-coach relationship is created only by redeeming a coach's invite code (`CoachStudent`). Do not infer it from an account existing or from a profile view. The relationship is not yet used for schedules, reviews, or coach-side course access.

## Joint Verification

1. Start the Django site with `python manage.py runserver` and review the Persian pages at desktop and mobile widths.
2. Verify the phone flow end to end: a new number receives a code, is created, and is sent to profile completion; an existing number is not; a wrong code and a rapid resend are both blocked. Verify POST logout.
3. Verify that students cannot open coach-only application routes, pending coaches do not appear publicly, and rejected/unpublished profiles remain hidden.
4. Verify catalog filters, product variant selection, guest cart persistence, cart merge after login, quantity updates, and stock errors.
5. Verify checkout: an address is required before payment, submitted prices are ignored, shipping is added, a successful callback marks the order paid and reduces stock, a failed one leaves stock alone, and a repeated callback does not deduct twice.
6. Verify the club: unreviewed courses never appear; the first episode plays for a guest while later ones do not; buying a course creates one enrollment and one payment, and a refreshed callback does not create a second; a video URL copied from the player still returns 403 for someone without access; buying a course does not empty the store cart; a coach sees only their own courses and cannot edit another coach's; marking an episode finished twice still pays gems once.
7. Verify gems and invites: finishing a profile pays once, a settled shop order pays its percentage, a coach's code attaches a student once, and a disabled/expired/full code is refused. The header chip and `/account/gems/` must show the same number.
8. Before merging frontend changes, run `python manage.py test` and `python manage.py check`. If routes or fields changed, update this document and the relevant tests in the same change.

## Working Agreement for Changes

When a screen needs a new data field or action, the frontend developer should note the required user interaction and proposed field name. The backend developer confirms the model/form/permission contract before the frontend depends on it. For changes to an existing contract, coordinate the template and backend change together so neither side ships a broken form or route.