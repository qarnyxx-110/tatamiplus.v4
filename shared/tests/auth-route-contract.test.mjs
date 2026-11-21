import assert from 'node:assert/strict';
import fs from 'node:fs';

const bridge = fs.readFileSync(new URL('../src/js/shared/django-route-bridge.js', import.meta.url), 'utf8');
const router = fs.readFileSync(new URL('../src/js/shared/router.js', import.meta.url), 'utf8');

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

console.log('Django auth route contract: PASS');
