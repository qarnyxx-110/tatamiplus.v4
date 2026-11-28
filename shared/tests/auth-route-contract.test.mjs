import assert from 'node:assert/strict';
import fs from 'node:fs';

const bridge = fs.readFileSync(new URL('../src/js/shared/django-route-bridge.js', import.meta.url), 'utf8');
const auth = fs.readFileSync(new URL('../src/js/shared/auth.js', import.meta.url), 'utf8');
const router = fs.readFileSync(new URL('../src/js/shared/router.js', import.meta.url), 'utf8');
const loginTemplate = fs.readFileSync(new URL('../../django/templates/accounts/login.html', import.meta.url), 'utf8');

assert.ok(bridge.includes("const backendRole = role === 'club' ? 'gym' : role;"), 'Legacy Preview club role must map to Django gym role');
assert.ok(bridge.includes("if (backendRole && !['student', 'coach', 'gym'].includes(backendRole)) return '';"), 'Only backend-supported roles may be forwarded');
assert.ok(bridge.includes('coach|coaches|gyms'), 'Bridge URL allowlist must include Django gym routes');

assert.match(bridge, /const target = route === 'login' \? '\/auth\/login\/' : '\/auth\/login\/sms\/';/);
assert.match(bridge, /if \(route === 'password-reset'\) return '\/auth\/password\/reset\/';/);
assert.match(bridge, /if \(route === 'set-password'\) return '\/auth\/password\/set\/';/);
assert.ok(router.includes("'password-reset':0,'set-password':0"), 'Preview route guard must allow the password routes');
assert.ok(router.includes("'password-reset','set-password'"), 'Live Preview interception must include the password routes');
assert.ok(bridge.includes("function isSafeBlogSlug(value)"), 'A single strict Unicode slug validator must guard blog routes');
assert.ok(bridge.includes("if (route === 'blog') {"), 'Direct blog routes must be handled explicitly');
assert.ok(bridge.includes("if (!isSafeBlogSlug(slug)) return '/blog/';"), 'Invalid direct blog slugs must safely fall back to the blog list');
assert.ok(bridge.includes("return '/blog/' + encodeURIComponent(slug) + '/';"), 'Valid raw and encoded blog slugs must resolve to the canonical Django URL');
assert.ok(bridge.includes('account|blog|club'), 'Bridge URL allowlist must include the Django blog route');
assert.ok(bridge.includes("case 'blog': {"), 'Safe next paths must handle blog routes explicitly');
assert.ok(bridge.includes("slug = decodeURIComponent(route[1])"), 'Blog return slugs must be decoded before URLSearchParams encodes the next value');
const unicodeSlugValidator = String.raw`return /^[\p{L}\p{M}\p{N}_-]+$/u.test`;
assert.ok(bridge.includes(unicodeSlugValidator), 'Unicode slug validator must allow letters, marks and numbers only');
assert.ok(router.includes("'set-password','blog','store'"), 'Live Preview interception must include Django blog pages');


assert.ok(loginTemplate.includes('{% if mode == "password" %}'), 'Login template must render separate password and SMS modes');
assert.ok(loginTemplate.includes('data-auth-form="password-login"'), 'Password form must be explicitly identified');
assert.ok(loginTemplate.includes('data-auth-form="sms-login"'), 'SMS form must be explicitly identified');
assert.ok(loginTemplate.includes("action=\"{% url 'phone_auth:login' %}\""), 'Password form must POST to the password-login endpoint');
assert.ok(loginTemplate.includes("action=\"{% url 'phone_auth:sms_login' %}\""), 'SMS form must POST to the SMS endpoint');
assert.ok(loginTemplate.includes("{% url 'phone_auth:password_reset' %}"), 'Password login must link to the reset flow');
assert.ok(loginTemplate.includes("{% csrf_token %}"), 'Both login forms must include CSRF protection');
assert.ok(loginTemplate.includes("ورود به حساب") && loginTemplate.includes("ارسال کد تأیید"), 'Each mode must have an accurate action label');

assert.match(auth, /if\(role==='club'\)\{\s*window\.location\.assign\('\/auth\/login\/sms\/\?role=gym'\);\s*return;\s*\}/, 'Selecting the Preview club role must enter Django gym OTP registration');
assert.ok(auth.includes("const AUTH_ROLES=['student','coach']"), 'Gym accounts must not be stored in the local Preview auth system');
assert.ok(auth.includes("L('tp:me',null)"), 'Existing Preview local account restoration must remain intact');
assert.ok(auth.includes('ثبت‌نام واقعی باشگاه فیزیکی') && auth.includes('ورود و ثبت‌نام در سامانهٔ اصلی'), 'The club role card must describe the real Django registration path');

console.log('Django auth route, gym entry and template contract: PASS');
