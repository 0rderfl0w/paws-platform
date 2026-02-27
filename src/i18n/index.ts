import pt from './pt';
import en from './en';

export type Locale = 'pt' | 'en';
export type Translations = typeof pt;

const translations: Record<Locale, Translations> = { pt, en };

/** Get full translation object for a locale */
export function getTranslations(locale: Locale): Translations {
  return translations[locale] ?? translations.pt;
}

/** Shorthand: get a nested translation value */
export function t(locale: Locale, section: keyof Translations): Translations[keyof Translations] {
  return getTranslations(locale)[section];
}

/** Extract locale from URL path. Default: 'pt' */
export function getLocaleFromUrl(url: URL): Locale {
  const firstSegment = url.pathname.split('/').filter(Boolean)[0];
  if (firstSegment === 'en') return 'en';
  return 'pt';
}

/** Route mappings: PT path ↔ EN path */
const routeMap: Record<string, string> = {
  '/': '/en/',
  '/caes': '/en/dogs',
  '/cao': '/en/dog',
  '/adocao': '/en/adopt',
  '/ajudar': '/en/help',
  '/sobre-nos': '/en/about',
  '/admin': '/en/admin',
};

const reverseRouteMap: Record<string, string> = Object.fromEntries(
  Object.entries(routeMap).map(([pt, en]) => [en, pt])
);

/** Get the equivalent page path in the other locale */
export function getAlternatePath(currentPath: string, targetLocale: Locale): string {
  // Normalize: remove trailing slash (except for root)
  const normalized = currentPath === '/' ? '/' : currentPath.replace(/\/$/, '');

  if (targetLocale === 'en') {
    // PT → EN: check if query params exist (for /cao?id=xxx → /en/dog?id=xxx)
    const [path, query] = normalized.split('?');
    const enPath = routeMap[path] ?? '/en/';
    return query ? `${enPath}?${query}` : enPath;
  } else {
    // EN → PT
    const [path, query] = normalized.split('?');
    const ptPath = reverseRouteMap[path] ?? '/';
    return query ? `${ptPath}?${query}` : ptPath;
  }
}

/** Available locales with display info */
export const locales = [
  { code: 'pt' as Locale, label: 'Português', flag: '🇵🇹' },
  { code: 'en' as Locale, label: 'English', flag: '🇬🇧' },
] as const;
