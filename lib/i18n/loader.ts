import { Dictionary } from './types';
import enDictionary from './dictionaries/en.json';

const englishDictionary = enDictionary as unknown as Dictionary;

/**
 * Loads the dictionary. With Google Translate as the single translation engine,
 * UI strings remain in clean English and Google Translate handles runtime localization.
 */
export async function loadDictionary(_locale?: string): Promise<Dictionary> {
  return englishDictionary;
}

/**
 * Synchronous dictionary getter (returns English baseline dictionary)
 */
export function getLoadedDictionary(_locale?: string): Dictionary {
  return englishDictionary;
}
