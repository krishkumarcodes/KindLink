#!/usr/bin/env node

/**
 * KindLink Contact Visibility Test Suite
 * Asserts privacy rules across 4 viewer types and 3 visibility levels:
 * - Viewer types: self, matched, member, guest
 * - Visibility levels: members, matched, private
 * - Fields: phone, email, organisation, area
 */

import assert from 'node:assert/strict';

// Pure logic mirror of public.get_member_profile in 14_profile_overhaul.sql
export function evaluateFieldVisibility(setting, viewerType, isAdmin = false) {
  if (viewerType === 'self' || isAdmin) return true;
  if (viewerType === 'guest') return false; // Not logged in
  if (setting === 'members') return viewerType === 'member' || viewerType === 'matched';
  if (setting === 'matched') return viewerType === 'matched';
  if (setting === 'private') return false;
  return false;
}

export function maskContactField(value, isVisible, type) {
  if (isVisible) return value;
  if (type === 'phone') return '•••••• ••••';
  if (type === 'email') return '••••••@••••••';
  if (type === 'area') return null;
  if (type === 'organisation') return null;
  return null;
}

export function sanitizeAreaCoordinates(rawRecord, viewerType) {
  if (viewerType === 'self') {
    return {
      area_name: rawRecord.area_name,
      latitude: rawRecord.latitude,
      longitude: rawRecord.longitude,
    };
  }
  // NEVER reveal exact GPS coordinates to other members or guests
  return {
    area_name: rawRecord.area_name,
    latitude: null,
    longitude: null,
  };
}

let totalTests = 0;
let passedTests = 0;

function runTest(description, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ ${description}`);
  } catch (err) {
    console.error(`  ✗ ${description}`);
    console.error(`    ${err.message}`);
    process.exitCode = 1;
  }
}

console.log('\n🔒 Running KindLink Contact Visibility & Privacy Test Suite...\n');

// 1. Self viewer tests (User always sees their own details)
console.log('1. Self Viewer Rules:');
for (const setting of ['members', 'matched', 'private']) {
  runTest(`Self sees phone with setting='${setting}'`, () => {
    assert.equal(evaluateFieldVisibility(setting, 'self'), true);
  });
  runTest(`Self sees email with setting='${setting}'`, () => {
    assert.equal(evaluateFieldVisibility(setting, 'self'), true);
  });
  runTest(`Self sees organisation with setting='${setting}'`, () => {
    assert.equal(evaluateFieldVisibility(setting, 'self'), true);
  });
  runTest(`Self sees area with setting='${setting}'`, () => {
    assert.equal(evaluateFieldVisibility(setting, 'self'), true);
  });
}

// 2. Matched helper viewer tests (Users with active/completed mutual aid)
console.log('\n2. Matched Helper Rules:');
runTest('Matched viewer sees fields set to "members"', () => {
  assert.equal(evaluateFieldVisibility('members', 'matched'), true);
});
runTest('Matched viewer sees fields set to "matched"', () => {
  assert.equal(evaluateFieldVisibility('matched', 'matched'), true);
});
runTest('Matched viewer CANNOT see fields set to "private"', () => {
  assert.equal(evaluateFieldVisibility('private', 'matched'), false);
});

// 3. Regular logged-in member viewer tests (No mutual task match)
console.log('\n3. General Member Rules:');
runTest('General member sees fields set to "members"', () => {
  assert.equal(evaluateFieldVisibility('members', 'member'), true);
});
runTest('General member CANNOT see fields set to "matched"', () => {
  assert.equal(evaluateFieldVisibility('matched', 'member'), false);
});
runTest('General member CANNOT see fields set to "private"', () => {
  assert.equal(evaluateFieldVisibility('private', 'member'), false);
});

// 4. Anonymous / Guest viewer tests (Logged out)
console.log('\n4. Anonymous / Guest Rules:');
for (const setting of ['members', 'matched', 'private']) {
  runTest(`Guest CANNOT see fields set to '${setting}'`, () => {
    assert.equal(evaluateFieldVisibility(setting, 'guest'), false);
  });
}

// 5. Contact Masking Format
console.log('\n5. Contact Masking Formatting:');
runTest('Hidden phone masks with placeholder', () => {
  const masked = maskContactField('+91 98765 43210', false, 'phone');
  assert.equal(masked, '•••••• ••••');
});
runTest('Visible phone returns actual value', () => {
  const visible = maskContactField('+91 98765 43210', true, 'phone');
  assert.equal(visible, '+91 98765 43210');
});
runTest('Hidden email masks with placeholder', () => {
  const masked = maskContactField('ananya.roy@example.com', false, 'email');
  assert.equal(masked, '••••••@••••••');
});
runTest('Visible email returns actual value', () => {
  const visible = maskContactField('ananya.roy@example.com', true, 'email');
  assert.equal(visible, 'ananya.roy@example.com');
});

// 6. GPS Protection Test
console.log('\n6. GPS Privacy Sanitization:');
const sampleLocation = {
  area_name: 'Kalyanpur, Asansol',
  latitude: 23.688864,
  longitude: 86.966064,
};

runTest('Matched member gets area_name but NULL coordinates', () => {
  const sanitized = sanitizeAreaCoordinates(sampleLocation, 'matched');
  assert.equal(sanitized.area_name, 'Kalyanpur, Asansol');
  assert.equal(sanitized.latitude, null);
  assert.equal(sanitized.longitude, null);
});

runTest('General member gets area_name but NULL coordinates', () => {
  const sanitized = sanitizeAreaCoordinates(sampleLocation, 'member');
  assert.equal(sanitized.area_name, 'Kalyanpur, Asansol');
  assert.equal(sanitized.latitude, null);
  assert.equal(sanitized.longitude, null);
});

runTest('Self viewer retains full GPS coordinates', () => {
  const selfData = sanitizeAreaCoordinates(sampleLocation, 'self');
  assert.equal(selfData.area_name, 'Kalyanpur, Asansol');
  assert.equal(selfData.latitude, 23.688864);
  assert.equal(selfData.longitude, 86.966064);
});

console.log(`\n========================================`);
console.log(`Total assertions: ${totalTests}`);
console.log(`Passed: ${passedTests}`);
console.log(`Failed: ${totalTests - passedTests}`);
console.log(`========================================\n`);

if (totalTests === passedTests) {
  console.log('✅ ALL CONTACT VISIBILITY TESTS PASSED!\n');
} else {
  console.error('❌ SOME CONTACT VISIBILITY TESTS FAILED!\n');
  process.exit(1);
}
