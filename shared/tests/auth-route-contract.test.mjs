import assert from 'node:assert/strict';
import fs from 'node:fs';
const bridge = fs.readFileSync(new URL('../src/js/shared/django-route-bridge.js', import.meta.url), 'utf8');
assert.match(bridge, /return '\/auth\/login\/' \+ \(suffix \? '\?' \+ suffix : ''\);/);
assert.doesNotMatch(bridge, /\/auth\/login\/sms\//);
assert.doesNotMatch(bridge, /\/auth\/password\/(?:reset|set)\//);
console.log('Stage 1I auth route contract: PASS');
