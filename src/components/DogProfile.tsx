import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Dog } from '../lib/supabase';

const SIZE_LABELS: Record<string, string> = {
  small: 'Pequeno',
  medium: 'Médio',
  large: 'Grande',
};

const SIZE_BADGE_CLASSES: Record<string, string> = {
  small: 'bg-nature-100 text-nature-700 border border-nature-200',
  medium: 'bg-primary-100 text-primary-700 border border-primary-200',
  large: 'bg-warm-100 text-warm-700 border border-warm-200',
};

/* ── Parse description into structured fields ── */
function parseDescription(raw: string) {
  const lines = raw.split('\n').filter(Boolean);
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

/* ── Sociability & medical tags ── */
function TagBadge({ text }: { text: string }) {
  const isPositive = text.startsWith('Sociável') || text.startsWith('Chipado') || text.startsWith('Vacinado') || text.startsWith('Esterilizado');
  const isUnknown = text.startsWith('Não sabemos');

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
        isPositive
          ? 'bg-nature-50 text-nature-700 border border-nature-200'
          : isUnknown
          ? 'bg-warm-50 text-warm-500 border border-warm-200'
          : 'bg-warm-50 text-warm-600 border border-warm-200'
      }`}
    >
      {isPositive && '✓'} {text}
    </span>
  );
}

/* ── Photo Gallery ── */
function PhotoGallery({ photos, name }: { photos: string[]; name: string }) {
  const [selected, setSelected] = useState(0);

  if (photos.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Main photo — big and immersive */}
      <div className="relative aspect-[16/10] md:aspect-[16/9] rounded-2xl overflow-hidden bg-warm-100 shadow-lg">
        <img
          src={photos[selected]}
          alt={`Foto de ${name}`}
          className="w-full h-full object-cover"
        />
        {photos.length > 1 && (
          <>
            <button
              onClick={() => setSelected((selected - 1 + photos.length) % photos.length)}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/80 backdrop-blur-sm shadow-lg flex items-center justify-center hover:bg-white transition-colors"
              aria-label="Foto anterior"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-warm-700">
                <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
              </svg>
            </button>
            <button
              onClick={() => setSelected((selected + 1) % photos.length)}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/80 backdrop-blur-sm shadow-lg flex items-center justify-center hover:bg-white transition-colors"
              aria-label="Foto seguinte"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-warm-700">
                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
              </svg>
            </button>
            <div className="absolute bottom-4 right-4 bg-black/50 text-white text-sm px-3 py-1.5 rounded-full backdrop-blur-sm">
              {selected + 1} / {photos.length}
            </div>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {photos.length > 1 && (
        <div className="flex gap-2.5 overflow-x-auto pb-2">
          {photos.map((url, i) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className={`flex-shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden border-2 transition-all ${
                i === selected
                  ? 'border-primary-500 shadow-md ring-2 ring-primary-200'
                  : 'border-warm-200 hover:border-warm-400 opacity-70 hover:opacity-100'
              }`}
              aria-label={`Ver foto ${i + 1} de ${name}`}
            >
              <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
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
    <div className="max-w-3xl mx-auto animate-pulse space-y-6">
      <div className="aspect-[16/10] rounded-2xl bg-warm-200" />
      <div className="h-10 bg-warm-200 rounded-lg w-48" />
      <div className="space-y-3">
        <div className="h-4 bg-warm-200 rounded w-full" />
        <div className="h-4 bg-warm-200 rounded w-5/6" />
        <div className="h-4 bg-warm-200 rounded w-3/4" />
      </div>
    </div>
  );
}

/* ── 404 ── */
function NotFound() {
  return (
    <div className="max-w-3xl mx-auto text-center py-20">
      <div className="text-6xl mb-4">🐾</div>
      <h1 className="text-2xl font-bold text-warm-900 mb-2">Cão não encontrado</h1>
      <p className="text-warm-600 mb-8">Este cão pode já ter encontrado um lar!</p>
      <a
        href="/caes"
        className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
      >
        Ver todos os cães
      </a>
    </div>
  );
}

/* ── Main Profile Component ── */
export default function DogProfile() {
  const [dog, setDog] = useState<Dog | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      const params = new URLSearchParams(window.location.search);
      const dogId = params.get('id');

      if (!dogId || !supabase) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('dogs')
        .select('*')
        .eq('id', dogId)
        .single();

      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setDog(data);

      // Fetch all photos from storage
      const slug = data.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '-');

      const { data: files } = await supabase.storage
        .from('dog-photos')
        .list(slug, { limit: 50, sortBy: { column: 'name', order: 'asc' } });

      if (files && files.length > 0) {
        const urls = files
          .filter(f => /\.(jpe?g|png|webp)$/i.test(f.name))
          .map(f => {
            const { data: urlData } = supabase!.storage
              .from('dog-photos')
              .getPublicUrl(`${slug}/${f.name}`);
            return urlData.publicUrl;
          });
        setPhotos(urls);
      } else if (data.photo_url) {
        setPhotos([data.photo_url]);
      }

      setLoading(false);
    }

    load();
  }, []);

  if (loading) return <LoadingSkeleton />;
  if (notFound || !dog) return <NotFound />;

  const sizeLabel = SIZE_LABELS[dog.size] ?? dog.size;
  const badgeClasses = SIZE_BADGE_CLASSES[dog.size] ?? '';
  const parsed = dog.description ? parseDescription(dog.description) : null;

  // Separate sociability and medical tags from regular fields
  const infoFields = parsed?.fields.filter(f => f.label !== '✓' && f.label !== '🏥') ?? [];
  const tags = parsed?.fields.filter(f => f.label === '✓' || f.label === '🏥') ?? [];

  return (
    <div className="max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-warm-500" aria-label="Breadcrumb">
        <a href="/" className="hover:text-primary-600 transition-colors">Início</a>
        <span aria-hidden="true">/</span>
        <a href="/caes" className="hover:text-primary-600 transition-colors">Cães</a>
        <span aria-hidden="true">/</span>
        <span className="text-warm-700 font-medium">{dog.name}</span>
      </nav>

      {/* Photos — full width, big and beautiful */}
      <PhotoGallery photos={photos} name={dog.name} />

      {/* Name + badge */}
      <div className="mt-8 mb-6">
        <div className="flex items-center gap-4 mb-2">
          <h1 className="text-4xl md:text-5xl font-extrabold text-warm-900">{dog.name}</h1>
          <span className={`px-4 py-1.5 rounded-full text-sm font-bold ${badgeClasses}`}>
            {sizeLabel}
          </span>
        </div>
        {parsed?.personality && (
          <p className="text-lg text-warm-600 italic mt-2">"{parsed.personality}"</p>
        )}
      </div>

      {/* Story — the emotional hook */}
      {parsed?.story && (
        <div className="mb-8 bg-warm-50 border border-warm-200 rounded-2xl p-6">
          <h2 className="text-sm font-bold text-warm-500 uppercase tracking-wider mb-3">A Minha História</h2>
          <p className="text-warm-700 leading-relaxed text-base">{parsed.story}</p>
        </div>
      )}

      {/* Info grid */}
      {infoFields.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-bold text-warm-500 uppercase tracking-wider mb-4">Sobre Mim</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {infoFields.map((f, i) => (
              <div key={i} className="bg-white border border-warm-200 rounded-xl p-4">
                <dt className="text-xs font-semibold text-warm-400 uppercase tracking-wider mb-1">{f.label}</dt>
                <dd className="text-warm-900 font-medium">{f.value}</dd>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tags — sociability + medical */}
      {tags.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-bold text-warm-500 uppercase tracking-wider mb-4">Compatibilidade</h2>
          <div className="flex flex-wrap gap-2">
            {tags.map((t, i) => (
              <TagBadge key={i} text={t.value} />
            ))}
          </div>
        </div>
      )}

      {/* Adoption CTA */}
      <div className="mb-8 bg-primary-50 border border-primary-200 rounded-2xl p-8">
        <h2 className="text-xl font-bold text-warm-900 mb-3">
          Queres adotar o/a {dog.name}?
        </h2>
        <p className="text-warm-600 leading-relaxed mb-6">
          Entra em contacto connosco para saber mais sobre o processo de adoção.
          Ficaremos felizes em ajudar-te a encontrar o teu novo melhor amigo!
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href={`mailto:capa.geralpvl@gmail.com?subject=Adoção — ${dog.name}`}
            className="inline-flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-semibold px-6 py-3.5 rounded-xl transition-colors shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M3 4a2 2 0 00-2 2v1.161l8.441 4.221a1.25 1.25 0 001.118 0L19 7.162V6a2 2 0 00-2-2H3z" />
              <path d="M19 8.839l-7.616 3.808a2.75 2.75 0 01-2.768 0L1 8.839V14a2 2 0 002 2h14a2 2 0 002-2V8.839z" />
            </svg>
            Enviar email
          </a>
          <a
            href="/adocao"
            className="inline-flex items-center justify-center gap-2 bg-white hover:bg-warm-50 text-warm-700 font-semibold px-6 py-3.5 rounded-xl border border-warm-300 transition-colors"
          >
            Processo de adoção
          </a>
        </div>
      </div>

      {/* Back link */}
      <div className="pt-6 pb-4 border-t border-warm-200">
        <a
          href="/caes"
          className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-semibold transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
          </svg>
          Ver todos os cães
        </a>
      </div>
    </div>
  );
}
