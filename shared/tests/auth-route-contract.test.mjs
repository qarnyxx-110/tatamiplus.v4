import assert from 'node:assert/strict';
import fs from 'node:fs';

const bridge = fs.readFileSync(new URL('../src/js/shared/django-route-bridge.js', import.meta.url), 'utf8');
const router = fs.readFileSync(new URL('../src/js/shared/router.js', import.meta.url), 'utf8');

assert.match(bridge, /const target = route === 'login' \? '\/auth\/login\/' : '\/auth\/login\/sms\/';/);
assert.match(bridge, /if \(route === 'password-reset'\) return '\/auth\/password\/reset\/';/);
assert.match(bridge, /if \(route === 'set-password'\) return '\/auth\/password\/set\/';/);
assert.match(router, /'password-reset','set-password'/);
console.log('Django auth route contract: PASS');
