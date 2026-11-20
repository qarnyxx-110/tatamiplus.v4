import assert from 'node:assert/strict';
import fs from 'node:fs';

const bridge = fs.readFileSync(new URL('../src/js/shared/django-route-bridge.js', import.meta.url), 'utf8');
const router = fs.readFileSync(new URL('../src/js/shared/router.js', import.meta.url), 'utf8');

assert.match(bridge, /const target = route === 'login' \? '\/auth\/login\/' : '\/auth\/login\/sms\/';/);
assert.match(bridge, /if \(route === 'password-reset'\) return '\/auth\/password\/reset\/';/);
assert.match(bridge, /if \(route === 'set-password'\) return '\/auth\/password\/set\/';/);
assert.ok(router.includes("'password-reset':0,'set-password':0"), 'Preview route guard must allow the password routes');
assert.ok(router.includes("'password-reset','set-password'"), 'Live Preview interception must include the password routes');
assert.match(bridge, /if \(route === 'blog'\) \{\s*return parts\[1\] \? '\/blog\/' \+ encodeURIComponent\(parts\[1\]\) \+ '\/' : '\/blog\/';\s*\}/);
assert.ok(bridge.includes('account|blog|club'), 'Bridge URL allowlist must include the Django blog route');
assert.ok(bridge.includes("case 'blog': {"), 'Safe next paths must handle blog routes explicitly');
assert.ok(bridge.includes("slug = decodeURIComponent(route[1])"), 'Blog return slugs must be decoded before URLSearchParams encodes the next value');
assert.ok(bridge.includes("route.length !== 2") && bridge.includes("slug === '..'") && bridge.includes("/[\\\\/\\\\\\\\?#]/.test(slug)"), 'Unsafe or multi-segment blog return paths must be rejected');
assert.ok(router.includes("'set-password','blog','store'"), 'Live Preview interception must include Django blog pages');

console.log('Django auth route contract: PASS');
