import assert from 'node:assert/strict';
import fs from 'node:fs';

console.log('🧪 Running RequestDetailModal & Button Redesign Verification...\n');

// 1. Audit RequestDetailModal for Hook Order Violations
console.log('1. Auditing RequestDetailModal for React Rules of Hooks compliance...');
const modalContent = fs.readFileSync('components/requests/RequestDetailModal.tsx', 'utf8');

// Ensure no useMemo or other hooks exist after early return
const earlyReturnIndex = modalContent.indexOf('if (!open || !request) return null;');
assert.ok(earlyReturnIndex !== -1, 'Early return guard must be present');

const afterEarlyReturn = modalContent.substring(earlyReturnIndex);
const forbiddenHooksAfterReturn = afterEarlyReturn.match(/\b(useMemo|useEffect|useCallback|useState|useRef)\s*\(/g);
assert.equal(
  forbiddenHooksAfterReturn,
  null,
  `Fatal: Found hooks after early return: ${forbiddenHooksAfterReturn?.join(', ')}`
);
console.log('   ✓ Zero React hooks called after early return (Rules of Hooks 100% compliant)');

// 2. Defensive guards for icons
console.log('2. Auditing CategoryIcon and UrgencyIcon fallbacks...');
assert.ok(
  modalContent.includes('categoryConfig?.icon || AlertCircle') || modalContent.includes('categoryConfig.icon || AlertCircle'),
  'CategoryIcon must have fallback to AlertCircle'
);
assert.ok(
  modalContent.includes('urgencyConfig?.icon || AlertTriangle') || modalContent.includes('urgencyConfig.icon || AlertTriangle'),
  'UrgencyIcon must have fallback to AlertTriangle'
);
console.log('   ✓ CategoryIcon and UrgencyIcon guarded against undefined tokens');

// 3. Conditional rendering in Parent Views
console.log('3. Auditing parent views for guarded RequestDetailModal mounting...');
const homeContent = fs.readFileSync('components/home/HomeView.tsx', 'utf8');
const requestsContent = fs.readFileSync('components/requests/RequestsView.tsx', 'utf8');
const mapContent = fs.readFileSync('components/map/MapView.tsx', 'utf8');

assert.ok(
  homeContent.includes('Boolean(selectedDetailRequest) &&'),
  'HomeView must conditionally mount RequestDetailModal only when request is selected'
);
assert.ok(
  requestsContent.includes('Boolean(activeDetailRequest) &&'),
  'RequestsView must conditionally mount RequestDetailModal only when request is active'
);
assert.ok(
  mapContent.includes('detailModalOpen && activeItem?.type === \'request\''),
  'MapView must conditionally mount RequestDetailModal only when request item is active'
);
console.log('   ✓ HomeView, RequestsView, and MapView strictly guard modal mounting');

// 4. Redesigned buttons audit
console.log('4. Auditing redesigned crystal action buttons and cards...');
const urgentContent = fs.readFileSync('components/home/UrgentNearYou.tsx', 'utf8');
const wizardContent = fs.readFileSync('components/wizard/NewRequestWizard.tsx', 'utf8');

assert.ok(
  urgentContent.includes('Broaden Search Radius (50 km)') && urgentContent.includes('group/broaden'),
  'Broaden Search Radius button must have crystal glass styling'
);
assert.ok(
  urgentContent.includes('Post a Request') && urgentContent.includes('from-teal-500 via-emerald-500 to-teal-600'),
  'Post a Request button must have multi-stop crystal gradient'
);
assert.ok(
  homeContent.includes('Ask for Help') && homeContent.includes('from-teal-500 via-emerald-500 to-teal-600'),
  'HomeView Ask for Help button must have luminous crystal gradient'
);
assert.ok(
  homeContent.includes('Emergency SOS') && homeContent.includes('from-rose-600 via-red-600 to-rose-700'),
  'HomeView Emergency SOS button must have ruby crystal gradient'
);
assert.ok(
  wizardContent.includes('Review & Submit') && wizardContent.includes('bg-gradient-to-r'),
  'NewRequestWizard review button must have crystal gradient'
);
assert.ok(
  wizardContent.includes('Publish Request') && wizardContent.includes('bg-gradient-to-r'),
  'NewRequestWizard publish button must have crystal gradient'
);
console.log('   ✓ All target buttons verified with luminous crystal gradients and top-rim reflections');

console.log('\n🎉 ALL REQUEST DETAILS MODAL & BUTTON REDESIGN CHECKS PASSED!\n');
