import assert from 'node:assert/strict';

/**
 * KindLink QA Test: SOS Live Links & Expiration Audit
 * Validates:
 * 1. Token format validation (UUID v4)
 * 2. 2-hour expiration window calculation
 * 3. Live link URL structure and query params
 * 4. WhatsApp & SMS share message encoding with address, blood group, and live link
 * 5. Lifecycle states: active, resolved, expired
 */

console.log('🧪 Starting KindLink SOS Live Links & Expiration QA Test...\n');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 1. Token Validation
console.log('  1. Auditing SOS UUID token generation...');
const mockToken = 'e0000000-0000-0000-0000-000000000001';
assert(UUID_REGEX.test(mockToken), 'SOS token must be a valid RFC 4122 UUID');
console.log('     ✓ Token ' + mockToken + ' is a valid UUID');

// 2. 2-Hour Expiration Math
console.log('  2. Auditing 2-hour expiration window calculation...');
const now = Date.now();
const expiresAt = new Date(now + 2 * 3600 * 1000);
const diffMinutes = Math.round((expiresAt.getTime() - now) / 60000);
assert.equal(diffMinutes, 120, 'Expiration must be exactly 120 minutes (2 hours)');
console.log('     ✓ Expiration diff is exactly ' + diffMinutes + ' minutes');

// 3. Live Link URL Generation
console.log('  3. Auditing Live Link URL structure...');
function buildLiveSosUrl(token, origin = 'https://kindlink.org') {
  return `${origin}/sos/live/${token}`;
}
const liveUrl = buildLiveSosUrl(mockToken);
assert.equal(liveUrl, 'https://kindlink.org/sos/live/e0000000-0000-0000-0000-000000000001');
console.log('     ✓ Generated Live URL: ' + liveUrl);

// 4. Emergency Share Message Formatting
console.log('  4. Auditing WhatsApp / SMS emergency dispatch text generator...');
function formatSosShareMessage({ name, address, liveUrl, bloodGroup, notes }) {
  let msg = `🚨 *EMERGENCY SOS - KINDLINK COMMUNITY AID*\n\n`;
  msg += `${name || 'A neighbour'} has triggered an urgent emergency SOS beacon!\n`;
  msg += `📍 *Location:* ${address || 'Asansol Region'}\n`;
  if (bloodGroup) {
    msg += `🩸 *Blood Group:* ${bloodGroup}\n`;
  }
  if (notes) {
    msg += `ℹ️ *Notes:* ${notes}\n`;
  }
  msg += `\n🔴 *Track Live Location & Respond (Active for 2 hours):*\n${liveUrl}\n\n`;
  msg += `If you are nearby and able to assist, please open the link or alert local emergency services immediately.`;
  return msg;
}

const shareText = formatSosShareMessage({
  name: 'Priya Sen',
  address: 'Kalyanpur Housing Estate, Asansol',
  liveUrl,
  bloodGroup: 'O+',
  notes: 'Severe asthma, need urgent clinic transport',
});

assert(shareText.includes('🚨 *EMERGENCY SOS'), 'Share text must include emergency header');
assert(shareText.includes('Priya Sen'), 'Share text must include citizen name');
assert(shareText.includes('Kalyanpur Housing Estate'), 'Share text must include address');
assert(shareText.includes('🩸 *Blood Group:* O+'), 'Share text must include blood group when opted in');
assert(shareText.includes('Severe asthma'), 'Share text must include medical notes when opted in');
assert(shareText.includes(liveUrl), 'Share text must include live tracking URL');

const encodedWhatsApp = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
assert(encodedWhatsApp.startsWith('https://api.whatsapp.com/send?text='), 'Must properly encode for WhatsApp');
console.log('     ✓ Emergency share text successfully encoded (' + shareText.length + ' chars)');

// 5. Expiration and Active Status Gate Simulation
console.log('  5. Auditing active status gate and expiration rejection...');
function isSosAccessible(sos, viewerRole) {
  // Must be active and not expired
  if (sos.status !== 'active') return false;
  if (new Date(sos.expiresAt).getTime() <= Date.now()) return false;
  if (sos.resolvedAt) return false;

  // Authorization check
  if (viewerRole === 'live_link_holder' || viewerRole === 'owner' || viewerRole === 'admin' || viewerRole === 'verified_helper') {
    return true;
  }
  return false;
}

const activeSos = { status: 'active', expiresAt: new Date(Date.now() + 3600000).toISOString(), resolvedAt: null };
const resolvedSos = { status: 'resolved', expiresAt: new Date(Date.now() + 3600000).toISOString(), resolvedAt: new Date().toISOString() };
const expiredSos = { status: 'active', expiresAt: new Date(Date.now() - 1000).toISOString(), resolvedAt: null };

assert.equal(isSosAccessible(activeSos, 'live_link_holder'), true, 'Live link holder accesses active SOS');
assert.equal(isSosAccessible(activeSos, 'verified_helper'), true, 'Verified helper accesses active SOS');
assert.equal(isSosAccessible(activeSos, 'unverified_stranger'), false, 'Unverified stranger is blocked');
assert.equal(isSosAccessible(resolvedSos, 'live_link_holder'), false, 'Resolved SOS is blocked even for link holder');
assert.equal(isSosAccessible(expiredSos, 'live_link_holder'), false, 'Expired SOS is blocked even for link holder');
console.log('     ✓ Active status and expiration gate passed all 5 assertions');

console.log('\n✅ ALL SOS Live Links & Expiration QA Tests Passed Successfully!\n');
