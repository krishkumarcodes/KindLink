'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Check, Globe, X, MapPin, RotateCcw } from 'lucide-react';
import {
  SUPPORTED_LANGUAGES,
  LanguageOption,
  changeLanguageInstantly,
  getCurrentLanguageCode,
} from '@/lib/translate/googleTranslate';
import { LanguageModal } from '@/components/shell/LanguageModal';

export const LANG_NOTICE_DISMISSED_KEY = 'kindlink_lang_notice_dismissed';
export const LANG_SOURCE_KEY = 'kindlink_lang_source';

export function getLanguageSource(): 'auto' | 'user' | null {
  if (typeof window === 'undefined') return null;
  try {
    const val = localStorage.getItem(LANG_SOURCE_KEY);
    if (val === 'auto' || val === 'user') return val;
  } catch {}
  return null;
}

export function setLanguageSource(source: 'auto' | 'user') {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LANG_SOURCE_KEY, source);
    window.dispatchEvent(
      new CustomEvent('kindlink:lang-source-change', { detail: { source } })
    );
  } catch {}
}

export function isLanguageNoticeDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(LANG_NOTICE_DISMISSED_KEY) === 'true';
  } catch {}
  return false;
}

export function setLanguageNoticeDismissed(dismissed = true) {
  if (typeof window === 'undefined') return;
  try {
    if (dismissed) {
      localStorage.setItem(LANG_NOTICE_DISMISSED_KEY, 'true');
    } else {
      localStorage.removeItem(LANG_NOTICE_DISMISSED_KEY);
    }
    window.dispatchEvent(
      new CustomEvent('kindlink:lang-notice-dismissed-change', { detail: { dismissed } })
    );
  } catch {}
}

/**
 * Localized copy for notice in all 29 supported languages.
 * High-quality native phrases ensure natural language tone before/without
 * waiting for external script transformations.
 */
interface LocalizedNoticeCopy {
  message: (langName: string) => string;
  keep: string;
  change: string;
  english: string;
  badge: string;
}

const LOCALIZED_NOTICE_STRINGS: Record<string, LocalizedNoticeCopy> = {
  hi: {
    message: (name) => `हमने आपके स्थान के आधार पर आपकी भाषा ${name} सेट की है।`,
    keep: 'रखें',
    change: 'भाषा बदलें',
    english: 'English में बदलें',
    badge: 'स्थान आधारित भाषा',
  },
  bn: {
    message: (name) => `আমরা আপনার অবস্থানের উপর ভিত্তি করে আপনার ভাষা ${name} নির্ধারণ করেছি।`,
    keep: 'রাখুন',
    change: 'ভাষা পরিবর্তন',
    english: 'English এ পরিবর্তন',
    badge: 'অবস্থান ভিত্তিক ভাষা',
  },
  bho: {
    message: (name) => `हम रउआ जगह के आधार पर रउआ भाषा ${name} सेट कइले बानी।`,
    keep: 'राखीं',
    change: 'भाषा बदलीं',
    english: 'English में बदलीं',
    badge: 'स्थान आधारित भाषा',
  },
  mai: {
    message: (name) => `हम अहाँक स्थानक आधार पर अहाँक भाषा ${name} सेट कएने छी।`,
    keep: 'राखू',
    change: 'भाषा बदलू',
    english: 'English में बदलू',
    badge: 'स्थान आधारित भाषा',
  },
  ne: {
    message: (name) => `हामीले तपाईंको स्थानको आधारमा तपाईंको भाषा ${name} सेट गरेका छौं।`,
    keep: 'राख्नुहोस्',
    change: 'भाषा बदल्नुहोस्',
    english: 'English मा बदल्नुहोस्',
    badge: 'स्थान आधारित भाषा',
  },
  ur: {
    message: (name) => `ہم نے آپ کے مقام کی بنیاد پر آپ کی زبان ${name} مقرر کی ہے۔`,
    keep: 'رکھیں',
    change: 'زبان تبدیل کریں',
    english: 'English میں تبدیل کریں',
    badge: 'مقام پر مبنی زبان',
  },
  sat: {
    message: (name) => `ᱟᱞᱮ ᱟᱢᱟᱜ ᱴᱷᱟᱶ ᱞᱮᱠᱟᱛᱮ ᱟᱢᱟᱜ ᱯᱟᱹᱨᱥᱤ ${name} ᱥᱮᱴ ᱠᱮᱫᱟ᱾`,
    keep: 'ᱫᱚᱦᱚᱭ ᱢᱮ',
    change: 'ᱯᱟᱹᱨᱥᱤ ᱵᱚᱫᱚᱞ',
    english: 'English ᱛᱮ ᱵᱚᱫᱚᱞ',
    badge: 'ᱴᱷᱟᱶ ᱞᱮᱠᱟᱛᱮ ᱯᱟᱹᱨᱥᱤ',
  },
  or: {
    message: (name) => `ଆମେ ଆପଣଙ୍କ ଅବସ୍ଥାନ ଆଧାରରେ ଆପଣଙ୍କ ଭାଷା ${name} ସେଟ୍ କରିଛୁ।`,
    keep: 'ରଖନ୍ତୁ',
    change: 'ଭାଷା ବଦଳାନ୍ତୁ',
    english: 'English କୁ ବଦଳାନ୍ତୁ',
    badge: 'ସ୍ଥାନ ଆଧାରିତ ଭାଷା',
  },
  as: {
    message: (name) => `আমি আপোনাৰ স্থানৰ ভিত্তিত আপোনাৰ ভাষা ${name} নিৰ্ধাৰণ কৰিছো।`,
    keep: 'ৰাখক',
    change: 'ভাষা সলনি কৰক',
    english: 'English লৈ সলনি কৰক',
    badge: 'স্থান ভিত্তিক ভাষা',
  },
  mr: {
    message: (name) => `आम्ही तुमच्या स्थानानुसार तुमची भाषा ${name} सेट केली आहे.`,
    keep: 'ठेवा',
    change: 'भाषा बदला',
    english: 'English मध्ये बदला',
    badge: 'स्थान आधारित भाषा',
  },
  gu: {
    message: (name) => `અમે તમારા સ્થાનના આધારે તમારી ભાષા ${name} સેટ કરી છે.`,
    keep: 'રાખો',
    change: 'ભાષા બદલો',
    english: 'English માં બદલો',
    badge: 'સ્થાન આધારિત ભાષા',
  },
  pa: {
    message: (name) => `ਅਸੀਂ ਤੁਹਾਡੇ ਟਿਕਾਣੇ ਦੇ ਆਧਾਰ 'ਤੇ ਤੁਹਾਡੀ ਭਾਸ਼ਾ ${name} ਸੈੱਟ ਕੀਤੀ ਹੈ।`,
    keep: 'ਰੱਖੋ',
    change: 'ਭਾਸ਼ਾ ਬਦਲੋ',
    english: 'English ਵਿੱਚ ਬਦਲੋ',
    badge: 'ਸਥਾਨ ਆਧਾਰਿਤ ਭਾਸ਼ਾ',
  },
  ta: {
    message: (name) => `உங்கள் இருப்பிடத்தின் அடிப்படையில் உங்கள் மொழியை ${name} என அமைத்துள்ளோம்.`,
    keep: 'வைத்திரு',
    change: 'மொழியை மாற்று',
    english: 'English க்கு மாற்று',
    badge: 'இருப்பிடம் சார்ந்த மொழி',
  },
  te: {
    message: (name) => `మీ స్థానం ఆధారంగా మేము మీ భాషను ${name}గా సెట్ చేసాము.`,
    keep: 'ఉంచండి',
    change: 'భాష మార్చండి',
    english: 'English కి మార్చండి',
    badge: 'స్థానం ఆధారిత భాష',
  },
  kn: {
    message: (name) => `ನಿಮ್ಮ ಸ್ಥಳದ ಆಧಾರದ ಮೇಲೆ ನಾವು ನಿಮ್ಮ ಭಾಷೆಯನ್ನು ${name} ಎಂದು ಹೊಂದಿಸಿದ್ದೇವೆ.`,
    keep: 'ಇರಿಸಿಕೊಳ್ಳಿ',
    change: 'ಭಾಷೆ ಬದಲಾಯಿಸಿ',
    english: 'English ಗೆ ಬದಲಾಯಿಸಿ',
    badge: 'ಸ್ಥಳ ಆಧಾರಿತ ಭಾಷೆ',
  },
  ml: {
    message: (name) => `നിങ്ങളുടെ ലൊക്കേഷൻ അടിസ്ഥാനമാക്കി ഞങ്ങൾ നിങ്ങളുടെ ഭാഷ ${name} ആയി സജ്ജീകരിച്ചിരിക്കുന്നു.`,
    keep: 'നിലനിർത്തുക',
    change: 'ഭാഷ മാറ്റുക',
    english: 'English ലേക്ക് മാറ്റുക',
    badge: 'ലൊക്കേഷൻ അടിസ്ഥാനമാക്കിയുള്ള ഭാഷ',
  },
  fr: {
    message: (name) => `Nous avons défini votre langue sur ${name} en fonction de votre position.`,
    keep: 'Conserver',
    change: 'Changer de langue',
    english: 'Passer à l’anglais',
    badge: 'Langue automatique',
  },
  es: {
    message: (name) => `Hemos configurado tu idioma en ${name} según tu ubicación.`,
    keep: 'Mantener',
    change: 'Cambiar idioma',
    english: 'Cambiar a inglés',
    badge: 'Idioma automático',
  },
  de: {
    message: (name) => `Wir haben Ihre Sprache basierend auf Ihrem Standort auf ${name} eingestellt.`,
    keep: 'Behalten',
    change: 'Sprache ändern',
    english: 'Zu Englisch wechseln',
    badge: 'Automatische Sprache',
  },
  pt: {
    message: (name) => `Definimos seu idioma como ${name} com base na sua localização.`,
    keep: 'Manter',
    change: 'Mudar idioma',
    english: 'Mudar para inglês',
    badge: 'Idioma automático',
  },
  it: {
    message: (name) => `Abbiamo impostato la tua lingua su ${name} in base alla tua posizione.`,
    keep: 'Mantieni',
    change: 'Cambia lingua',
    english: 'Passa all’inglese',
    badge: 'Lingua automatica',
  },
  ru: {
    message: (name) => `Мы установили ваш язык на ${name} на основе вашего местоположения.`,
    keep: 'Оставить',
    change: 'Сменить язык',
    english: 'Переключить на английский',
    badge: 'Язык по локации',
  },
  'zh-CN': {
    message: (name) => `我们已根据您的位置将语言设置为${name}。`,
    keep: '保留',
    change: '更改语言',
    english: '切换为英文',
    badge: '根据位置推荐',
  },
  ja: {
    message: (name) => `あなたの現在地に基づいて言語を${name}に設定しました。`,
    keep: '維持する',
    change: '言語を変更',
    english: '英語に切り替える',
    badge: '位置情報による言語',
  },
  ko: {
    message: (name) => `위치를 기반으로 언어를 ${name}으로 설정했습니다.`,
    keep: '유지하기',
    change: '언어 변경',
    english: '영어로 전환',
    badge: '위치 기반 언어',
  },
  ar: {
    message: (name) => `لقد قمنا بتعيين لغتك على ${name} بناءً على موقعك.`,
    keep: 'إبقاء',
    change: 'تغيير اللغة',
    english: 'التحويل إلى الإنجليزية',
    badge: 'لغة محددة تلقائياً',
  },
  id: {
    message: (name) => `Kami mengatur bahasa Anda ke ${name} berdasarkan lokasi Anda.`,
    keep: 'Pertahankan',
    change: 'Ganti bahasa',
    english: 'Beralih ke English',
    badge: 'Bahasa berbasis lokasi',
  },
  tr: {
    message: (name) => `Konumunuza göre dilinizi ${name} olarak ayarladık.`,
    keep: 'Koru',
    change: 'Dili değiştir',
    english: 'İngilizceye geç',
    badge: 'Konuma göre dil',
  },
};

const DEFAULT_NOTICE_STRINGS: LocalizedNoticeCopy = {
  message: (name) => `We set your language to ${name} based on your location.`,
  keep: 'Keep',
  change: 'Change language',
  english: 'Switch to English',
  badge: 'Location-based Language',
};

// Singleton guard ensuring only a single banner mounts if multiple layout levels include the component
let activeNoticeMounted = false;

export function AutoLanguageNotice() {
  const [mounted, setMounted] = useState(false);
  const [isPrimaryInstance, setIsPrimaryInstance] = useState(false);
  const [currentCode, setCurrentCode] = useState<string>('en');
  const [langSource, setLangSource] = useState<'auto' | 'user' | null>(null);
  const [isDismissed, setIsDismissed] = useState<boolean>(true);
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);

  // Singleton instance claim
  useEffect(() => {
    if (!activeNoticeMounted) {
      activeNoticeMounted = true;
      setIsPrimaryInstance(true);
      return () => {
        activeNoticeMounted = false;
      };
    }
  }, []);

  // Sync state from localStorage and system environment
  const syncState = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      const dismissed = localStorage.getItem(LANG_NOTICE_DISMISSED_KEY) === 'true';
      const source = localStorage.getItem(LANG_SOURCE_KEY) as 'auto' | 'user' | null;
      const code = getCurrentLanguageCode();

      setIsDismissed(dismissed);
      setLangSource(source);
      setCurrentCode(code);
    } catch {}
  }, []);

  useEffect(() => {
    setMounted(true);
    syncState();

    const handleLocaleChange = (e: Event) => {
      const custom = e as CustomEvent<{ locale: string }>;
      if (custom.detail?.locale) {
        setCurrentCode(custom.detail.locale);
      }
      syncState();
    };

    const handleSourceChange = (e: Event) => {
      const custom = e as CustomEvent<{ source: 'auto' | 'user' }>;
      if (custom.detail?.source) {
        setLangSource(custom.detail.source);
      }
      syncState();
    };

    const handleDismissedChange = () => {
      syncState();
    };

    window.addEventListener('kindlink:locale-change', handleLocaleChange);
    window.addEventListener('kindlink:lang-source-change', handleSourceChange);
    window.addEventListener('kindlink:lang-notice-dismissed-change', handleDismissedChange);
    window.addEventListener('storage', syncState);

    return () => {
      window.removeEventListener('kindlink:locale-change', handleLocaleChange);
      window.removeEventListener('kindlink:lang-source-change', handleSourceChange);
      window.removeEventListener('kindlink:lang-notice-dismissed-change', handleDismissedChange);
      window.removeEventListener('storage', syncState);
    };
  }, [syncState]);

  // Determine language details
  const currentLang = useMemo<LanguageOption | undefined>(() => {
    return SUPPORTED_LANGUAGES.find((l) => l.code === currentCode);
  }, [currentCode]);

  // Localized copy
  const copy = useMemo<LocalizedNoticeCopy>(() => {
    return LOCALIZED_NOTICE_STRINGS[currentCode] || DEFAULT_NOTICE_STRINGS;
  }, [currentCode]);

  const targetLangDisplayName = useMemo(() => {
    if (!currentLang) return 'English';
    return currentLang.nativeName || currentLang.name;
  }, [currentLang]);

  // Guard rules:
  // 1. Must be the single mounted instance
  // 2. English (en) is NEVER shown (silent fallback)
  // 3. Show once per device only (kindlink_lang_notice_dismissed === 'true' disables forever)
  // 4. Source must be 'auto' (if user explicitly chose, never render)
  const shouldRender =
    mounted &&
    isPrimaryInstance &&
    currentCode !== 'en' &&
    langSource === 'auto' &&
    !isDismissed;

  const handleKeep = () => {
    setLanguageSource('user');
    setLanguageNoticeDismissed(true);
    setIsDismissed(true);
  };

  const handleSwitchToEnglish = () => {
    setLanguageSource('user');
    setLanguageNoticeDismissed(true);
    setIsDismissed(true);
    changeLanguageInstantly('en');
  };

  const handleDismiss = () => {
    setLanguageNoticeDismissed(true);
    setIsDismissed(true);
  };

  if (!shouldRender) {
    return isLangModalOpen ? (
      <LanguageModal open={isLangModalOpen} onClose={() => setIsLangModalOpen(false)} />
    ) : null;
  }

  const isRtl = currentLang?.dir === 'rtl';

  return (
    <>
      <aside
        role="region"
        aria-label="Language selection notice"
        dir={isRtl ? 'rtl' : 'ltr'}
        className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-24px)] max-w-[420px] rounded-2xl bg-card/95 backdrop-blur-md border border-border shadow-lg p-3 sm:p-4 text-card-foreground animate-in fade-in slide-in-from-bottom-3 duration-200 select-none"
      >
        {/* Top Header Row with Location Badge and 44px Tap Target Close Button */}
        <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-border/50">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
              <MapPin className="h-3.5 w-3.5 notranslate" />
            </span>
            <span
              translate="no"
              className="notranslate text-[11px] font-bold tracking-tight text-teal-700 dark:text-teal-300 truncate"
            >
              {copy.badge}
            </span>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="flex h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center -mr-2 -mt-1 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Dismiss language notice"
          >
            <X className="h-4 w-4 notranslate" />
          </button>
        </div>

        {/* Message in detected language */}
        <div className="py-2.5">
          <p
            translate="no"
            className="notranslate text-xs sm:text-sm font-medium text-foreground/90 leading-snug break-words"
          >
            {copy.message(targetLangDisplayName)}
          </p>
        </div>

        {/* 44px Minimum Tap Target Action Buttons */}
        <div className="flex flex-col gap-2 pt-1">
          <div className="flex items-center gap-2">
            {/* Keep (confirms choice, sets source to 'user', dismisses permanently) */}
            <button
              type="button"
              onClick={handleKeep}
              className="flex-1 min-h-[44px] px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-semibold text-xs sm:text-sm shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            >
              <Check className="h-4 w-4 shrink-0 notranslate" />
              <span translate="no" className="notranslate truncate">
                {copy.keep}
              </span>
            </button>

            {/* Change language (opens LanguageModal) */}
            <button
              type="button"
              onClick={() => setIsLangModalOpen(true)}
              className="flex-1 min-h-[44px] px-3 py-2 rounded-xl border border-border bg-muted/60 hover:bg-muted active:bg-muted/90 text-foreground font-semibold text-xs sm:text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Globe className="h-4 w-4 shrink-0 text-muted-foreground notranslate" />
              <span translate="no" className="notranslate truncate">
                {copy.change}
              </span>
            </button>
          </div>

          {/* Switch to English (immediately changes to en, sets source to 'user', dismisses) */}
          <button
            type="button"
            onClick={handleSwitchToEnglish}
            className="w-full min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors flex items-center justify-center gap-1.5 touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <RotateCcw className="h-3.5 w-3.5 shrink-0 notranslate" />
            <span translate="no" className="notranslate">
              {copy.english}
            </span>
          </button>
        </div>
      </aside>

      {/* Language Modal (opened via "Change language") */}
      {isLangModalOpen && (
        <LanguageModal open={isLangModalOpen} onClose={() => setIsLangModalOpen(false)} />
      )}
    </>
  );
}
