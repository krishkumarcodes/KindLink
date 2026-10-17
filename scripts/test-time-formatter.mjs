import assert from 'node:assert/strict';

// Test harness for formatTime.ts
// We will test both dynamic import of the compiled/transpiled file or direct inline equivalents

async function runTests() {
  console.log('🧪 Starting Time Formatter Unit Tests...');

  // Import formatTime
  const {
    formatMinutesAgo,
    formatHumanTime,
    formatTimeAgo,
    formatWaitingTime,
    formatLivePulseStatus,
    formatShortDate,
  } = await import('../lib/utils/formatTime.ts');

  const baseDate = new Date('2026-10-17T12:00:00Z');

  // 1. Tests for < 1 min: "just now"
  console.log('  Testing < 1 min...');
  assert.equal(formatMinutesAgo(0), 'just now');
  assert.equal(formatMinutesAgo(0.5), 'just now');
  assert.equal(formatMinutesAgo(-5), 'just now');
  assert.equal(formatHumanTime(null), 'just now');
  assert.equal(formatHumanTime(undefined), 'just now');
  assert.equal(formatHumanTime(''), 'just now');
  assert.equal(formatHumanTime('just now'), 'just now');

  const justNowDate = new Date(baseDate.getTime() - 30 * 1000); // 30s ago
  assert.equal(formatHumanTime(justNowDate, { baseDate }), 'just now');

  // 2. Tests for < 60 min: "N min ago"
  console.log('  Testing < 60 min...');
  assert.equal(formatMinutesAgo(1), '1 min ago');
  assert.equal(formatMinutesAgo(14), '14 min ago');
  assert.equal(formatMinutesAgo(59), '59 min ago');

  const date14m = new Date(baseDate.getTime() - 14 * 60 * 1000);
  assert.equal(formatHumanTime(date14m, { baseDate }), '14 min ago');
  assert.equal(formatHumanTime('14 min ago'), '14 min ago');

  // 3. Tests for < 24 h: "X h Y min ago" or "X h ago"
  console.log('  Testing < 24 h ("X h Y min ago" / "X h ago")...');
  assert.equal(formatMinutesAgo(60), '1 h ago');
  assert.equal(formatMinutesAgo(75), '1 h 15 min ago');
  assert.equal(formatMinutesAgo(120), '2 h ago');
  // 168 min ago -> 2 h 48 min ago (replaces awkward 168 min ago!)
  assert.equal(formatMinutesAgo(168), '2 h 48 min ago');
  assert.equal(formatHumanTime('168 min ago'), '2 h 48 min ago');
  assert.equal(formatHumanTime('168 mins ago'), '2 h 48 min ago');
  assert.equal(formatMinutesAgo(1439), '23 h 59 min ago');

  const date168m = new Date(baseDate.getTime() - 168 * 60 * 1000);
  assert.equal(formatHumanTime(date168m, { baseDate }), '2 h 48 min ago');

  // 4. Tests for 1 day: "Yesterday"
  console.log('  Testing 1 day ("Yesterday")...');
  assert.equal(formatMinutesAgo(1440), 'Yesterday'); // exactly 24h
  assert.equal(formatMinutesAgo(1800), 'Yesterday'); // 30h
  assert.equal(formatMinutesAgo(2879), 'Yesterday'); // 47h 59m
  assert.equal(formatHumanTime('Yesterday'), 'Yesterday');
  assert.equal(formatHumanTime('yesterday'), 'Yesterday');

  const yesterdayDate = new Date(baseDate.getTime() - 26 * 60 * 60 * 1000);
  assert.equal(formatHumanTime(yesterdayDate, { baseDate }), 'Yesterday');

  // 5. Tests for 2-6 days: "N days ago"
  console.log('  Testing 2-6 days ("N days ago")...');
  assert.equal(formatMinutesAgo(2880), '2 days ago'); // 48h
  assert.equal(formatMinutesAgo(4320), '3 days ago'); // 72h
  assert.equal(formatMinutesAgo(5760), '4 days ago');
  assert.equal(formatMinutesAgo(7200), '5 days ago');
  assert.equal(formatMinutesAgo(8640), '6 days ago');

  const daysAgo3 = new Date(baseDate.getTime() - 3 * 24 * 60 * 60 * 1000);
  assert.equal(formatHumanTime(daysAgo3, { baseDate }), '3 days ago');

  // 6. Tests for >= 7 days: formatted date (e.g. "12 Oct")
  console.log('  Testing >= 7 days (formatted date)...');
  const date7d = new Date('2026-10-10T12:00:00Z'); // 7 days prior to Oct 17, 2026
  assert.equal(formatHumanTime(date7d, { baseDate }), '10 Oct');

  const date12Oct = new Date('2026-10-12T10:00:00Z');
  assert.equal(formatShortDate(date12Oct, baseDate), '12 Oct');

  const dateLastYear = new Date('2025-10-12T10:00:00Z');
  assert.equal(formatShortDate(dateLastYear, baseDate), '12 Oct 2025');

  // 7. formatWaitingTime tests
  console.log('  Testing formatWaitingTime...');
  assert.equal(formatWaitingTime(0), 'Posted just now');
  assert.equal(formatWaitingTime(14), 'Posted 14 min ago');
  assert.equal(formatWaitingTime(168), 'Posted 2 h 48 min ago');
  assert.equal(formatWaitingTime(1440), 'Posted Yesterday');
  assert.equal(formatWaitingTime(4320), 'Posted 3 days ago');
  assert.equal(formatWaitingTime(null, date7d, { baseDate }), 'Posted 10 Oct');

  // 8. formatLivePulseStatus tests
  console.log('  Testing formatLivePulseStatus...');
  const s0 = formatLivePulseStatus(2);
  assert.equal(s0.long, 'Live · updated just now');
  assert.equal(s0.short, 'Live · just now');

  const s18 = formatLivePulseStatus(18);
  assert.equal(s18.long, 'Live · updated 18s ago');
  assert.equal(s18.short, 'Live · 18s ago');

  const s120 = formatLivePulseStatus(120);
  assert.equal(s120.long, 'Live · updated 2m ago');
  assert.equal(s120.short, 'Live · 2m ago');

  console.log('✅ ALL Time Formatter Unit Tests Passed Successfully!');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
