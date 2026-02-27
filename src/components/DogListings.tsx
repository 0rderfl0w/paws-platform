import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { seedDogs } from '../data/seedDogs';
import { getTranslations, type Locale } from '../i18n';
import type { Dog } from '../lib/supabase';

type SizeFilter = 'all' | 'small' | 'medium' | 'large';
type SexFilter = 'all' | 'male' | 'female';

const SIZE_BADGE_CLASSES: Record<string, string> = {
  small: 'bg-nature-100 text-nature-700 border border-nature-200',
  medium: 'bg-primary-100 text-primary-700 border border-primary-200',
  large: 'bg-warm-100 text-warm-700 border border-warm-200',
};

function DogCard({ dog, locale }: { dog: Dog; locale: Locale }) {
  const t = getTranslations(locale);
  const badgeClasses = SIZE_BADGE_CLASSES[dog.size] ?? 'bg-warm-100 text-warm-700 border border-warm-200';

  const sizeLabels: Record<string, string> = {
    small: t.sizes.small,
    medium: t.sizes.medium,
    large: t.sizes.large,
  };
  const sizeLabel = sizeLabels[dog.size] ?? dog.size;

  const dogPath = locale === 'pt' ? `/cao?id=${dog.id}` : `/en/dog?id=${dog.id}`;

  return (
    <a href={dogPath} className="block bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg border border-warm-200 transition-all duration-200 group cursor-pointer">
      {/* Photo */}
      <div className="relative aspect-square overflow-hidden bg-warm-100">
        {dog.photo_url ? (
          <img
            src={dog.photo_url}
            alt={`${t.dogProfile.breadcrumbDogs} ${dog.name}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-warm-300">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-16 h-16" aria-hidden="true">
              <path d="M12 2C10.9 2 10 2.9 10 4s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-4 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm8 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-4 4c-2.2 0-4 1.5-4 3.3 0 .8.3 1.6.9 2.3L7 15c-.6.6-1 1.5-1 2.4C6 19.4 7.6 21 9.6 21h4.8c2 0 3.6-1.6 3.6-3.6 0-.9-.4-1.8-1-2.4l-.9-1.4c.6-.7.9-1.5.9-2.3C17 9.5 15.2 8 13 8h-1z"/>
            </svg>
          </div>
        )}
        {/* Size badge overlay */}
        <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-semibold ${badgeClasses}`}>
          {sizeLabel}
        </span>
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-bold text-warm-900">{dog.name}</h3>
          {dog.age && (
            <span className="text-xs text-warm-500 font-medium bg-warm-50 px-2 py-1 rounded-lg border border-warm-200 flex-shrink-0 ml-2">
              {dog.age}
            </span>
          )}
        </div>
        <p className="text-warm-600 text-sm leading-relaxed line-clamp-3">
          {dog.description}
        </p>
      </div>
    </a>
  );
}

export default function DogListings({ locale = 'pt' }: { locale?: Locale }) {
  const t = getTranslations(locale);
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [filter, setFilter] = useState<SizeFilter>('all');
  const [sexFilter, setSexFilter] = useState<SexFilter>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const filterTabs: { id: SizeFilter; label: string }[] = [
    { id: 'all', label: t.dogListings.filterAll },
    { id: 'small', label: t.dogListings.filterSmall },
    { id: 'medium', label: t.dogListings.filterMedium },
    { id: 'large', label: t.dogListings.filterLarge },
  ];

  const sexFilterTabs: { id: SexFilter; label: string }[] = [
    { id: 'all', label: t.dogListings.filterAll },
    { id: 'female', label: t.dogListings.filterFemale },
    { id: 'male', label: t.dogListings.filterMale },
  ];

  useEffect(() => {
    async function fetchDogs() {
      if (!supabase) {
        // No Supabase configured — use seed data
        setDogs(seedDogs.filter((d) => !d.is_adopted));
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('dogs')
          .select('*')
          .eq('is_adopted', false)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setDogs(data ?? seedDogs.filter((d) => !d.is_adopted));
      } catch {
        // Fall back to seed data on any error
        setDogs(seedDogs.filter((d) => !d.is_adopted));
      } finally {
        setLoading(false);
      }
    }

    fetchDogs();
  }, []);

  const filteredDogs = (() => {
    let result = dogs;
    if (filter !== 'all') {
      result = result.filter((d) => d.size === filter);
    }
    if (sexFilter !== 'all') {
      result = result.filter((d) => d.sex === sexFilter);
    }
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      result = result.filter((d) => d.name.toLowerCase().includes(term));
    }
    return result;
  })();

  function resetFilters() {
    setFilter('all');
    setSexFilter('all');
    setSearch('');
  }

  const resultsText = filteredDogs.length === 1
    ? t.dogListings.resultsOne
    : `${filteredDogs.length} ${t.dogListings.resultsMany}`;

  return (
    <section className="bg-warm-50 py-16" aria-label={t.dogListings.sectionLabel}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Search + Filters */}
        <div className="mb-10 space-y-5">
          {/* Search input */}
          <div className="relative max-w-md mx-auto">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-warm-400" aria-hidden="true">
                <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.dogListings.searchPlaceholder}
              aria-label={t.dogListings.searchLabel}
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-white border border-warm-200 text-warm-900 placeholder-warm-400 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition-colors"
            />
          </div>

          {/* Size filter tabs */}
          <div className="flex flex-wrap justify-center gap-2" role="tablist" aria-label={t.dogListings.filterBySize}>
            {filterTabs.map(({ id, label }) => (
              <button
                key={id}
                role="tab"
                aria-selected={filter === id}
                onClick={() => setFilter(id)}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  filter === id
                    ? 'bg-primary-500 text-white shadow-sm'
                    : 'bg-white text-warm-700 border border-warm-200 hover:bg-warm-100 hover:border-warm-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Sex filter tabs */}
          <div className="flex flex-wrap justify-center gap-2" role="tablist" aria-label={t.dogListings.filterBySex}>
            {sexFilterTabs.map(({ id, label }) => (
              <button
                key={id}
                role="tab"
                aria-selected={sexFilter === id}
                onClick={() => setSexFilter(id)}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  sexFilter === id
                    ? 'bg-warm-700 text-white shadow-sm'
                    : 'bg-white text-warm-700 border border-warm-200 hover:bg-warm-100 hover:border-warm-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Results count */}
        {!loading && (
          <p className="text-warm-500 text-sm font-medium mb-6 text-center">
            {resultsText}
          </p>
        )}

        {/* Loading state — skeleton cards */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-warm-200 animate-pulse">
                <div className="aspect-square bg-warm-200" />
                <div className="p-5 space-y-3">
                  <div className="h-5 bg-warm-200 rounded-lg w-2/3" />
                  <div className="h-4 bg-warm-100 rounded-lg w-full" />
                  <div className="h-4 bg-warm-100 rounded-lg w-4/5" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Dogs grid */}
        {!loading && filteredDogs.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDogs.map((dog) => (
              <DogCard key={dog.id} dog={dog} locale={locale} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredDogs.length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🐾</div>
            <p className="text-warm-700 text-xl font-semibold mb-2">
              {t.dogListings.emptyTitle}
            </p>
            <p className="text-warm-500 text-sm mb-6">
              {t.dogListings.emptyDesc}
            </p>
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white font-semibold text-sm rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
            >
              {t.dogListings.clearFilters}
            </button>
          </div>
        )}

      </div>
    </section>
  );
}
