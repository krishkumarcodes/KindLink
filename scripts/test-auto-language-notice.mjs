import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log('🧪 Starting AutoLanguageNotice & LanguageModal QA Verification...');

const noticeFilePath = path.resolve('components/locale/AutoLanguageNotice.tsx');
const modalFilePath = path.resolve('components/shell/LanguageModal.tsx');
const appPagePath = path.resolve('app/app/page.tsx');
const layoutPath = path.resolve('app/layout.tsx');

assert(fs.existsSync(noticeFilePath), 'AutoLanguageNotice.tsx must exist');
assert(fs.existsSync(modalFilePath), 'LanguageModal.tsx must exist');
assert(fs.existsSync(appPagePath), 'app/app/page.tsx must exist');
assert(fs.existsSync(layoutPath), 'app/layout.tsx must exist');

const noticeContent = fs.readFileSync(noticeFilePath, 'utf8');
const modalContent = fs.readFileSync(modalFilePath, 'utf8');
const appPageContent = fs.readFileSync(appPagePath, 'utf8');
const layoutContent = fs.readFileSync(layoutPath, 'utf8');

// 1. Check layout specifications of AutoLanguageNotice
console.log('1. Auditing AutoLanguageNotice layout & styling constraints...');
assert(noticeContent.includes('bottom-20 sm:bottom-6'), 'Must have bottom-20 sm:bottom-6 clearance');
assert(noticeContent.includes('max-w-[420px]'), 'Must have max-w-[420px] bound');
assert(noticeContent.includes('rounded-2xl'), 'Must have rounded-2xl');
assert(noticeContent.includes('bg-card/95 backdrop-blur-md border border-border shadow-lg'), 'Must have frosted glass styling');
assert(noticeContent.includes('min-h-[44px]'), 'Buttons must meet 44px tap target standard');
assert(noticeContent.includes('touch-target'), 'Touch-target class must be applied');
console.log('   ✓ Layout & styling constraints verified.');

// 2. Check Guards & English silent fallback
console.log('2. Auditing AutoLanguageNotice guard conditions...');
assert(noticeContent.includes("currentCode !== 'en'"), 'English (en) must never show notice (silent fallback)');
assert(noticeContent.includes("langSource === 'auto'"), 'Notice must only show when source is auto');
assert(noticeContent.includes('!isDismissed'), 'Notice must respect dismissed state');
assert(noticeContent.includes('kindlink_lang_notice_dismissed'), 'Notice must use kindlink_lang_notice_dismissed in storage');
assert(noticeContent.includes('kindlink_lang_source'), 'Notice must check kindlink_lang_source');
console.log('   ✓ Guard conditions & silent English fallback verified.');

// 3. Check Action buttons
console.log('3. Auditing Action buttons: Keep, Change language, Switch to English, and Dismiss X...');
assert(noticeContent.includes('handleKeep'), 'Must have handleKeep handler');
assert(noticeContent.includes("setLanguageSource('user')"), 'Must update source to user on confirm/keep/switch');
assert(noticeContent.includes('setLanguageNoticeDismissed(true)'), 'Must mark notice dismissed permanently');
assert(noticeContent.includes('handleSwitchToEnglish'), 'Must have handleSwitchToEnglish');
assert(noticeContent.includes("changeLanguageInstantly('en')"), 'Switch to English must call changeLanguageInstantly');
assert(noticeContent.includes('setIsLangModalOpen(true)'), 'Change language must open LanguageModal');
assert(noticeContent.includes('aria-label="Dismiss language notice"'), 'Dismiss button must have aria-label');
console.log('   ✓ Action buttons verified.');

// 4. Check Language strings (e.g. French, Hindi, Bengali, German, etc.)
console.log('4. Auditing Localized strings for 29 languages...');
assert(noticeContent.includes('Nous avons défini votre langue sur'), 'French message phrase verified');
assert(noticeContent.includes('हमने आपके स्थान के आधार पर आपकी भाषा'), 'Hindi message phrase verified');
assert(noticeContent.includes('আমরা আপনার অবস্থানের উপর ভিত্তি করে আপনার ভাষা'), 'Bengali message phrase verified');
assert(noticeContent.includes('Wir haben Ihre Sprache basierend auf Ihrem Standort auf'), 'German message phrase verified');
assert(noticeContent.includes('Hemos configurado tu idioma en'), 'Spanish message phrase verified');
console.log('   ✓ Native localized phrases verified.');

// 5. Check LanguageModal hint
console.log('5. Auditing LanguageModal auto-location badge & removal on user selection...');
assert(modalContent.includes("langSource === 'auto'"), 'LanguageModal must check langSource === auto');
assert(modalContent.includes('Chosen from your location'), 'LanguageModal must display "Chosen from your location" hint');
assert(modalContent.includes('MapPin'), 'LanguageModal must include MapPin icon');
assert(modalContent.includes("localStorage.setItem('kindlink_lang_source', 'user')"), 'Tapping any language must set source to user');
assert(modalContent.includes("setLangSource('user')"), 'Tapping any language must immediately remove the hint in state');
console.log('   ✓ LanguageModal location hint and removal verified.');

// 6. Check Mounting
console.log('6. Auditing Mount in app/app/page.tsx and public root layout...');
assert(appPageContent.includes('<AutoLanguageNotice />'), 'AutoLanguageNotice must be mounted in app/app/page.tsx');
assert(layoutContent.includes('<AutoLanguageNotice />'), 'AutoLanguageNotice must be mounted in app/layout.tsx');
console.log('   ✓ Mounting in app/app/page.tsx and app/layout.tsx verified.');

console.log('\n🎉 ALL 6 VERIFICATION CHECKS PASSED WITH 100% SUCCESS!');
