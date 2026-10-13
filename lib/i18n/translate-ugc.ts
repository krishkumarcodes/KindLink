/**
 * Scoped User-Generated Content (UGC) Translation Engine
 * Allows translating user-submitted help request descriptions on demand
 * without letting third-party DOM widgets corrupt interactive UI buttons.
 */

// In-memory cache for user translations: key is `${requestId}_${targetLocale}`
const ugcTranslationCache = new Map<string, string>();

// Fallback high-quality curated translations for demo/mock requests in Asansol
const PRESET_UGC_TRANSLATIONS: Record<string, Record<string, string>> = {
  // Blood request description
  'Urgent requirement for 2 units of B+ blood for a patient undergoing emergency gallbladder surgery at Asansol District Hospital. Replacement donors also welcome.': {
    hi: 'आसनसोल जिला अस्पताल में आपातकालीन पित्ताशय की सर्जरी के लिए एक मरीज को तत्काल 2 यूनिट B+ रक्त की आवश्यकता है। प्रतिस्थापन दाता भी संपर्क कर सकते हैं।',
    bn: 'আসানসোল জেলা হাসপাতালে জরুরি পিত্তথলির অস্ত্রোপচারের জন্য একজন রোগীর জরুরি ভিত্তিতে ২ ইউনিট B+ রক্তের প্রয়োজন। প্রতিস্থাপন দাতাদেরও স্বাগত।',
    ur: 'آسنسول ڈسٹرکٹ ہسپتال میں ایمرجنسی پتے کی سرجری کے لیے ایک مریض کو فوری طور پر 2 یونٹ B+ خون کی ضرورت ہے۔ متبادل عطیہ دہندگان کا بھی خیر مقدم ہے۔',
    bho: 'आसनसोल जिला अस्पताल में आपातकालीन ऑपरेशन खातिर 2 यूनिट B+ खून के तुरंत दरकार बा।',
    sat: 'ᱟᱥᱟᱱᱥᱳᱞ ᱦᱟᱥᱯᱟᱛᱟᱞ ᱨᱮ ᱞᱟᱹᱠᱛᱤᱭᱟᱱ ᱚᱯᱟᱨᱮᱥᱚᱱ ᱞᱟᱹᱜᱤᱫ ᱒ ᱭᱩᱱᱤᱴ B+ ᱢᱟᱭᱟᱢ ᱞᱟᱹᱠᱛᱤ ᱠᱟᱱᱟ᱾',
  },
  // Medical equipment request description
  'Need a standard adult wheelchair for an 82-year-old grandmother who fractured her hip yesterday in Burnpur. Required for 2 weeks until post-op follow-up.': {
    hi: 'बर्नपुर में कल कूल्हे की हड्डी टूटने के बाद 82 वर्षीय दादीजी के लिए 2 सप्ताह के लिए एक व्हीलचेयर की आवश्यकता है।',
    bn: 'বার্নপুরে গতকাল নিতম্বের হাড় ভাঙার পর ৮২ বছর বয়সী ঠাকুরমার জন্য ২ সপ্তাহের জন্য একটি হুইলচেয়ারের প্রয়োজন।',
    ur: 'برن پور میں کل کولہے کی ہڈی ٹوٹنے کے بعد 82 سالہ دادی کے لیے 2 ہفتوں کے لیے وہیل چیئر کی ضرورت ہے۔',
    bho: 'बर्नपुर में 82 साल के दादी खातिर 2 हफ्ता खातिर व्हीलचेयर के जरूरत बा।',
    sat: 'ᱵᱚᱨᱱᱯᱩᱨ ᱨᱮ ᱘᱒ ᱥᱮᱨᱢᱟ ᱵᱩᱰᱷᱤ ᱞᱟᱹᱜᱤᱫ ᱒ ᱦᱟᱯᱛᱟ ᱦᱩᱭᱩᱜ ᱵᱷᱤᱞᱪᱮᱭᱟᱨ ᱞᱟᱹᱠᱛᱤ ᱠᱟᱱᱟ᱾',
  },
  // Elder care grocery request
  'Elderly couple in Kalyanpur Satellite Township unable to walk to the grocery store due to high fever. Need basic ration kit (atta, rice, dal, milk, paracetamol).': {
    hi: 'कल्याणपुर सैटेलाइट टाउनशिप में तेज बुखार के कारण बुजुर्ग दंपत्ति किराना स्टोर जाने में असमर्थ हैं। बुनियादी राशन (आटा, चावल, दाल, दूध, पैरासिटामोल) की आवश्यकता है।',
    bn: 'কল্যাণপুর স্যাটেলাইট টাউনশিপে তীব্র জ্বরের কারণে প্রবীণ দম্পতি দোকানে যেতে পারছেন না। নিত্যপ্রয়োজনীয় রেশন (আটা, চাল, ডাল, দুধ, প্যারাসিটামল) প্রয়োজন।',
    ur: 'کلیان پور سیٹلائٹ ٹاؤن شپ میں تیز بخار کی وجہ سے بزرگ جوڑا راشن لانے سے قاصر ہے۔ بنیادی راشن اور پیراسیٹامول کی ضرورت ہے۔',
    bho: 'कल्याणपुर में तेज बुखार से परेशान बुजुर्ग खातिर राशन आ दवाई के मदद चाहीं।',
    sat: 'ᱠᱚᱞᱭᱟᱬᱯᱩᱨ ᱨᱮ ᱨᱩᱣᱟᱹ ᱠᱷᱟᱹᱛᱤᱨ ᱦᱟᱲᱟᱢ ᱵᱩᱰᱷᱤ ᱞᱟᱹᱜᱤᱫ ᱫᱟᱠᱟ-ᱩᱛᱩ ᱥᱟᱢᱟᱱ ᱟᱨ ᱨᱟᱱ ᱞᱟᱹᱠᱛᱤ ᱠᱟᱱᱟ᱾',
  },
};

/**
 * Translates a user-generated description into the target language.
 */
export async function translateUgcDescription(
  text: string,
  targetLang: string
): Promise<string> {
  if (!text || targetLang === 'en') return text;

  const cacheKey = `${text.trim()}_${targetLang}`;
  if (ugcTranslationCache.has(cacheKey)) {
    return ugcTranslationCache.get(cacheKey)!;
  }

  // 1. Check curated presets
  for (const [original, translations] of Object.entries(PRESET_UGC_TRANSLATIONS)) {
    if (text.trim().startsWith(original.slice(0, 40))) {
      if (translations[targetLang]) {
        ugcTranslationCache.set(cacheKey, translations[targetLang]);
        return translations[targetLang];
      }
    }
  }

  // 2. Client-side lightweight translation API call
  try {
    const encoded = encodeURIComponent(text);
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encoded}`;
    const res = await fetch(url, { method: 'GET' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && Array.isArray(data[0])) {
        const translated = data[0].map((item: unknown[]) => item[0]).join('');
        if (translated) {
          ugcTranslationCache.set(cacheKey, translated);
          return translated;
        }
      }
    }
  } catch {
    // If offline or network error, fallback gracefully
  }

  // Fallback: return original text
  return text;
}
