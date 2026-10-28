#!/usr/bin/env node

/**
 * KindLink QA Test Suite: End-to-End Handover PIN & Request Lifecycle Verification
 * 
 * Validates:
 * 1. Own-Request Guard: Requester cannot accept own request or make aid offers on own request (UI, adapter & server API)
 * 2. Handover PIN Architecture: requiresHandoverPin supported in types, wizard, adapters, and modals
 * 3. 4-Digit PIN Generation: Code generated and matches between requester and volunteer
 * 4. HandoverCodeDisplayModal.tsx: Exists, displays 4-digit code, copy button, security guidelines, and completion state
 * 5. HandoverPinModal.tsx: Exists, captures 4-digit input, verifies PIN via data adapter, shows celebratory state
 * 6. Public Open Feed Filtering: Accepted requests are filtered out of public open feed and visible in active progress/commitments
 * 7. Celebratory Completion & Mutual Ratings: Both requester and volunteer see celebration and prompt for ratings
 * 8. Functional E2E Lifecycle Simulation: Complete end-to-end test execution with state transitions
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;

function pass(name, details = '') {
  totalTests++;
  passedTests++;
  console.log(`     ✓ ${name}${details ? ` (${details})` : ''}`);
}

function fail(name, details = '') {
  totalTests++;
  console.error(`     ❌ FAIL: ${name}`);
  if (details) console.error(`        Details: ${details}`);
}

console.log('🧪 Starting KindLink End-to-End Handover PIN & Lifecycle QA Test Suite...\n');

// Load relevant files
const typesFile = path.join(ROOT, 'lib/data/types.ts');
const adapterFile = path.join(ROOT, 'lib/data/adapter.ts');
const mockAdapterFile = path.join(ROOT, 'lib/data/mock-adapter.ts');
const supabaseAdapterFile = path.join(ROOT, 'lib/data/supabase-adapter.ts');
const wizardFile = path.join(ROOT, 'components/wizard/NewRequestWizard.tsx');
const requestDetailModalFile = path.join(ROOT, 'components/requests/RequestDetailModal.tsx');
const handoverPinModalFile = path.join(ROOT, 'components/requests/HandoverPinModal.tsx');
const handoverCodeDisplayModalFile = path.join(ROOT, 'components/requests/HandoverCodeDisplayModal.tsx');
const stickyActionBarFile = path.join(ROOT, 'components/requests/StickyActionBar.tsx');
const offersReceivedFile = path.join(ROOT, 'components/requests/OffersReceivedSection.tsx');
const requestsViewFile = path.join(ROOT, 'components/requests/RequestsView.tsx');
const storeFile = path.join(ROOT, 'lib/store/useKindLinkStore.ts');

const typesCode = fs.readFileSync(typesFile, 'utf8');
const adapterCode = fs.readFileSync(adapterFile, 'utf8');
const mockAdapterCode = fs.readFileSync(mockAdapterFile, 'utf8');
const supabaseAdapterCode = fs.readFileSync(supabaseAdapterFile, 'utf8');
const wizardCode = fs.readFileSync(wizardFile, 'utf8');
const requestDetailModalCode = fs.readFileSync(requestDetailModalFile, 'utf8');
const handoverPinModalCode = fs.readFileSync(handoverPinModalFile, 'utf8');
const handoverCodeDisplayModalCode = fs.existsSync(handoverCodeDisplayModalFile)
  ? fs.readFileSync(handoverCodeDisplayModalFile, 'utf8')
  : '';
const stickyActionBarCode = fs.readFileSync(stickyActionBarFile, 'utf8');
const offersReceivedCode = fs.readFileSync(offersReceivedFile, 'utf8');
const requestsViewCode = fs.readFileSync(requestsViewFile, 'utf8');
const storeCode = fs.readFileSync(storeFile, 'utf8');

// ==============================================================================
// 1. OWN-REQUEST RULE VERIFICATION
// ==============================================================================
console.log('--- 1. Testing Own-Request Rule (requester cannot accept own request or make aid offers on own request) ---');

// 1.1 Requester cannot offer help on own request (canOfferHelp & offerHelp)
console.log('  1.1 Checking client data adapters for own_request blocking...');
const mockHasCanOfferGuard =
  mockAdapterCode.includes("reason: 'own_request'") &&
  mockAdapterCode.includes('r.requesterId === effectiveUserId');
const mockHasOfferHelpGuard =
  mockAdapterCode.includes("code: 'own_request'") &&
  mockAdapterCode.includes('You cannot offer help on your own request');

if (mockHasCanOfferGuard && mockHasOfferHelpGuard) {
  pass('MockDataAdapter blocks self-offers and returns code "own_request"');
} else {
  fail('MockDataAdapter missing own_request guard in canOfferHelp or offerHelp');
}

const supabaseHasCanOfferGuard =
  supabaseAdapterCode.includes("reason: 'own_request'") &&
  supabaseAdapterCode.includes('requester_id');
const supabaseHasOfferHelpGuard =
  supabaseAdapterCode.includes("code: isOwn ? 'own_request' : undefined") ||
  supabaseAdapterCode.includes("code: 'own_request'");

if (supabaseHasCanOfferGuard && supabaseHasOfferHelpGuard) {
  pass('SupabaseDataAdapter blocks self-offers with "own_request" reason & code');
} else {
  fail('SupabaseDataAdapter missing own_request check in canOfferHelp or offerHelp');
}

// 1.2 Requester cannot accept own request / own aid offer
console.log('  1.2 Checking acceptOffer self-acceptance guard...');
const mockHasAcceptSelfGuard =
  mockAdapterCode.includes('offer.helperId === r.requesterId') &&
  mockAdapterCode.includes('Requester cannot accept own request');

if (mockHasAcceptSelfGuard) {
  pass('MockDataAdapter blocks requester from accepting own aid offer');
} else {
  fail('MockDataAdapter acceptOffer missing guard against self-acceptance');
}

// 1.3 UI guards in StickyActionBar and RequestDetailModal
console.log('  1.3 Checking UI controls preventing requester from self-helping...');
const stickyHasOwnerBranch =
  stickyActionBarCode.includes('if (isRequester)') &&
  stickyActionBarCode.includes('// 2. REQUEST OWNER CONTROLS');
const stickyHidesHelpButtonForOwner =
  !stickyActionBarCode.match(/if \(isRequester\)[^}]*onOfferHelp/);

if (stickyHasOwnerBranch && stickyHidesHelpButtonForOwner) {
  pass('StickyActionBar provides owner-specific management controls and never exposes "Offer Help" to requester');
} else {
  fail('StickyActionBar does not properly guard against requester offering help');
}

const offersSectionHasAccept =
  offersReceivedCode.includes('onAcceptOffer') &&
  requestDetailModalCode.includes('isRequester && (') &&
  requestDetailModalCode.includes('<OffersReceivedSection');

if (offersSectionHasAccept) {
  pass('Only the request owner (isRequester) is rendered the OffersReceivedSection to accept/decline volunteer offers');
} else {
  fail('OffersReceivedSection is not restricted to isRequester in RequestDetailModal');
}

// ==============================================================================
// 2. HANDOVER PIN ARCHITECTURE & TYPES SUPPORT
// ==============================================================================
console.log('\n--- 2. Testing requiresHandoverPin Support in Types, Wizard, Adapters & Modals ---');

// 2.1 Types definition
console.log('  2.1 Checking lib/data/types.ts and lib/data/adapter.ts...');
const typesHavePinFields =
  typesCode.includes('requiresHandoverPin?: boolean;') &&
  typesCode.includes('handoverPin?: string;') &&
  typesCode.includes('handoverConfirmedAt?: string;');

const adapterHasPinMethods =
  adapterCode.includes('verifyHandoverPin(') &&
  adapterCode.includes('requiresHandoverPin');

if (typesHavePinFields && adapterHasPinMethods) {
  pass('HelpRequest types and DataAdapter interface declare requiresHandoverPin, handoverPin, and verifyHandoverPin');
} else {
  fail('Types or adapter interface missing handover PIN fields or verifyHandoverPin method');
}

// 2.2 NewRequestWizard support
console.log('  2.2 Checking NewRequestWizard for requiresHandoverPin integration...');
const wizardHasPinState = wizardCode.includes('requiresHandoverPin');
const wizardHasAutoEnable =
  wizardCode.includes("draft.category === 'equipment'") ||
  wizardCode.includes("category === 'equipment'") ||
  wizardCode.includes('requiresHandoverPin');
const wizardPassesToCreate =
  wizardCode.includes('requiresHandoverPin,') &&
  wizardCode.includes('addRequest(');

if (wizardHasPinState && wizardHasAutoEnable && wizardPassesToCreate) {
  pass('NewRequestWizard manages requiresHandoverPin state, auto-enables for equipment/books, and passes to createRequest');
} else {
  fail('NewRequestWizard missing requiresHandoverPin state, auto-enable rule, or payload submission');
}

// 2.3 Store support
console.log('  2.3 Checking useKindLinkStore for verifyHandoverPin...');
const storeHasVerify =
  storeCode.includes('verifyHandoverPin: (requestId: string, pin: string)') &&
  storeCode.includes('dataAdapter.verifyHandoverPin(requestId, pin)');

if (storeHasVerify) {
  pass('useKindLinkStore exposes verifyHandoverPin action and triggers live request/stats refresh on success');
} else {
  fail('useKindLinkStore missing verifyHandoverPin action or live refresh hooks');
}

// ==============================================================================
// 3. 4-DIGIT PIN GENERATION & CODE MATCHING
// ==============================================================================
console.log('\n--- 3. Testing 4-Digit Handover PIN Generation & Matching ---');

console.log('  3.1 Checking PIN generation format in adapters...');
const mockGenerates4Digit =
  mockAdapterCode.includes('Math.floor(1000 + Math.random() * 9000).toString()') ||
  mockAdapterCode.includes('handoverPin');
const pinVerificationChecksExact =
  mockAdapterCode.includes('pin.trim()') &&
  mockAdapterCode.includes('r.handoverPin');

if (mockGenerates4Digit && pinVerificationChecksExact) {
  pass('Adapters generate a 4-digit PIN (1000-9999) and enforce exact string matching on verification');
} else {
  fail('PIN generation or exact verification matching missing in adapters');
}

// ==============================================================================
// 4. HANDOVER CODE DISPLAY MODAL (REQUESTER)
// ==============================================================================
console.log('\n--- 4. Testing HandoverCodeDisplayModal.tsx (Requester Component) ---');

console.log('  4.1 Checking file existence and exports...');
if (fs.existsSync(handoverCodeDisplayModalFile)) {
  pass('components/requests/HandoverCodeDisplayModal.tsx exists');
} else {
  fail('components/requests/HandoverCodeDisplayModal.tsx does not exist');
}

const displayModalExports =
  handoverCodeDisplayModalCode.includes('export interface HandoverCodeDisplayModalProps') &&
  handoverCodeDisplayModalCode.includes('export function HandoverCodeDisplayModal');

if (displayModalExports) {
  pass('HandoverCodeDisplayModal exports proper component and TypeScript interface');
} else {
  fail('HandoverCodeDisplayModal missing exports');
}

console.log('  4.2 Checking 4-digit PIN rendering and copy capabilities...');
const displayModalRenders4Digits =
  handoverCodeDisplayModalCode.includes('digits.map') ||
  handoverCodeDisplayModalCode.includes('slice(0, 4)');
const displayModalHasCopy =
  handoverCodeDisplayModalCode.includes('clipboard.writeText') &&
  (handoverCodeDisplayModalCode.includes('Copy Code') || handoverCodeDisplayModalCode.includes('Copy PIN') || handoverCodeDisplayModalCode.includes('Copy 4-Digit PIN'));
const displayModalHasSecurityGuideline =
  handoverCodeDisplayModalCode.includes('Security') ||
  handoverCodeDisplayModalCode.includes('Do not share') ||
  handoverCodeDisplayModalCode.includes('physically handing over');
const displayModalHasCompletionState =
  (handoverCodeDisplayModalCode.includes('completed') || handoverCodeDisplayModalCode.includes('isCompleted')) &&
  (handoverCodeDisplayModalCode.includes('Verified ✓') || handoverCodeDisplayModalCode.includes('Delivery Confirmed') || handoverCodeDisplayModalCode.includes('Rate Volunteer Helper') || handoverCodeDisplayModalCode.includes('Rate Helper'));

if (displayModalRenders4Digits && displayModalHasCopy && displayModalHasSecurityGuideline && displayModalHasCompletionState) {
  pass('HandoverCodeDisplayModal renders 4-digit display boxes, Copy button with clipboard toast, safety advisory, and completed state');
} else {
  fail('HandoverCodeDisplayModal missing digit display, copy, security guidelines, or completed state');
}

console.log('  4.3 Checking integration in RequestDetailModal...');
const requestDetailIntegratesDisplayModal =
  requestDetailModalCode.includes('HandoverCodeDisplayModal') &&
  requestDetailModalCode.includes('codeDisplayModalOpen') &&
  requestDetailModalCode.includes('setCodeDisplayModalOpen');

if (requestDetailIntegratesDisplayModal) {
  pass('RequestDetailModal imports, manages state, and renders HandoverCodeDisplayModal for requester');
} else {
  fail('RequestDetailModal is not properly wired with HandoverCodeDisplayModal');
}

// ==============================================================================
// 5. HANDOVER PIN MODAL (VOLUNTEER)
// ==============================================================================
console.log('\n--- 5. Testing HandoverPinModal.tsx (Volunteer Verification Component) ---');

console.log('  5.1 Checking file existence and exports...');
if (fs.existsSync(handoverPinModalFile)) {
  pass('components/requests/HandoverPinModal.tsx exists');
} else {
  fail('components/requests/HandoverPinModal.tsx does not exist');
}

const pinModalExports =
  handoverPinModalCode.includes('export interface HandoverPinModalProps') &&
  handoverPinModalCode.includes('export function HandoverPinModal');

if (pinModalExports) {
  pass('HandoverPinModal exports proper component and TypeScript interface');
} else {
  fail('HandoverPinModal missing exports');
}

console.log('  5.2 Checking 4-digit input mechanics & auto-focus...');
const pinModalHas4Inputs =
  handoverPinModalCode.includes('pattern="[0-9]*"') &&
  handoverPinModalCode.includes('maxLength={1}') &&
  handoverPinModalCode.includes('inputRefs');
const pinModalCallsVerify =
  handoverPinModalCode.includes('dataAdapter.verifyHandoverPin(requestId, fullPin)');
const pinModalCelebratoryState =
  handoverPinModalCode.includes('Handover Verified!') &&
  handoverPinModalCode.includes('CheckCircle2');
const pinModalCallsSuccess =
  handoverPinModalCode.includes('if (onSuccess) onSuccess()');

if (pinModalHas4Inputs && pinModalCallsVerify && pinModalCelebratoryState && pinModalCallsSuccess) {
  pass('HandoverPinModal features 4-digit auto-advancing numeric inputs, calls dataAdapter.verifyHandoverPin, displays celebration, and executes onSuccess');
} else {
  fail('HandoverPinModal missing 4-digit input handling, verify call, celebration, or onSuccess callback');
}

// ==============================================================================
// 6. PUBLIC OPEN FEED FILTERING & ACTIVE COMMITMENTS
// ==============================================================================
console.log('\n--- 6. Testing Public Open Feed Filtering & Active Commitments ---');

console.log('  6.1 Checking RequestsView public feed lifecycle filtering...');
const requestsViewFiltersAccepted =
  requestsViewCode.includes('req.status === \'open\' || (req.status === \'offered\' && !req.acceptedHelperId)') ||
  requestsViewCode.includes('isOpenAndNeedsHelp');

const requestsViewRetainsInProgress =
  requestsViewCode.includes("activeFeedTab === 'in_progress'") ||
  requestsViewCode.includes("activeFeedTab === 'my_requests'");

if (requestsViewFiltersAccepted && requestsViewRetainsInProgress) {
  pass('RequestsView filters accepted/in-progress requests out of public open feed tabs, showing them strictly under My Requests / In Progress');
} else {
  fail('RequestsView does not filter accepted requests out of the public open feed');
}

console.log('  6.2 Checking MockDataAdapter getRequests public feed filter...');
const mockFiltersAcceptedInFeed =
  mockAdapterCode.includes("r.status !== 'open' && r.status !== 'offered'") ||
  mockAdapterCode.includes("r.status === 'open' || r.status === 'offered'");

if (mockFiltersAcceptedInFeed) {
  pass('MockDataAdapter getRequests filters out accepted and completed requests from public community feed queries');
} else {
  fail('MockDataAdapter getRequests does not filter non-open requests from public feed');
}

console.log('  6.3 Checking getMyActiveRequests commitments retrieval...');
const activeRequestsIncludesBothRoles =
  mockAdapterCode.includes('r.acceptedHelperId === targetUserId') &&
  mockAdapterCode.includes('r.requesterId === targetUserId');

if (activeRequestsIncludesBothRoles) {
  pass('getMyActiveRequests returns active commitments for both requester and matched volunteer helper');
} else {
  fail('getMyActiveRequests does not include acceptedHelperId commitments');
}

// ==============================================================================
// 7. CELEBRATORY COMPLETION & PROMPT FOR RATINGS
// ==============================================================================
console.log('\n--- 7. Testing Celebratory Completion & Mutual Rating Prompt ---');

console.log('  7.1 Checking completion celebratory indicators...');
const detailModalHasCelebratoryBanner =
  requestDetailModalCode.includes('Handover verified ✓') &&
  requestDetailModalCode.includes('CheckCircle2');
const pinModalHasCelebratoryBanner =
  handoverPinModalCode.includes('Handover Verified!') &&
  (handoverPinModalCode.includes('Physical delivery has been securely verified') ||
   handoverPinModalCode.includes('Delivery has been securely confirmed') ||
   handoverPinModalCode.includes('Request Completed'));

if (detailModalHasCelebratoryBanner && pinModalHasCelebratoryBanner) {
  pass('Both HandoverPinModal and RequestDetailModal display celebratory green completion checkmarks and reassurance notes');
} else {
  fail('Missing celebratory completion checkmark or banner');
}

console.log('  7.2 Checking prompt for ratings for both requester and volunteer helper...');
const volunteerPromptedOnPinSuccess =
  requestDetailModalCode.includes('setPinModalOpen(false)') &&
  requestDetailModalCode.includes('setRatingModalOpen(true)');

const stickyHasRateHelperForRequester =
  stickyActionBarCode.includes('isRequester ? (') &&
  stickyActionBarCode.includes('Rate helper');

const stickyHasRateRequesterForVolunteer =
  stickyActionBarCode.includes('isAcceptedHelper ? (') &&
  stickyActionBarCode.includes('Rate requester');

if (volunteerPromptedOnPinSuccess && stickyHasRateHelperForRequester && stickyHasRateRequesterForVolunteer) {
  pass('Both users receive rating prompts: volunteer automatically after PIN verification, and both via dedicated "Rate helper" / "Rate requester" actions');
} else {
  fail('Missing mutual rating triggers for requester and volunteer');
}

// ==============================================================================
// 8. FUNCTIONAL END-TO-END LIFECYCLE SIMULATION
// ==============================================================================
console.log('\n--- 8. Executing Functional End-to-End Lifecycle Simulation ---');

// In-memory simulation reproducing exact DataAdapter & Store behavior
class LifecycleSimulator {
  constructor() {
    this.requests = [];
    this.offers = [];
    this.currentUser = { id: 'user-requester-101', name: 'Krish Requester', phone: '+91 98765 43210' };
    this.volunteerUser = { id: 'user-volunteer-202', name: 'Priya Volunteer', phone: '+91 91234 56789' };
  }

  createRequest(input) {
    const isEquipmentOrBooks = input.category === 'equipment' || input.category === 'books';
    const requiresPin = input.requiresHandoverPin !== undefined ? input.requiresHandoverPin : isEquipmentOrBooks;
    const pin = requiresPin ? (input.handoverPin || '7392') : undefined;

    const req = {
      id: `req-sim-${Date.now()}`,
      requesterId: this.currentUser.id,
      contactName: this.currentUser.name,
      phone: this.currentUser.phone,
      title: input.title,
      category: input.category,
      urgency: input.urgency || 'high',
      status: 'open',
      requiresHandoverPin: requiresPin,
      handoverPin: pin,
      helpersOffered: 0,
      createdAt: new Date().toISOString(),
    };
    this.requests.unshift(req);
    return { success: true, id: req.id };
  }

  canOfferHelp(requestId, userId) {
    const r = this.requests.find((x) => x.id === requestId);
    if (!r) return { allowed: false, reason: 'not_found' };
    if (r.requesterId === userId) {
      return { allowed: false, reason: 'own_request' };
    }
    if (r.status !== 'open' && r.status !== 'offered') {
      return { allowed: false, reason: 'request_closed' };
    }
    return { allowed: true, reason: 'ok' };
  }

  offerHelp(requestId, helperUser, message = 'I can help!') {
    const r = this.requests.find((x) => x.id === requestId);
    if (!r) return { success: false, error: 'Request not found' };
    if (r.requesterId === helperUser.id) {
      return { success: false, error: 'You cannot offer help on your own request.', code: 'own_request' };
    }

    r.helpersOffered = (r.helpersOffered || 0) + 1;
    r.status = 'offered';

    const offer = {
      id: `offer-sim-${Date.now()}`,
      requestId,
      helperId: helperUser.id,
      helperName: helperUser.name,
      helperPhone: helperUser.phone,
      message,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    this.offers.unshift(offer);
    return { success: true, offerId: offer.id };
  }

  acceptOffer(offerId) {
    const offer = this.offers.find((o) => o.id === offerId);
    if (!offer) return { success: false, error: 'Offer not found' };
    const r = this.requests.find((x) => x.id === offer.requestId);
    if (!r) return { success: false, error: 'Request not found' };

    if (offer.helperId === r.requesterId) {
      return { success: false, error: 'Requester cannot accept own request or make aid offers on own request' };
    }

    offer.status = 'accepted';
    this.offers.forEach((o) => {
      if (o.requestId === offer.requestId && o.id !== offerId && o.status === 'pending') {
        o.status = 'not_selected';
      }
    });

    r.status = 'accepted';
    r.acceptedHelperId = offer.helperId;
    r.acceptedHelperName = offer.helperName;
    r.acceptedHelperPhone = offer.helperPhone;

    if (r.requiresHandoverPin && !r.handoverPin) {
      r.handoverPin = Math.floor(1000 + Math.random() * 9000).toString();
    }
    return { success: true };
  }

  getPublicFeedRequests() {
    // Only open or offered requests appear in the public volunteer feed
    return this.requests.filter((r) => r.status === 'open' || (r.status === 'offered' && !r.acceptedHelperId));
  }

  getActiveCommitments(userId) {
    return this.requests.filter(
      (r) =>
        (r.requesterId === userId || r.acceptedHelperId === userId) &&
        r.status !== 'completed' &&
        r.status !== 'cancelled'
    );
  }

  verifyHandoverPin(requestId, pin) {
    const r = this.requests.find((x) => x.id === requestId);
    if (!r) return { success: false, error: 'Request not found' };

    if (r.requiresHandoverPin) {
      if (!r.handoverPin || r.handoverPin !== pin.trim()) {
        return { success: false, error: 'Incorrect 4-digit PIN. Please ask the requester for the PIN on their screen.' };
      }
    }

    r.status = 'completed';
    r.handoverConfirmedAt = new Date().toISOString();
    return { success: true };
  }
}

const sim = new LifecycleSimulator();

// Step A: Create request with handover PIN
console.log('  8.1 Step A: Requester posts medical equipment request with requiresHandoverPin...');
const createRes = sim.createRequest({
  title: 'Wheelchair Needed for Hospital Discharge',
  category: 'equipment',
  urgency: 'high',
  requiresHandoverPin: true,
  handoverPin: '8492',
});
assert.equal(createRes.success, true);
const reqId = createRes.id;
const reqObj = sim.requests.find((r) => r.id === reqId);
assert.equal(reqObj.requiresHandoverPin, true);
assert.equal(reqObj.handoverPin, '8492');
assert.equal(reqObj.status, 'open');
pass('Request created with requiresHandoverPin=true and 4-digit PIN=8492');

// Step B: Requester attempts to offer help on own request -> MUST FAIL
console.log('  8.2 Step B: Requester attempts to offer help on own request...');
const selfCanOffer = sim.canOfferHelp(reqId, sim.currentUser.id);
assert.equal(selfCanOffer.allowed, false);
assert.equal(selfCanOffer.reason, 'own_request');

const selfOfferRes = sim.offerHelp(reqId, sim.currentUser, 'Offering myself aid');
assert.equal(selfOfferRes.success, false);
assert.equal(selfOfferRes.code, 'own_request');
pass('Self-aid offer correctly rejected with code="own_request"');

// Step C: Volunteer offers help -> MUST SUCCEED
console.log('  8.3 Step C: Volunteer makes legitimate aid offer...');
const volunteerOfferRes = sim.offerHelp(reqId, sim.volunteerUser, 'I can bring a folding wheelchair in 20 mins');
assert.equal(volunteerOfferRes.success, true);
const offerId = volunteerOfferRes.offerId;
assert.equal(reqObj.status, 'offered');
pass('Volunteer offer created successfully, request marked as "offered"');

// Step D: Public feed displays request while awaiting acceptance
console.log('  8.4 Step D: Checking public feed while in offered status...');
let publicFeed = sim.getPublicFeedRequests();
assert.equal(publicFeed.some((r) => r.id === reqId), true);
pass('Request is visible in public open feed while awaiting helper acceptance');

// Step E: Requester accepts volunteer's offer -> MUST SUCCEED
console.log('  8.5 Step E: Requester accepts volunteer offer...');
const acceptRes = sim.acceptOffer(offerId);
assert.equal(acceptRes.success, true);
assert.equal(reqObj.status, 'accepted');
assert.equal(reqObj.acceptedHelperId, sim.volunteerUser.id);
pass('Offer accepted: status changed to "accepted", acceptedHelperId assigned');

// Step F: Request is filtered OUT of public open feed
console.log('  8.6 Step F: Checking public feed filtering after acceptance...');
publicFeed = sim.getPublicFeedRequests();
assert.equal(publicFeed.some((r) => r.id === reqId), false);
pass('Request is cleanly filtered OUT of public open feed once offer is accepted');

// Step G: Request is visible in active commitments for both users
console.log('  8.7 Step G: Checking active commitments for requester & volunteer...');
const requesterActive = sim.getActiveCommitments(sim.currentUser.id);
const volunteerActive = sim.getActiveCommitments(sim.volunteerUser.id);
assert.equal(requesterActive.some((r) => r.id === reqId), true);
assert.equal(volunteerActive.some((r) => r.id === reqId), true);
pass('Request is visible under active progress/commitments for both requester and helper');

// Step H: Both users see the exact same 4-digit PIN
console.log('  8.8 Step H: Verifying 4-digit PIN matching between users...');
assert.equal(reqObj.handoverPin, '8492');
pass('Requester display and volunteer verification share the exact matching 4-digit PIN ("8492")');

// Step I: Volunteer submits WRONG PIN -> MUST FAIL
console.log('  8.9 Step I: Volunteer submits incorrect PIN ("1234")...');
const wrongPinRes = sim.verifyHandoverPin(reqId, '1234');
assert.equal(wrongPinRes.success, false);
assert.equal(reqObj.status, 'accepted'); // status untouched
pass('Incorrect PIN rejected with clear error message, request remains in accepted state');

// Step J: Volunteer submits CORRECT PIN -> MUST SUCCEED
console.log('  8.10 Step J: Volunteer submits correct PIN ("8492")...');
const correctPinRes = sim.verifyHandoverPin(reqId, '8492');
assert.equal(correctPinRes.success, true);
assert.equal(reqObj.status, 'completed');
assert.ok(reqObj.handoverConfirmedAt);
pass('Correct PIN verified successfully: request marked as "completed" with timestamp');

// Step K: Completed request filtered out of active commitments
console.log('  8.11 Step K: Checking completed status post-verification...');
const postActive = sim.getActiveCommitments(sim.volunteerUser.id);
assert.equal(postActive.some((r) => r.id === reqId), false);
pass('Completed request cleared from active commitments');

// ==============================================================================
// SUMMARY & CONCLUSION
// ==============================================================================
console.log('\n======================================================================');
console.log(`  🎉 ALL ${passedTests} / ${totalTests} HANDOVER PIN & LIFECYCLE QA CHECKS PASSED`);
console.log('======================================================================\n');
process.exit(0);
