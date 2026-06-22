import { useState, useEffect } from 'react';
import { capaApi } from '../lib/capaApi';
import { capaDogs } from '../data/capaDogs';
import { getTranslations, localizeDescription, type Locale } from '../i18n';
import type { Dog } from '../lib/capaApi';

const SIZE_BADGE_CLASSES: Record<string, string> = {
  small: 'bg-playful-peach text-playful-orange-dark border border-playful-orange/20',
  medium: 'bg-white text-playful-orange-dark border border-playful-line',
  large: 'bg-playful-cream text-playful-orange-dark border border-playful-line',
};

/* ── Parse description into structured fields ── */
/* Note: description text is always stored in Portuguese (built by AdminPanel).
   The parsing logic therefore always uses Portuguese field names. */
function parseDescription(raw: string) {
  const lines = raw.replace(/\\n/g, '\n').split('\n').filter(Boolean);
  const fields: { label: string; value: string }[] = [];
  let story = '';
  let personality = '';

  for (const line of lines) {
    const match = line.match(/^([^:]+):\s*(.+)$/);
    if (match) {
      const [, label, value] = match;
      const key = label.trim().toLowerCase();

      if (key === 'história') {
        story = value.trim();
      } else if (key === 'personalidade') {
        personality = value.trim();
      } else if (
        key.startsWith('sociável') ||
        key.startsWith('não sabemos') ||
        key.startsWith('chipado') ||
        key.startsWith('vacinado') ||
        key.startsWith('esterilizado')
      ) {
        // These are tags, handle separately
        fields.push({ label: label.trim(), value: value.trim() });
      } else {
        fields.push({ label: label.trim(), value: value.trim() });
      }
    } else {
      // Lines without colon — sociability/medical tags
      const trimmed = line.trim();
      if (trimmed.startsWith('Sociável') || trimmed.startsWith('Não sabemos')) {
        fields.push({ label: '✓', value: trimmed });
      } else if (trimmed.match(/^(Chipado|Vacinado|Esterilizado)/)) {
        // Combined medical line: "Chipado, Vacinado, Esterilizado"
        fields.push({ label: '🏥', value: trimmed });
      } else if (trimmed) {
        // Append to story
        story = story ? `${story} ${trimmed}` : trimmed;
      }
    }
  }

  return { fields, story, personality };
}

/* ── Localize parsed description fields ── */
/* Descriptions are stored in PT. These helpers translate parsed labels/values to the target locale. */
function localizeField(label: string, value: string, locale: Locale): { label: string; value: string } {
  if (locale === 'pt') return { label, value };
  const ptT = getTranslations('pt').admin;
  const enT = getTranslations(locale).admin;
  const ptSizes = getTranslations('pt').sizes;
  const enSizes = getTranslations(locale).sizes;

  const labelMap: Record<string, string> = {
    [ptT.descSex]: enT.descSex,
    [ptT.descAge]: enT.descAge,
    [ptT.descEntryDate]: enT.descEntryDate,
    [ptT.descBreed]: enT.descBreed,
    [ptT.descSize]: enT.descSize,
    [ptT.descPersonality]: enT.descPersonality,
    [ptT.descStory]: enT.descStory,
  };
  const valueMap: Record<string, string> = {
    [ptT.descSexMale]: enT.descSexMale,
    [ptT.descSexFemale]: enT.descSexFemale,
    [ptSizes.small]: enSizes.small,
    [ptSizes.medium]: enSizes.medium,
    [ptSizes.large]: enSizes.large,
  };
  return {
    label: labelMap[label] ?? label,
    value: valueMap[value] ?? value,
  };
}

function localizeTag(text: string, locale: Locale): string {
  if (locale === 'pt') return text;
  const ptT = getTranslations('pt').admin;
  const enT = getTranslations(locale).admin;
  const tagMap: Record<string, string> = {
    [ptT.descGoodWithPeople]: enT.descGoodWithPeople,
    [ptT.descNotGoodWithPeople]: enT.descNotGoodWithPeople,
    [ptT.descUnknownPeople]: enT.descUnknownPeople,
    [ptT.descGoodWithMales]: enT.descGoodWithMales,
    [ptT.descNotGoodWithMales]: enT.descNotGoodWithMales,
    [ptT.descUnknownMales]: enT.descUnknownMales,
    [ptT.descGoodWithFemales]: enT.descGoodWithFemales,
    [ptT.descNotGoodWithFemales]: enT.descNotGoodWithFemales,
    [ptT.descUnknownFemales]: enT.descUnknownFemales,
    [ptT.descGoodWithCats]: enT.descGoodWithCats,
    [ptT.descNotGoodWithCats]: enT.descNotGoodWithCats,
    [ptT.descUnknownCats]: enT.descUnknownCats,
    [ptT.descChipped]: enT.descChipped,
    [ptT.descVaccinated]: enT.descVaccinated,
    [ptT.descSterilized]: enT.descSterilized,
  };
  // Handle combined medical lines like "Chipado, Vacinado"
  const parts = text.split(',').map(s => s.trim());
  if (parts.length > 1 && parts.every(p => tagMap[p])) {
    return parts.map(p => tagMap[p]).join(', ');
  }
  return tagMap[text] ?? text;
}

/* ── Sociability & medical tags ── */
/* Tag text is always Portuguese (from stored description), so we check Portuguese strings */
function TagBadge({ text, locale }: { text: string; locale: Locale }) {
  const displayText = localizeTag(text, locale);
  const isPositive = text.startsWith('Sociável') || text.startsWith('Chipado') || text.startsWith('Vacinado') || text.startsWith('Esterilizado');
  const isUnknown = text.startsWith('Não sabemos');

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-extrabold ${
        isPositive
          ? 'border border-playful-orange/20 bg-playful-peach text-playful-orange-dark'
          : isUnknown
          ? 'border border-playful-line bg-white/80 text-playful-muted'
          : 'border border-playful-line bg-playful-cream text-playful-muted'
      }`}
    >
      {isPositive && '✓'} {displayText}
    </span>
  );
}

/* ── Photo Gallery ── */
function PhotoGallery({ photos, name, locale, adoptedLabel }: { photos: string[]; name: string; locale: Locale; adoptedLabel?: string }) {
  const t = getTranslations(locale);
  const [selected, setSelected] = useState(0);

  if (photos.length === 0) return null;

  return (
    <div className="min-w-0 max-w-full space-y-4" data-dog-profile-gallery>
      <div className="relative aspect-[4/3] min-w-0 max-w-full overflow-hidden rounded-[2.4rem] border-[10px] border-white bg-playful-cream shadow-pillowy-lg lg:rotate-1">
        <img
          src={photos[selected]}
          alt={`${t.dogProfile.breadcrumbDogs} ${name}`}
          className="block h-full w-full max-w-full object-contain object-center"
        />
        {adoptedLabel && (
          <span className="absolute left-4 right-4 top-4 z-10 rounded-full bg-playful-orange px-5 py-3 text-center text-sm font-extrabold uppercase tracking-wide text-white shadow-squish">
            {adoptedLabel}
          </span>
        )}
        {photos.length > 1 && (
          <>
            <button
              onClick={() => setSelected((selected - 1 + photos.length) % photos.length)}
              className="playful-focus absolute left-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/88 text-playful-orange-dark shadow-pillowy transition-transform hover:scale-105"
              aria-label={t.dogProfile.prevPhoto}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
              </svg>
            </button>
            <button
              onClick={() => setSelected((selected + 1) % photos.length)}
              className="playful-focus absolute right-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/88 text-playful-orange-dark shadow-pillowy transition-transform hover:scale-105"
              aria-label={t.dogProfile.nextPhoto}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
              </svg>
            </button>
            <div className="absolute bottom-4 right-4 rounded-full bg-playful-orange-dark/82 px-4 py-2 text-sm font-extrabold text-white shadow-sm backdrop-blur-sm">
              {selected + 1} / {photos.length}
            </div>
          </>
        )}
      </div>

      {photos.length > 1 && (
        <div className="flex max-w-full gap-3 overflow-x-auto pb-2">
          {photos.map((url, i) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className={`playful-focus h-20 w-20 flex-shrink-0 overflow-hidden rounded-[1.3rem] border-3 transition-all md:h-24 md:w-24 ${
                i === selected
                  ? 'border-playful-orange shadow-pillowy ring-4 ring-playful-peach'
                  : 'border-white opacity-75 shadow-sm hover:opacity-100'
              }`}
              aria-label={`${t.dogProfile.viewPhoto} ${i + 1} ${name}`}
            >
              <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Loading skeleton ── */
function LoadingSkeleton() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse space-y-8" data-dog-profile-loading>
      <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="aspect-[4/3] rounded-[2.4rem] bg-playful-peach" />
        <div className="space-y-5 pt-8">
          <div className="h-12 w-56 rounded-full bg-playful-peach" />
          <div className="h-20 rounded-[2rem] bg-playful-peach/80" />
          <div className="h-40 rounded-[2rem] bg-white" />
        </div>
      </div>
    </div>
  );
}

/* ── 404 ── */
function NotFound({ locale }: { locale: Locale }) {
  const t = getTranslations(locale);
  const dogsPath = locale === 'pt' ? '/caes' : '/en/dogs';

  return (
    <div className="relative mx-auto max-w-3xl overflow-hidden rounded-[2.5rem] border border-playful-line bg-white/88 px-6 py-16 text-center shadow-pillowy-lg sm:px-10" data-dog-profile-not-found>
      <div className="mx-auto mb-6 flex h-24 w-24 -rotate-6 items-center justify-center rounded-full bg-playful-peach text-5xl shadow-pillowy">🐾</div>
      <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.24em] text-playful-orange-dark">CAPA PVL</p>
      <h1 className="font-playful-display text-4xl font-extrabold tracking-[-0.05em] text-playful-orange-dark sm:text-5xl">{t.dogProfile.notFoundTitle}</h1>
      <p className="mx-auto mt-5 max-w-xl text-lg font-medium leading-8 text-playful-muted">{t.dogProfile.notFoundDesc}</p>
      <a
        href={dogsPath}
        className="squishy playful-focus mt-8 inline-flex items-center gap-2 rounded-full bg-playful-orange px-7 py-4 font-playful-display font-extrabold text-white shadow-squish"
      >
        {t.dogProfile.viewAllDogs}
        <span aria-hidden="true">→</span>
      </a>
    </div>
  );
}

/* ── Main Profile Component ── */
export default function DogProfile({ locale = 'pt' }: { locale?: Locale }) {
  const t = getTranslations(locale);
  const [dog, setDog] = useState<Dog | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const homePath = locale === 'pt' ? '/' : '/en/';
  const dogsPath = locale === 'pt' ? '/caes' : '/en/dogs';
  const adoptPath = locale === 'pt' ? '/adocao' : '/en/adopt';

  const sizeLabels: Record<string, string> = {
    small: t.sizes.small,
    medium: t.sizes.medium,
    large: t.sizes.large,
  };

  useEffect(() => {
    async function load() {
      const params = new URLSearchParams(window.location.search);
      const dogId = params.get('id');

      if (!dogId) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      let data: Dog | null = capaDogs.find((d) => d.id === dogId) ?? null;
      let urls: string[] = [];

      if (data) {
        setDog(data);
        setPhotos(data.photos?.length ? data.photos : data.photo_url ? [data.photo_url] : []);
        setLoading(false);
      }

      if (capaApi) {
        try {
          const remoteDog = await capaApi.getDog(dogId);

          if (remoteDog) {
            data = remoteDog;
            urls = remoteDog.photos?.length ? remoteDog.photos : remoteDog.photo_url ? [remoteDog.photo_url] : [];
          }
        } catch {
          // Use the committed dataset if the Hetzner API is temporarily unavailable.
        }
      }

      if (!data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setDog(data);

      if (urls.length > 0) {
        setPhotos(urls);
      } else if (data.photos?.length) {
        setPhotos(data.photos);
      } else if (data.photo_url) {
        setPhotos([data.photo_url]);
      }

      setLoading(false);
    }

    load();
  }, []);

  if (loading) return <LoadingSkeleton />;
  if (notFound || !dog) return <NotFound locale={locale} />;

  const sizeLabel = sizeLabels[dog.size] ?? dog.size;
  const badgeClasses = SIZE_BADGE_CLASSES[dog.size] ?? 'bg-white text-playful-orange-dark border border-playful-line';
  const parsed = dog.description ? parseDescription(dog.description) : null;

  const infoFields = parsed?.fields.filter(f => f.label !== '✓' && f.label !== '🏥') ?? [];
  const tags = parsed?.fields.filter(f => f.label === '✓' || f.label === '🏥') ?? [];

  return (
    <div className="relative mx-auto max-w-7xl" data-dog-profile>
      <div className="ambient-blob -left-32 top-24 h-96 w-96 bg-playful-peach/70" aria-hidden="true" />
      <div className="ambient-blob -right-28 top-0 h-96 w-96 bg-playful-orange/25" aria-hidden="true" />

      <nav className="relative z-10 mb-8 flex flex-wrap items-center gap-2 text-sm font-extrabold text-playful-muted" aria-label="Breadcrumb">
        <a href={homePath} className="playful-focus rounded-full bg-white/70 px-3 py-2 hover:text-playful-orange-dark">{t.dogProfile.breadcrumbHome}</a>
        <span aria-hidden="true">/</span>
        <a href={dogsPath} className="playful-focus rounded-full bg-white/70 px-3 py-2 hover:text-playful-orange-dark">{t.dogProfile.breadcrumbDogs}</a>
        <span aria-hidden="true">/</span>
        <span className="rounded-full bg-playful-peach px-3 py-2 text-playful-orange-dark">{dog.name}</span>
      </nav>

      <section className="relative z-10 grid min-w-0 items-start gap-10 lg:grid-cols-[1.04fr_0.96fr]" aria-labelledby="dog-profile-heading">
        <PhotoGallery photos={photos} name={dog.name} locale={locale} adoptedLabel={dog.is_adopted ? t.status.adopted : undefined} />

        <div className="min-w-0 space-y-7">
          <div className="rounded-[2.3rem] border border-playful-line bg-white/88 p-6 shadow-pillowy-lg sm:p-8">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <span className={`rounded-full px-4 py-2 text-sm font-extrabold shadow-sm ${badgeClasses}`}>{sizeLabel}</span>
              {dog.is_adopted && <span className="rounded-full bg-playful-orange px-4 py-2 text-sm font-extrabold uppercase text-white shadow-sm">{t.status.adopted}</span>}
            </div>
            <h1 id="dog-profile-heading" className="font-playful-display text-5xl font-extrabold tracking-[-0.065em] text-playful-orange-dark sm:text-6xl">{dog.name}</h1>
            {parsed?.personality && (
              <p className="mt-4 rounded-[1.5rem] bg-playful-peach/70 px-5 py-4 text-lg font-extrabold leading-8 text-playful-orange-dark">“{parsed.personality}”</p>
            )}
          </div>

          {parsed?.story && (
            <section className="rounded-[2rem] border border-playful-line bg-playful-peach/70 p-6 shadow-pillowy sm:p-8" aria-labelledby="dog-story-heading">
              <h2 id="dog-story-heading" className="mb-3 text-xs font-extrabold uppercase tracking-[0.24em] text-playful-orange-dark">{t.dogProfile.storyHeading}</h2>
              <p className="text-base font-medium leading-8 text-playful-muted">{parsed.story}</p>
            </section>
          )}
        </div>
      </section>

      <div className="relative z-10 mt-10 grid min-w-0 gap-8 lg:grid-cols-[1fr_0.92fr]">
        {infoFields.length > 0 && (
          <section className="rounded-[2rem] border border-playful-line bg-white/88 p-6 shadow-pillowy sm:p-8" aria-labelledby="dog-about-heading">
            <h2 id="dog-about-heading" className="mb-5 font-playful-display text-2xl font-extrabold tracking-[-0.04em] text-playful-orange-dark">{t.dogProfile.aboutHeading}</h2>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {infoFields.map((f, i) => {
                const localized = localizeField(f.label, f.value, locale);
                return (
                  <div key={i} className="rounded-[1.5rem] border border-playful-line bg-playful-canvas/80 p-4">
                    <dt className="mb-1 text-xs font-extrabold uppercase tracking-[0.18em] text-playful-muted/75">{localized.label}</dt>
                    <dd className="font-extrabold text-playful-orange-dark">{localized.value}</dd>
                  </div>
                );
              })}
            </dl>
          </section>
        )}

        {tags.length > 0 && (
          <section className="rounded-[2rem] border border-playful-line bg-white/88 p-6 shadow-pillowy sm:p-8" aria-labelledby="dog-compat-heading">
            <h2 id="dog-compat-heading" className="mb-5 font-playful-display text-2xl font-extrabold tracking-[-0.04em] text-playful-orange-dark">{t.dogProfile.compatibilityHeading}</h2>
            <div className="flex flex-wrap gap-2">
              {tags.map((tg, i) => <TagBadge key={i} text={tg.value} locale={locale} />)}
            </div>
          </section>
        )}
      </div>

      {dog.is_adopted ? (
        <section className="relative z-10 mt-10 rounded-[2.2rem] border border-playful-line bg-white/88 p-7 shadow-pillowy-lg sm:p-9" aria-labelledby="dog-adopted-heading">
          <h2 id="dog-adopted-heading" className="font-playful-display text-3xl font-extrabold tracking-[-0.04em] text-playful-orange-dark">{t.dogProfile.adoptedTitle}</h2>
          <p className="mt-3 max-w-3xl text-base font-medium leading-7 text-playful-muted">{t.dogProfile.adoptedDesc}</p>
        </section>
      ) : (
        <section className="relative z-10 mt-10 rounded-[2.2rem] border border-playful-orange/15 bg-playful-orange-dark p-7 text-white shadow-pillowy-lg sm:p-9" aria-labelledby="dog-adopt-heading">
          <h2 id="dog-adopt-heading" className="font-playful-display text-3xl font-extrabold tracking-[-0.04em]">{t.dogProfile.adoptTitle} {dog.name}?</h2>
          <p className="mt-3 max-w-3xl text-base font-medium leading-7 text-white/82">{t.dogProfile.adoptDesc}</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <a
              href={`mailto:capa.geralpvl@gmail.com?subject=${t.dogProfile.emailSubject} — ${dog.name}`}
              className="squishy playful-focus inline-flex items-center justify-center gap-2 rounded-full bg-playful-orange px-7 py-4 font-playful-display font-extrabold text-white shadow-squish"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden="true">
                <path d="M3 4a2 2 0 00-2 2v1.161l8.441 4.221a1.25 1.25 0 001.118 0L19 7.162V6a2 2 0 00-2-2H3z" />
                <path d="M19 8.839l-7.616 3.808a2.75 2.75 0 01-2.768 0L1 8.839V14a2 2 0 002 2h14a2 2 0 002-2V8.839z" />
              </svg>
              {t.dogProfile.sendEmail}
            </a>
            <a href={adoptPath} className="squishy playful-focus inline-flex items-center justify-center rounded-full bg-white px-7 py-4 font-playful-display font-extrabold text-playful-orange-dark shadow-pillowy">
              {t.dogProfile.adoptionProcess}
            </a>
          </div>
        </section>
      )}

      <div className="relative z-10 mt-9 border-t border-playful-line pt-7">
        <a href={dogsPath} className="playful-focus inline-flex items-center gap-2 rounded-full bg-white/80 px-5 py-3 font-extrabold text-playful-orange-dark shadow-sm hover:bg-playful-peach">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden="true">
            <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
          </svg>
          {t.dogProfile.viewAllDogs}
        </a>
      </div>
    </div>
  );
}
