import assert from 'node:assert/strict';
import fs from 'node:fs';
const bridge = fs.readFileSync(new URL('../src/js/shared/django-route-bridge.js', import.meta.url), 'utf8');
const navigation = fs.readFileSync(new URL('../../django/templates/components/platform_navigation.html', import.meta.url), 'utf8');
assert.match(bridge, /return '\/auth\/login\/' \+ \(suffix \? '\?' \+ suffix : ''\);/);
assert.doesNotMatch(bridge, /\/auth\/login\/sms\//);
assert.doesNotMatch(bridge, /\/auth\/password\/(?:reset|set)\//);

// The pinned Django login GET contract reads "next" and initializes the form's
// hidden "next_url" field from it. Keep the Gem link aligned with that contract.
assert.match(navigation, /href="\/auth\/login\/\?next=\/account\/gems\//);
assert.doesNotMatch(navigation, /href="\/auth\/login\/\?next_url=/);
console.log('Stage 1I auth route contract: PASS');
