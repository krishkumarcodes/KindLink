import { Dictionary, Locale } from './types';
import enDictionary from './dictionaries/en.json';

const dictionaryCache = new Map<string, Dictionary>();

// Prime the cache with the default English dictionary
dictionaryCache.set('en', enDictionary as unknown as Dictionary);

/**
 * Dynamically loads and caches the dictionary for the specified locale.
 * Merges with the default English dictionary to guarantee complete type-safe key coverage.
 */
export async function loadDictionary(locale: string): Promise<Dictionary> {
  if (dictionaryCache.has(locale)) {
    return dictionaryCache.get(locale)!;
  }

  try {
    let dictModule: { default: unknown };

    switch (locale) {
      case 'hi':
        dictModule = await import('./dictionaries/hi.json');
        break;
      case 'bn':
        dictModule = await import('./dictionaries/bn.json');
        break;
      case 'bho':
        dictModule = await import('./dictionaries/bho.json');
        break;
      case 'mai':
        dictModule = await import('./dictionaries/mai.json');
        break;
      case 'ne':
        dictModule = await import('./dictionaries/ne.json');
        break;
      case 'ur':
        dictModule = await import('./dictionaries/ur.json');
        break;
      case 'sat':
        dictModule = await import('./dictionaries/sat.json');
        break;
      case 'or':
        dictModule = await import('./dictionaries/or.json');
        break;
      case 'as':
        dictModule = await import('./dictionaries/as.json');
        break;
      case 'mr':
        dictModule = await import('./dictionaries/mr.json');
        break;
      case 'gu':
        dictModule = await import('./dictionaries/gu.json');
        break;
      case 'pa':
        dictModule = await import('./dictionaries/pa.json');
        break;
      case 'ta':
        dictModule = await import('./dictionaries/ta.json');
        break;
      case 'te':
        dictModule = await import('./dictionaries/te.json');
        break;
      case 'kn':
        dictModule = await import('./dictionaries/kn.json');
        break;
      case 'ml':
        dictModule = await import('./dictionaries/ml.json');
        break;
      case 'sck':
        dictModule = await import('./dictionaries/sck.json');
        break;
      case 'kht':
        dictModule = await import('./dictionaries/kht.json');
        break;
      case 'kru':
        dictModule = await import('./dictionaries/kru.json');
        break;
      case 'unr':
        dictModule = await import('./dictionaries/unr.json');
        break;
      case 'hoc':
        dictModule = await import('./dictionaries/hoc.json');
        break;
      case 'fr':
        dictModule = await import('./dictionaries/fr.json');
        break;
      case 'es':
        dictModule = await import('./dictionaries/es.json');
        break;
      case 'de':
        dictModule = await import('./dictionaries/de.json');
        break;
      case 'pt':
        dictModule = await import('./dictionaries/pt.json');
        break;
      case 'it':
        dictModule = await import('./dictionaries/it.json');
        break;
      case 'ru':
        dictModule = await import('./dictionaries/ru.json');
        break;
      case 'zh':
        dictModule = await import('./dictionaries/zh.json');
        break;
      case 'ja':
        dictModule = await import('./dictionaries/ja.json');
        break;
      case 'ko':
        dictModule = await import('./dictionaries/ko.json');
        break;
      case 'ar':
        dictModule = await import('./dictionaries/ar.json');
        break;
      case 'id':
        dictModule = await import('./dictionaries/id.json');
        break;
      case 'tr':
        dictModule = await import('./dictionaries/tr.json');
        break;
      default:
        return enDictionary as unknown as Dictionary;
    }

    const raw = (dictModule.default || dictModule) as Record<string, Record<string, string>>;
    const en = enDictionary as Record<string, Record<string, string>>;

    // Deep merge with English baseline for guaranteed fallback
    const merged: Record<string, Record<string, string>> = {};
    for (const sectionKey of Object.keys(en)) {
      merged[sectionKey] = {
        ...en[sectionKey],
        ...(raw[sectionKey] || {}),
      };
    }

    const finalDict = merged as unknown as Dictionary;
    dictionaryCache.set(locale, finalDict);
    return finalDict;
  } catch (error) {
    console.error(`[i18n] Failed to load dictionary for locale "${locale}":`, error);
    return enDictionary as unknown as Dictionary;
  }
}

/**
 * Synchronous dictionary getter (returns cached version or English baseline fallback)
 */
export function getLoadedDictionary(locale: string): Dictionary {
  return dictionaryCache.get(locale) || (enDictionary as unknown as Dictionary);
}
