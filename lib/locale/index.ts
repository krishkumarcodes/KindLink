/**
 * KindLink Locale & Server Geo-lookup Module
 */

export * from './types';
export * from './ipUtils';
export * from './botDetection';
export * from './countryLanguageMap';
export * from './ipLookup';

// Cookie Constants
export const KINDLINK_LANG_COOKIE = 'kindlink_lang';
export const KINDLINK_LANG_SOURCE_COOKIE = 'kindlink_lang_source';
export const KINDLINK_LOCALE_COOKIE = 'kindlink_locale'; // For backward compatibility
export const COOKIE_MAX_AGE_SECONDS = 31536000; // 1 year
