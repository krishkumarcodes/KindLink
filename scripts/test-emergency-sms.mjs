import assert from 'node:assert';
import {
  generateEmergencySmsBody,
  buildEmergencySmsUri,
} from '../lib/sos/emergency-sms.ts';

console.log('--- Testing generateEmergencySmsBody ---');

const msgWithBlood = generateEmergencySmsBody({
  userName: 'Sneha Roy',
  areaName: 'Asansol Court Area',
  lat: 23.688864,
  lng: 86.966061,
  siteUrl: 'https://kindlink.org',
  token: 'sos-test-123',
  bloodGroup: 'B+',
});

console.log('Result with blood group:\n' + msgWithBlood);

assert.strictEqual(
  msgWithBlood,
  `EMERGENCY SOS: Sneha Roy needs urgent help!
Location: Asansol Court Area (Lat: 23.68886, Lng: 86.96606)
Google Maps: https://www.google.com/maps/search/?api=1&query=23.68886,86.96606
Live Tracking: https://kindlink.org/sos/sos-test-123
Blood Group: B+
Sent via KindLink Offline SOS.`
);

const msgWithoutBlood = generateEmergencySmsBody({
  userName: '',
  areaName: '',
  lat: 23.688864,
  lng: 86.966061,
  siteUrl: 'https://kindlink.org/',
  token: '',
  bloodGroup: '',
});

console.log('\nResult without blood group / empty defaults:\n' + msgWithoutBlood);

assert.strictEqual(
  msgWithoutBlood,
  `EMERGENCY SOS: KindLink User needs urgent help!
Location: GPS Location (Lat: 23.68886, Lng: 86.96606)
Google Maps: https://www.google.com/maps/search/?api=1&query=23.68886,86.96606
Live Tracking: https://kindlink.org/sos/active
Sent via KindLink Offline SOS.`
);

console.log('\n--- Testing buildEmergencySmsUri ---');

const androidEmpty = buildEmergencySmsUri([], msgWithBlood, false);
console.log('Android empty:', androidEmpty);
assert.ok(androidEmpty.startsWith('sms:?body='));

const iosEmpty = buildEmergencySmsUri([], msgWithBlood, true);
console.log('iOS empty:', iosEmpty);
assert.ok(iosEmpty.startsWith('sms:&body='));

const androidSingle = buildEmergencySmsUri('+91 98320 12345', msgWithBlood, false);
console.log('Android single:', androidSingle);
assert.ok(androidSingle.startsWith('sms:+919832012345?body='));

const iosSingle = buildEmergencySmsUri('+91 98320 12345', msgWithBlood, true);
console.log('iOS single:', iosSingle);
assert.ok(iosSingle.startsWith('sms:+919832012345&body='));

const androidMulti = buildEmergencySmsUri(
  ['+91 98320 11111', '+91 98320 22222'],
  msgWithBlood,
  false
);
console.log('Android multi:', androidMulti);
assert.ok(androidMulti.startsWith('sms:+919832011111,+919832022222?body='));

const iosMulti = buildEmergencySmsUri(
  ['+91 98320 11111', '+91 98320 22222'],
  msgWithBlood,
  true
);
console.log('iOS multi:', iosMulti);
assert.ok(iosMulti.startsWith('sms:+919832011111,+919832022222&body='));

console.log('\nAll tests passed successfully!');
