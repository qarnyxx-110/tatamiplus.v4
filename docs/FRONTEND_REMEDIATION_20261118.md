# Tatami Plus — Frontend remediation register
Date: 2026-11-18
Scope: frontend repository only. No backend implementation, database, migrations, cPanel runtime, or payment changes.

## Applied in this revision
- Preview-to-Django auth routing follows the latest backend routes: password login at `/auth/login/`, SMS sign-in/registration at `/auth/login/sms/`, and password reset/set-password paths.
- Login UI displays the correct form mode and offers a path between password and SMS sign-in.
- Added styled frontend templates for password reset, reset confirmation, setting a password, entering a coach invite code, and the DEBUG-only mock payment page.
- The Preview bridge checks GET HTTP status, aborts obsolete POST requests after navigation, restores submit controls on transport/server errors, and provides video-upload progress/cancel in the AJAX-rendered Preview.
- Added Playwright browser regression coverage for successful POST, network failure recovery, video upload cancellation, and stale-request cancellation.
- Product-detail `data-availability` now follows the same fallback as its visible status.
- The 59 marketplace-reference products no longer receive synthetic stock; they remain visible for research, but purchase is disabled and direct cart insertion is rejected. Legacy LocalStorage/account-cart entries for these reference rows are discarded.
- Preview checkout browser tests now use only the three clearly marked demo products; the market-reference catalogue is view-only. The Preview checkout still does not create a real order or payment.
- CI checks the exact precondition that makes the existing product-list `in_stock` fallback safe.

## Coach invitation overlay compatibility
- An integrated run exposed three failures in `coaches.tests.CoachInviteTests`: remaining invitation capacity was not rendered, the manual-code entry heading did not match the expected contract wording, and the coach panel omitted the copy-link control.
- These were mismatches in the frontend template overlays (not defects in the backend models or views). The templates now use `invite.remaining_uses` from the backend, the expected route/form wording, and a copy action in both normal Django pages and the injected Preview shell.
- The Preview bridge browser suite now exercises the copy action. No backend source was changed.

## Verified contract facts and remaining backend-owned work
1. The backend source revision used by CI is `25fde937def556edc7b81291e5900a9ac84fccb2`. The previous CI pin `e2ffeba0a42ecc3ec172b89d66794f9cd628d977` was one commit behind and did not include password login/reset, SMS login as a separate URL, and coach invite-code entry.
2. The current store list query only returns active products with an active variant whose `stock_quantity > 0`; it also excludes products whose computed starting price is null. Therefore the list-card fallback to `in_stock` is valid for that exact query. CI now checks this precondition. If the backend expands the list to show zero-stock or inventory-unregistered products, it must always provide `availability_status` for every product.
3. The current backend product detail view does not supply a three-state `availability_status`. The frontend can show `in_stock` when a server-computed `starting_price` exists, but it cannot distinguish a product with only zero-stock variants from one with no registered variants. Backend must supply `in_stock`, `out_of_stock`, or `inventory_unregistered`.
4. The current store list query excludes zero-stock products. The frontend cannot display those products in the live catalog until the backend explicitly changes the query and supplies the status context.
5. Product reference data (59 records) remains market research data, not sale prices, verified variants, or inventory. No product rows or variants were imported by this frontend change.
6. Real payment remains blocked until the backend configures and verifies a real payment gateway and defines refund handling for a successful charge followed by stock failure. The mock gateway is a development-only simulation.
7. SMS delivery, production host/security settings, media storage URLs/permissions, and private video streaming/range support require backend/hosting verification. The frontend must not simulate these services.
8. Marketing CMS endpoints described in `docs/API_CONTRACT.md` are not implemented by the Django backend revision inspected; the existing UI must continue to identify its local demo mode and must not claim that demo edits are published.

## Release gates
- [ ] CI passes on the new commit, including backend template compilation, selected backend tests, and the Preview bridge browser suite.
- [ ] Backend owner confirms production settings for `DJANGO_DEBUG`, `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS`, `SMS_BACKEND`, `PAYMENT_GATEWAY`, `PAYMENT_ALLOW_MOCK`, `SHIPPING_FLAT_RATE`, media paths, and private video delivery.
- [ ] Backend owner implements and tests three-state product availability without inventing sale prices or stock.
- [ ] User manually deploys the generated cPanel package and verifies the public Preview; this commit does not deploy.
- [ ] `main` remains unchanged until explicit approval.
