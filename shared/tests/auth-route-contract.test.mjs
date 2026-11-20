import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
const bridge = read('../src/js/shared/django-route-bridge.js');
const navigation = read('../../django/templates/components/platform_navigation.html');
const login = read('../../django/templates/accounts/login.html');
const otp = read('../../django/templates/accounts/otp_verify.html');
const account = read('../../django/templates/pages/account.html');

assert.match(bridge, /const useSmsLogin = route !== 'login' \|\| Boolean\(role\);/);
assert.match(bridge, /const target = useSmsLogin \? '\/auth\/login\/sms\/' : '\/auth\/login\/';/);
assert.match(bridge, /if \(route === 'password-reset'\) return '\/auth\/password\/reset\/';/);
assert.match(bridge, /if \(route === 'set-password'\) return '\/auth\/password\/set\/';/);

assert.match(login, /\{% if mode == 'sms' %\}/);
assert.match(login, /\{% url 'phone_auth:sms_login' %\}/);
assert.match(login, /\{% url 'phone_auth:login' %\}/);
assert.match(login, /\{% url 'phone_auth:password_reset' %\}/);
assert.match(login, /action="\{% if mode == 'sms' %\}\{% url 'phone_auth:sms_login' %\}\{% else %\}\{% url 'phone_auth:login' %\}\{% endif %\}"/);
assert.match(otp, /\{% url 'phone_auth:sms_login' %\}/);

assert.match(account, /href="\{% url 'phone_auth:sms_login' %\}\?role=student"/);
assert.match(account, /href="\{% url 'phone_auth:sms_login' %\}\?role=coach"/);
assert.doesNotMatch(account, /href="\{% url 'phone_auth:login' %\}\?role=/);

// Password login is the correct destination for the Gem return-path link.
assert.match(navigation, /href="\/auth\/login\/\?next=\/account\/gems\//);
assert.doesNotMatch(navigation, /href="\/auth\/login\/\?next_url=/);

console.log('Django password/SMS auth route contract: PASS');
