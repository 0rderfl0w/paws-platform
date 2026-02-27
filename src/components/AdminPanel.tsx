import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { getTranslations, type Locale, type Translations } from '../i18n';
import type { Dog } from '../lib/supabase';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

/**
 * Photo numbering: skip 02 (was the logo slot on the original site).
 * Index 0 → photo-01, index 1 → photo-03, index 2 → photo-04, …
 */
function indexToPhotoNumber(index: number): number {
  if (index === 0) return 1;
  return index + 2;
}

function photoNumberToFilename(n: number): string {
  return `photo-${String(n).padStart(2, '0')}.jpg`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type View = 'dashboard' | 'add' | 'edit';

interface DogForm {
  name: string;
  size: 'small' | 'medium' | 'large';
  sex: 'male' | 'female' | '';
  age: string;
  description: string;
  // Structured fields (auto-generate description)
  personality: string;
  story: string;
  breed: string;
  entryDate: string;
  socHumans: 'yes' | 'no' | 'unknown';
  socMales: 'yes' | 'no' | 'unknown';
  socFemales: 'yes' | 'no' | 'unknown';
  socCats: 'yes' | 'no' | 'unknown';
  chipped: boolean;
  vaccinated: boolean;
  sterilized: boolean;
}

const EMPTY_FORM: DogForm = {
  name: '',
  size: 'medium',
  sex: '',
  age: '',
  description: '',
  personality: '',
  story: '',
  breed: '',
  entryDate: '',
  socHumans: 'unknown',
  socMales: 'unknown',
  socFemales: 'unknown',
  socCats: 'unknown',
  chipped: false,
  vaccinated: false,
  sterilized: false,
};

// ─── Description builder/parser (use translations for all field names) ────────

function buildDescription(form: DogForm, t: Translations): string {
  const lines: string[] = [];
  const sexDisplay: Record<string, string> = {
    male: t.admin.descSexMale,
    female: t.admin.descSexFemale,
  };
  const sizeDisplay: Record<string, string> = {
    small: t.sizes.small,
    medium: t.sizes.medium,
    large: t.sizes.large,
  };
  const sexLabel = sexDisplay[form.sex];
  if (sexLabel) lines.push(`${t.admin.descSex}: ${sexLabel}`);
  if (form.age) lines.push(`${t.admin.descAge}: ${form.age}`);
  if (form.entryDate) lines.push(`${t.admin.descEntryDate}: ${form.entryDate}`);
  if (form.breed) lines.push(`${t.admin.descBreed}: ${form.breed}`);
  lines.push(`${t.admin.descSize}: ${sizeDisplay[form.size] ?? form.size}`);
  if (form.personality) lines.push(`${t.admin.descPersonality}: ${form.personality}`);

  // Sociability
  if (form.socHumans === 'yes') lines.push(t.admin.descGoodWithPeople);
  else if (form.socHumans === 'no') lines.push(t.admin.descNotGoodWithPeople);
  else lines.push(t.admin.descUnknownPeople);

  if (form.socMales === 'yes') lines.push(t.admin.descGoodWithMales);
  else if (form.socMales === 'no') lines.push(t.admin.descNotGoodWithMales);
  else lines.push(t.admin.descUnknownMales);

  if (form.socFemales === 'yes') lines.push(t.admin.descGoodWithFemales);
  else if (form.socFemales === 'no') lines.push(t.admin.descNotGoodWithFemales);
  else lines.push(t.admin.descUnknownFemales);

  if (form.socCats === 'yes') lines.push(t.admin.descGoodWithCats);
  else if (form.socCats === 'no') lines.push(t.admin.descNotGoodWithCats);
  else lines.push(t.admin.descUnknownCats);

  // Medical
  const medical: string[] = [];
  if (form.chipped) medical.push(t.admin.descChipped);
  if (form.vaccinated) medical.push(t.admin.descVaccinated);
  if (form.sterilized) medical.push(t.admin.descSterilized);
  if (medical.length > 0) lines.push(medical.join(', '));

  if (form.story) lines.push(`${t.admin.descStory}: ${form.story}`);

  return lines.join('\n');
}

function parseDescriptionToForm(description: string, base: DogForm, t: Translations): DogForm {
  const form = { ...base };
  const lines = description.split('\n').filter(Boolean);
  const unmatched: string[] = [];

  const personality_key = t.admin.descPersonality.toLowerCase();
  const story_key = t.admin.descStory.toLowerCase();
  const breed_key = t.admin.descBreed.toLowerCase();
  const entry_key = t.admin.descEntryDate.toLowerCase();

  for (const line of lines) {
    const kv = line.match(/^([^:]+):\s*(.+)$/);
    if (kv) {
      const key = kv[1].trim().toLowerCase();
      const val = kv[2].trim();
      if (key === personality_key) form.personality = val;
      else if (key === story_key) form.story = val;
      else if (key === breed_key) form.breed = val;
      else if (key === entry_key) form.entryDate = val;
      // Sexo and Idade/Porte are already DB columns, skip
    } else {
      const trimmed = line.trim();
      if (trimmed === t.admin.descGoodWithPeople) form.socHumans = 'yes';
      else if (trimmed === t.admin.descNotGoodWithPeople) form.socHumans = 'no';
      else if (trimmed === t.admin.descUnknownPeople) form.socHumans = 'unknown';
      else if (trimmed === t.admin.descGoodWithMales) form.socMales = 'yes';
      else if (trimmed === t.admin.descNotGoodWithMales) form.socMales = 'no';
      else if (trimmed === t.admin.descUnknownMales) form.socMales = 'unknown';
      else if (trimmed === t.admin.descGoodWithFemales) form.socFemales = 'yes';
      else if (trimmed === t.admin.descNotGoodWithFemales) form.socFemales = 'no';
      else if (trimmed === t.admin.descUnknownFemales) form.socFemales = 'unknown';
      else if (trimmed === t.admin.descGoodWithCats) form.socCats = 'yes';
      else if (trimmed === t.admin.descNotGoodWithCats) form.socCats = 'no';
      else if (trimmed === t.admin.descUnknownCats) form.socCats = 'unknown';
      else if (trimmed.includes(t.admin.descChipped) || trimmed.includes(t.admin.descVaccinated) || trimmed.includes(t.admin.descSterilized)) {
        if (trimmed.includes(t.admin.descChipped)) form.chipped = true;
        if (trimmed.includes(t.admin.descVaccinated)) form.vaccinated = true;
        if (trimmed.includes(t.admin.descSterilized)) form.sterilized = true;
      } else {
        unmatched.push(trimmed);
      }
    }
  }

  // If there's unmatched text and no story, use it as story
  if (unmatched.length > 0 && !form.story) {
    form.story = unmatched.join(' ');
  }

  return form;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Spinner({ size = 'sm' }: { size?: 'sm' | 'lg' }) {
  const cls = size === 'lg' ? 'h-8 w-8' : 'h-4 w-4';
  return (
    <svg
      className={`${cls} animate-spin text-current`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

// ─── Login Screen ─────────────────────────────────────────────────────────────

function LoginScreen({ onLogin, t }: { onLogin: () => void; t: Translations }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setError('');
    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        setError(t.admin.loginError);
      } else {
        onLogin();
      }
    } catch {
      setError(t.admin.loginGenericError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-warm-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-2xl mb-4">
            <span className="text-3xl">🐾</span>
          </div>
          <h1 className="text-2xl font-bold text-warm-900">CAPA PVL</h1>
          <p className="text-warm-500 text-sm mt-1">{t.admin.loginTitle}</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-sm border border-warm-200 p-8 space-y-5"
        >
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-warm-700 mb-1.5">
              {t.admin.emailLabel}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-warm-200 bg-warm-50 text-warm-900 placeholder-warm-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition-colors"
              placeholder="admin@capapvl.pt"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-warm-700 mb-1.5">
              {t.admin.passwordLabel}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-warm-200 bg-warm-50 text-warm-900 placeholder-warm-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {loading ? <Spinner /> : null}
            {loading ? t.admin.loggingIn : t.admin.loginButton}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Dog Form (shared by Add + Edit) ─────────────────────────────────────────

interface DogFormPanelProps {
  initial: DogForm;
  existingDog?: Dog;
  onSave: () => void;
  onCancel: () => void;
  t: Translations;
}

function DogFormPanel({ initial, existingDog, onSave, onCancel, t }: DogFormPanelProps) {
  const [form, setForm] = useState<DogForm>(initial);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [currentPhotos, setCurrentPhotos] = useState<{ path: string; url: string }[]>([]);
  const [deletingPhoto, setDeletingPhoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEdit = !!existingDog;

  // Load existing photos when editing
  useEffect(() => {
    if (!isEdit || !supabase || !existingDog) return;
    loadCurrentPhotos(toSlug(existingDog.name));
  }, [isEdit, existingDog]);

  async function loadCurrentPhotos(slug: string) {
    if (!supabase) return;
    const { data, error } = await supabase.storage.from('dog-photos').list(slug, { sortBy: { column: 'name', order: 'asc' } });
    if (error || !data) return;
    const photos = data
      .filter((f) => f.name.endsWith('.jpg') || f.name.endsWith('.jpeg') || f.name.endsWith('.png') || f.name.endsWith('.webp'))
      .map((f) => {
        const path = `${slug}/${f.name}`;
        const { data: urlData } = supabase!.storage.from('dog-photos').getPublicUrl(path);
        return { path, url: urlData.publicUrl };
      });
    setCurrentPhotos(photos);
  }

  async function handleDeletePhoto(path: string) {
    if (!supabase) return;
    setDeletingPhoto(path);
    try {
      await supabase.storage.from('dog-photos').remove([path]);
      setCurrentPhotos((prev) => prev.filter((p) => p.path !== path));
    } finally {
      setDeletingPhoto(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setError('');
    setSaving(true);

    try {
      const slug = toSlug(form.name || (existingDog?.name ?? ''));
      let photo_url = existingDog?.photo_url ?? '';

      // Upload new photos
      if (photoFiles.length > 0) {
        let startIndex = 0;
        if (isEdit) {
          const existingNums = currentPhotos.map((p) => {
            const match = p.path.match(/photo-(\d+)\./);
            return match ? parseInt(match[1], 10) : 0;
          });
          const maxNum = existingNums.length > 0 ? Math.max(...existingNums) : 0;
          if (maxNum === 0) startIndex = 0;
          else if (maxNum === 1) startIndex = 1;
          else startIndex = maxNum - 1;
        }

        const uploadedUrls: string[] = [];
        for (let i = 0; i < photoFiles.length; i++) {
          const slotIndex = startIndex + i;
          const photoNum = indexToPhotoNumber(slotIndex);
          const filename = photoNumberToFilename(photoNum);
          const storagePath = `${slug}/${filename}`;

          const file = photoFiles[i];
          const { error: uploadError } = await supabase.storage
            .from('dog-photos')
            .upload(storagePath, file, { upsert: true, contentType: file.type || 'image/jpeg' });

          if (!uploadError) {
            const { data: urlData } = supabase.storage.from('dog-photos').getPublicUrl(storagePath);
            uploadedUrls.push(urlData.publicUrl);
          }
        }

        if (uploadedUrls.length > 0 && !photo_url) {
          photo_url = uploadedUrls[0];
        } else if (uploadedUrls.length > 0 && !isEdit) {
          photo_url = uploadedUrls[0];
        }
      }

      // If editing and photo_url is the deleted photo, update to first remaining
      if (isEdit) {
        if (!currentPhotos.find((p) => p.url === photo_url) && !photo_url.includes(slug)) {
          photo_url = currentPhotos.length > 0 ? currentPhotos[0].url : '';
        }
        const { data: refreshed } = await supabase.storage.from('dog-photos').list(slug, { sortBy: { column: 'name', order: 'asc' } });
        if (refreshed && refreshed.length > 0) {
          const first = refreshed.find((f) => f.name.endsWith('.jpg') || f.name.endsWith('.jpeg') || f.name.endsWith('.png') || f.name.endsWith('.webp'));
          if (first && !photo_url) {
            const { data: urlData } = supabase.storage.from('dog-photos').getPublicUrl(`${slug}/${first.name}`);
            photo_url = urlData.publicUrl;
          }
        }
      }

      const generatedDescription = buildDescription(form, t);
      const payload = {
        name: form.name,
        size: form.size,
        sex: form.sex || null,
        age: form.age,
        description: generatedDescription,
        photo_url,
        updated_at: new Date().toISOString(),
      };

      if (isEdit && existingDog) {
        const { error: updateError } = await supabase.from('dogs').update(payload).eq('id', existingDog.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from('dogs').insert({ ...payload, is_adopted: false });
        if (insertError) throw insertError;
      }

      onSave();
    } catch (err: any) {
      setError(err?.message ?? t.admin.saveError);
    } finally {
      setSaving(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setPhotoFiles(files);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Name */}
        <div className="sm:col-span-2">
          <label className="block text-sm font-semibold text-warm-700 mb-1.5">{t.admin.formName} *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            className="w-full px-4 py-3 rounded-xl border border-warm-200 bg-warm-50 text-warm-900 placeholder-warm-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400"
            placeholder={t.admin.formNamePlaceholder}
          />
        </div>

        {/* Subtitle (Personality) */}
        <div className="sm:col-span-2">
          <label className="block text-sm font-semibold text-warm-700 mb-1.5">{t.admin.formPersonality}</label>
          <input
            type="text"
            value={form.personality}
            onChange={(e) => setForm({ ...form, personality: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-warm-200 bg-warm-50 text-warm-900 placeholder-warm-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400"
            placeholder={t.admin.formPersonalityPlaceholder}
          />
        </div>

        {/* Size */}
        <div>
          <label className="block text-sm font-semibold text-warm-700 mb-1.5">{t.admin.formSize}</label>
          <select
            value={form.size}
            onChange={(e) => setForm({ ...form, size: e.target.value as DogForm['size'] })}
            className="w-full px-4 py-3 rounded-xl border border-warm-200 bg-warm-50 text-warm-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400"
          >
            <option value="small">{t.sizes.small}</option>
            <option value="medium">{t.sizes.medium}</option>
            <option value="large">{t.sizes.large}</option>
          </select>
        </div>

        {/* Sex */}
        <div>
          <label className="block text-sm font-semibold text-warm-700 mb-1.5">{t.admin.formSex}</label>
          <select
            value={form.sex}
            onChange={(e) => setForm({ ...form, sex: e.target.value as DogForm['sex'] })}
            className="w-full px-4 py-3 rounded-xl border border-warm-200 bg-warm-50 text-warm-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400"
          >
            <option value="">{t.admin.formSexUnknown}</option>
            <option value="female">{t.sexes.female}</option>
            <option value="male">{t.sexes.male}</option>
          </select>
        </div>

        {/* Age */}
        <div>
          <label className="block text-sm font-semibold text-warm-700 mb-1.5">{t.admin.formAge}</label>
          <input
            type="text"
            value={form.age}
            onChange={(e) => setForm({ ...form, age: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-warm-200 bg-warm-50 text-warm-900 placeholder-warm-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400"
            placeholder={t.admin.formAgePlaceholder}
          />
        </div>
      </div>

      {/* Breed + Entry Date */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-semibold text-warm-700 mb-1.5">{t.admin.formBreed}</label>
          <input
            type="text"
            value={form.breed}
            onChange={(e) => setForm({ ...form, breed: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-warm-200 bg-warm-50 text-warm-900 placeholder-warm-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400"
            placeholder={t.admin.formBreedPlaceholder}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-warm-700 mb-1.5">{t.admin.formEntryDate}</label>
          <input
            type="text"
            value={form.entryDate}
            onChange={(e) => setForm({ ...form, entryDate: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-warm-200 bg-warm-50 text-warm-900 placeholder-warm-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400"
            placeholder={t.admin.formEntryDatePlaceholder}
          />
        </div>
      </div>

      {/* Story */}
      <div>
        <label className="block text-sm font-semibold text-warm-700 mb-1.5">{t.admin.formStory}</label>
        <textarea
          value={form.story}
          onChange={(e) => setForm({ ...form, story: e.target.value })}
          rows={4}
          className="w-full px-4 py-3 rounded-xl border border-warm-200 bg-warm-50 text-warm-900 placeholder-warm-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 resize-y"
          placeholder={t.admin.formStoryPlaceholder}
        />
      </div>

      {/* Sociability */}
      <fieldset>
        <legend className="text-sm font-semibold text-warm-700 mb-3">{t.admin.formCompatibility}</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {([
            ['socHumans', t.admin.formHumans],
            ['socMales', t.admin.formMaleDogs],
            ['socFemales', t.admin.formFemaleDogs],
            ['socCats', t.admin.formCats],
          ] as const).map(([field, label]) => (
            <div key={field} className="flex items-center gap-3">
              <span className="text-sm text-warm-700 w-20">{label}</span>
              <select
                value={form[field]}
                onChange={(e) => setForm({ ...form, [field]: e.target.value as 'yes' | 'no' | 'unknown' })}
                className="flex-1 px-3 py-2 rounded-lg border border-warm-200 bg-warm-50 text-warm-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400"
              >
                <option value="unknown">{t.admin.formUnknown}</option>
                <option value="yes">{t.admin.formSociable}</option>
                <option value="no">{t.admin.formNotSociable}</option>
              </select>
            </div>
          ))}
        </div>
      </fieldset>

      {/* Medical */}
      <fieldset>
        <legend className="text-sm font-semibold text-warm-700 mb-3">{t.admin.formMedical}</legend>
        <div className="flex flex-wrap gap-4">
          {([
            ['chipped', t.admin.formChipped],
            ['vaccinated', t.admin.formVaccinated],
            ['sterilized', t.admin.formSterilized],
          ] as const).map(([field, label]) => (
            <label key={field} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form[field]}
                onChange={(e) => setForm({ ...form, [field]: e.target.checked })}
                className="w-4 h-4 rounded border-warm-300 text-primary-500 focus:ring-primary-400"
              />
              <span className="text-sm text-warm-700">{label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Current photos (edit only) */}
      {isEdit && (
        <div>
          <label className="block text-sm font-semibold text-warm-700 mb-3">
            {t.admin.formCurrentPhotos}
            {currentPhotos.length > 0 && (
              <span className="ml-2 text-warm-400 font-normal">({currentPhotos.length} {t.admin.formPhotosCount})</span>
            )}
          </label>
          {currentPhotos.length === 0 ? (
            <p className="text-sm text-warm-400 italic">{t.admin.formNoPhotos}</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {currentPhotos.map((photo) => (
                <div key={photo.path} className="relative group">
                  <img
                    src={photo.url}
                    alt=""
                    className="w-20 h-20 object-cover rounded-xl border border-warm-200"
                    loading="lazy"
                  />
                  <button
                    type="button"
                    onClick={() => handleDeletePhoto(photo.path)}
                    disabled={deletingPhoto === photo.path}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                    title={t.admin.formDeletePhoto}
                  >
                    {deletingPhoto === photo.path ? '…' : '×'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Photo upload */}
      <div>
        <label className="block text-sm font-semibold text-warm-700 mb-1.5">
          {isEdit ? t.admin.formAddPhotos : t.admin.formPhotos}
        </label>
        <div
          className="border-2 border-dashed border-warm-300 rounded-xl p-6 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="text-3xl mb-2">📷</div>
          <p className="text-sm text-warm-600 font-medium">
            {photoFiles.length > 0
              ? `${photoFiles.length} ${t.admin.formFilesSelected}`
              : t.admin.formPhotoClick}
          </p>
          <p className="text-xs text-warm-400 mt-1">{t.admin.formPhotoFormats}</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
        {photoFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {photoFiles.map((f, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-primary-50 text-primary-700 text-xs font-medium px-3 py-1.5 rounded-lg border border-primary-200">
                <span>🖼</span>
                <span className="truncate max-w-32">{f.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
        >
          {saving ? <Spinner /> : null}
          {saving ? t.admin.saving : isEdit ? t.admin.saveChanges : t.admin.addDog}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="px-6 py-3 rounded-xl border border-warm-200 text-warm-700 font-semibold hover:bg-warm-100 transition-colors"
        >
          {t.admin.cancel}
        </button>
      </div>
    </form>
  );
}

// ─── Delete Confirmation Dialog ───────────────────────────────────────────────

function DeleteDialog({
  dog,
  onConfirm,
  onCancel,
  deleting,
  t,
}: {
  dog: Dog;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
  t: Translations;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl border border-warm-200 p-8 w-full max-w-md">
        <div className="text-4xl mb-4 text-center">⚠️</div>
        <h3 className="text-xl font-bold text-warm-900 text-center mb-2">{t.admin.deleteTitle}</h3>
        <p className="text-warm-600 text-sm text-center mb-2">
          {t.admin.deleteConfirm} <strong className="text-warm-900">{dog.name}</strong>?
        </p>
        <p className="text-red-600 text-xs text-center bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6">
          {t.admin.deleteWarning}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {deleting ? <Spinner /> : null}
            {deleting ? t.admin.deleting : t.admin.deleteYes}
          </button>
          <button
            onClick={onCancel}
            disabled={deleting}
            className="flex-1 py-3 rounded-xl border border-warm-200 text-warm-700 font-semibold hover:bg-warm-100 transition-colors"
          >
            {t.admin.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

interface DashboardProps {
  dogs: Dog[];
  onRefresh: () => void;
  onAdd: () => void;
  onEdit: (dog: Dog) => void;
  onLogout: () => void;
  t: Translations;
}

type SizeFilter = 'all' | 'small' | 'medium' | 'large';
type SexFilter = 'all' | 'male' | 'female';
type StatusFilter = 'all' | 'available' | 'adopted';

function Dashboard({ dogs, onRefresh, onAdd, onEdit, onLogout, t }: DashboardProps) {
  const [search, setSearch] = useState('');
  const [sizeFilter, setSizeFilter] = useState<SizeFilter>('all');
  const [sexFilter, setSexFilter] = useState<SexFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Dog | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const sizeLabels: Record<string, string> = {
    small: t.sizes.small,
    medium: t.sizes.medium,
    large: t.sizes.large,
  };
  const sexLabels: Record<string, string> = {
    male: t.sexes.male,
    female: t.sexes.female,
  };

  const activeFilterCount = (sizeFilter !== 'all' ? 1 : 0) + (sexFilter !== 'all' ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0);

  const filtered = dogs.filter((d) => {
    if (sizeFilter !== 'all' && d.size !== sizeFilter) return false;
    if (sexFilter !== 'all' && d.sex !== sexFilter) return false;
    if (statusFilter === 'available' && d.is_adopted) return false;
    if (statusFilter === 'adopted' && !d.is_adopted) return false;
    if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  async function handleToggleAdopted(dog: Dog) {
    if (!supabase || togglingId) return;
    setTogglingId(dog.id);
    try {
      await supabase.from('dogs').update({ is_adopted: !dog.is_adopted, updated_at: new Date().toISOString() }).eq('id', dog.id);
      onRefresh();
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(dog: Dog) {
    if (!supabase) return;
    setDeleting(true);
    try {
      const slug = toSlug(dog.name);
      const { data: files } = await supabase.storage.from('dog-photos').list(slug);
      if (files && files.length > 0) {
        const paths = files.map((f) => `${slug}/${f.name}`);
        await supabase.storage.from('dog-photos').remove(paths);
      }
      await supabase.from('dogs').delete().eq('id', dog.id);
      setDeleteTarget(null);
      onRefresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      {deleteTarget && (
        <DeleteDialog
          dog={deleteTarget}
          onConfirm={() => handleDelete(deleteTarget)}
          onCancel={() => !deleting && setDeleteTarget(null)}
          deleting={deleting}
          t={t}
        />
      )}

      <div className="min-h-screen bg-warm-50">
        {/* Top bar */}
        <header className="bg-white border-b border-warm-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🐾</span>
              <div>
                <span className="font-bold text-warm-900 text-sm">CAPA PVL</span>
                <span className="text-warm-400 text-xs ml-2">Admin</span>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 text-sm text-warm-600 hover:text-warm-900 font-medium px-3 py-2 rounded-lg hover:bg-warm-100 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 015.25 2h5.5A2.25 2.25 0 0113 4.25v2a.75.75 0 01-1.5 0v-2a.75.75 0 00-.75-.75h-5.5a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 00.75-.75v-2a.75.75 0 011.5 0v2A2.25 2.25 0 0110.75 18h-5.5A2.25 2.25 0 013 15.75V4.25z" clipRule="evenodd" />
                <path fillRule="evenodd" d="M19 10a.75.75 0 00-.75-.75H8.704l1.048-1.04a.75.75 0 10-1.004-1.115l-2.5 2.25a.75.75 0 000 1.11l2.5 2.25a.75.75 0 101.004-1.115l-1.048-1.04h9.546A.75.75 0 0019 10z" clipRule="evenodd" />
              </svg>
              {t.admin.logout}
            </button>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-28 md:pb-8">
          {/* Stats + actions bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-bold text-warm-900">{t.admin.dogsTitle}</h2>
              <p className="text-warm-500 text-sm mt-0.5">
                {dogs.length} {t.admin.total} · {dogs.filter((d) => !d.is_adopted).length} {t.admin.available} · {dogs.filter((d) => d.is_adopted).length} {t.admin.adopted}
              </p>
            </div>
            {/* Desktop "Adicionar Cão" button */}
            <button
              onClick={onAdd}
              className="hidden md:flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
              </svg>
              {t.admin.addDog}
            </button>
          </div>

          {/* Search + Filters */}
          <div className="mb-6 space-y-3">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-warm-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                  <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
                </svg>
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t.admin.searchPlaceholder}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-warm-200 bg-white text-warm-900 placeholder-warm-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400"
                />
              </div>
              {/* Mobile filter toggle button */}
              <button
                onClick={() => setFiltersOpen((o) => !o)}
                className={`sm:hidden flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-colors min-h-[44px] ${
                  filtersOpen || activeFilterCount > 0
                    ? 'border-primary-400 bg-primary-50 text-primary-700'
                    : 'border-warm-200 bg-white text-warm-700 hover:bg-warm-50'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M2.628 1.601C5.028 1.206 7.49 1 10 1s4.973.206 7.372.601a.75.75 0 01.628.74v2.288a2.25 2.25 0 01-.659 1.59l-4.682 4.683a2.25 2.25 0 00-.659 1.59v3.037c0 .684-.31 1.33-.844 1.757l-1.937 1.55A.75.75 0 018 18.25v-5.757a2.25 2.25 0 00-.659-1.591L2.659 6.22A2.25 2.25 0 012 4.629V2.34a.75.75 0 01.628-.74z" clipRule="evenodd" />
                </svg>
                {t.admin.filters}
                {activeFilterCount > 0 && (
                  <span className="flex items-center justify-center w-5 h-5 bg-primary-500 text-white text-xs font-bold rounded-full">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>

            {/* Filter dropdowns */}
            <div className={`${filtersOpen ? 'flex' : 'hidden'} sm:flex flex-col sm:flex-row gap-3`}>
              <select
                value={sizeFilter}
                onChange={(e) => setSizeFilter(e.target.value as SizeFilter)}
                className="px-4 py-2.5 rounded-xl border border-warm-200 bg-white text-warm-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 min-h-[44px]"
              >
                <option value="all">{t.admin.allSizes}</option>
                <option value="small">{t.sizes.small}</option>
                <option value="medium">{t.sizes.medium}</option>
                <option value="large">{t.sizes.large}</option>
              </select>
              <select
                value={sexFilter}
                onChange={(e) => setSexFilter(e.target.value as SexFilter)}
                className="px-4 py-2.5 rounded-xl border border-warm-200 bg-white text-warm-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 min-h-[44px]"
              >
                <option value="all">{t.admin.allSexes}</option>
                <option value="male">♂ {t.sexes.male}</option>
                <option value="female">♀ {t.sexes.female}</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="px-4 py-2.5 rounded-xl border border-warm-200 bg-white text-warm-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 min-h-[44px]"
              >
                <option value="all">{t.admin.allStatuses}</option>
                <option value="available">{t.admin.statusAvailable}</option>
                <option value="adopted">{t.admin.statusAdopted}</option>
              </select>
              {activeFilterCount > 0 && (
                <button
                  onClick={() => { setSizeFilter('all'); setSexFilter('all'); setStatusFilter('all'); }}
                  className="text-sm text-warm-500 hover:text-warm-700 font-medium px-3 py-2.5 rounded-xl hover:bg-warm-100 transition-colors whitespace-nowrap min-h-[44px]"
                >
                  {t.admin.clearFilters}
                </button>
              )}
            </div>
          </div>

          {/* ── Mobile cards (below md) ── */}
          <div className="md:hidden">
            {filtered.length === 0 ? (
              <div className="py-20 text-center">
                <div className="text-4xl mb-3">🐾</div>
                <p className="text-warm-500 font-medium">{t.admin.noDogs}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((dog) => (
                  <div
                    key={dog.id}
                    className={`bg-white rounded-2xl border border-warm-200 shadow-sm overflow-hidden transition-opacity ${dog.is_adopted ? 'opacity-60' : ''}`}
                  >
                    {/* Card top: photo + info */}
                    <div className="flex items-start gap-4 p-4">
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-warm-100 flex-shrink-0">
                        {dog.photo_url ? (
                          <img src={dog.photo_url} alt={dog.name} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-warm-300 text-2xl">🐶</div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-warm-900 text-base leading-tight truncate">{dog.name}</h3>
                        </div>
                        <p className="text-warm-500 text-xs mt-1 leading-snug">
                          {[
                            sizeLabels[dog.size] ?? dog.size,
                            dog.sex ? sexLabels[dog.sex] : null,
                            dog.age || null,
                          ].filter(Boolean).join(' · ')}
                        </p>
                        <button
                          onClick={() => handleToggleAdopted(dog)}
                          disabled={togglingId === dog.id}
                          className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors min-h-[32px] ${
                            dog.is_adopted
                              ? 'bg-nature-100 text-nature-700 hover:bg-nature-200'
                              : 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                          }`}
                          title={dog.is_adopted ? t.admin.markAvailable : t.admin.markAdopted}
                        >
                          {togglingId === dog.id ? (
                            <Spinner size="sm" />
                          ) : (
                            <span>{dog.is_adopted ? '✓' : '○'}</span>
                          )}
                          {dog.is_adopted ? t.admin.statusAdopted : t.admin.statusAvailable}
                        </button>
                      </div>
                    </div>

                    {/* Card actions row */}
                    <div className="flex border-t border-warm-100">
                      <button
                        onClick={() => onEdit(dog)}
                        className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold text-warm-600 hover:text-primary-600 hover:bg-primary-50 transition-colors min-h-[44px]"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                          <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
                          <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
                        </svg>
                        {t.admin.edit}
                      </button>
                      <div className="w-px bg-warm-100" />
                      <button
                        onClick={() => setDeleteTarget(dog)}
                        className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold text-warm-600 hover:text-red-600 hover:bg-red-50 transition-colors min-h-[44px]"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                          <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                        </svg>
                        {t.admin.delete}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Desktop table (md and up) ── */}
          <div className="hidden md:block bg-white rounded-2xl border border-warm-200 shadow-sm overflow-hidden">
            {filtered.length === 0 ? (
              <div className="py-20 text-center">
                <div className="text-4xl mb-3">🐾</div>
                <p className="text-warm-500 font-medium">{t.admin.noDogs}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-warm-100 bg-warm-50">
                      <th className="text-left text-xs font-semibold text-warm-500 uppercase tracking-wide px-5 py-3 w-14">{t.admin.photo}</th>
                      <th className="text-left text-xs font-semibold text-warm-500 uppercase tracking-wide px-5 py-3">{t.admin.name}</th>
                      <th className="text-left text-xs font-semibold text-warm-500 uppercase tracking-wide px-4 py-3 hidden sm:table-cell">{t.admin.size}</th>
                      <th className="text-left text-xs font-semibold text-warm-500 uppercase tracking-wide px-4 py-3 hidden md:table-cell">{t.admin.sex}</th>
                      <th className="text-left text-xs font-semibold text-warm-500 uppercase tracking-wide px-4 py-3 hidden lg:table-cell">{t.admin.age}</th>
                      <th className="text-left text-xs font-semibold text-warm-500 uppercase tracking-wide px-4 py-3">{t.admin.status}</th>
                      <th className="text-right text-xs font-semibold text-warm-500 uppercase tracking-wide px-5 py-3">{t.admin.actions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-warm-100">
                    {filtered.map((dog) => (
                      <tr
                        key={dog.id}
                        className={`hover:bg-warm-50 transition-colors ${dog.is_adopted ? 'opacity-50' : ''}`}
                      >
                        {/* Thumbnail */}
                        <td className="px-5 py-3">
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-warm-100 flex-shrink-0">
                            {dog.photo_url ? (
                              <img src={dog.photo_url} alt={dog.name} className="w-full h-full object-cover" loading="lazy" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-warm-300 text-lg">🐶</div>
                            )}
                          </div>
                        </td>

                        {/* Name */}
                        <td className="px-5 py-3">
                          <span className="font-semibold text-warm-900">{dog.name}</span>
                        </td>

                        {/* Size */}
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className="text-warm-600">{sizeLabels[dog.size] ?? dog.size}</span>
                        </td>

                        {/* Sex */}
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-warm-600">{dog.sex ? sexLabels[dog.sex] : '—'}</span>
                        </td>

                        {/* Age */}
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className="text-warm-600">{dog.age || '—'}</span>
                        </td>

                        {/* Status / Toggle */}
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleToggleAdopted(dog)}
                            disabled={togglingId === dog.id}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                              dog.is_adopted
                                ? 'bg-nature-100 text-nature-700 hover:bg-nature-200'
                                : 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                            }`}
                            title={dog.is_adopted ? t.admin.markAvailable : t.admin.markAdopted}
                          >
                            {togglingId === dog.id ? (
                              <Spinner size="sm" />
                            ) : (
                              <span>{dog.is_adopted ? '✓' : '○'}</span>
                            )}
                            {dog.is_adopted ? t.admin.statusAdopted : t.admin.statusAvailable}
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => onEdit(dog)}
                              className="p-2 text-warm-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                              title={t.admin.edit}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
                                <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => setDeleteTarget(dog)}
                              className="p-2 text-warm-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title={t.admin.delete}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer note */}
          <p className="text-xs text-warm-400 text-center mt-6">
            {filtered.length} {t.admin.of} {dogs.length} {t.admin.dogUnit} {t.admin.listed}
          </p>
        </main>

        {/* Mobile FAB */}
        <button
          onClick={onAdd}
          className="md:hidden fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white rounded-full shadow-lg transition-colors"
          aria-label={t.admin.addDog}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6">
            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
          </svg>
        </button>
      </div>
    </>
  );
}

// ─── Main AdminPanel ──────────────────────────────────────────────────────────

export default function AdminPanel({ locale = 'pt' }: { locale?: Locale }) {
  const t = getTranslations(locale);
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [view, setView] = useState<View>('dashboard');
  const [editingDog, setEditingDog] = useState<Dog | null>(null);
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [dogsLoading, setDogsLoading] = useState(false);

  // Check auth on mount
  useEffect(() => {
    if (!supabase) {
      setAuthChecked(true);
      return;
    }
    supabase.auth.getUser().then(({ data }) => {
      setIsLoggedIn(!!data.user);
      setAuthChecked(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session?.user);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load dogs when logged in
  useEffect(() => {
    if (isLoggedIn) loadDogs();
  }, [isLoggedIn]);

  async function loadDogs() {
    if (!supabase) return;
    setDogsLoading(true);
    try {
      const { data } = await supabase.from('dogs').select('*').order('created_at', { ascending: false });
      setDogs(data ?? []);
    } finally {
      setDogsLoading(false);
    }
  }

  async function handleLogout() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setView('dashboard');
  }

  function handleEdit(dog: Dog) {
    setEditingDog(dog);
    setView('edit');
  }

  function handleSaved() {
    setView('dashboard');
    setEditingDog(null);
    loadDogs();
  }

  function handleCancel() {
    setView('dashboard');
    setEditingDog(null);
  }

  // Waiting for auth check
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-warm-50 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // Not logged in
  if (!isLoggedIn) {
    return <LoginScreen onLogin={() => setIsLoggedIn(true)} t={t} />;
  }

  // Add dog view
  if (view === 'add') {
    return (
      <div className="min-h-screen bg-warm-50">
        <header className="bg-white border-b border-warm-200 sticky top-0 z-40">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-3">
            <button onClick={handleCancel} className="p-2 text-warm-500 hover:text-warm-900 hover:bg-warm-100 rounded-lg transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
              </svg>
            </button>
            <div>
              <h1 className="font-bold text-warm-900 text-sm">{t.admin.addDogTitle}</h1>
              <p className="text-warm-400 text-xs">{t.admin.addDogSub}</p>
            </div>
          </div>
        </header>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-2xl border border-warm-200 shadow-sm p-6 sm:p-8">
            <DogFormPanel
              initial={EMPTY_FORM}
              onSave={handleSaved}
              onCancel={handleCancel}
              t={t}
            />
          </div>
        </div>
      </div>
    );
  }

  // Edit dog view
  if (view === 'edit' && editingDog) {
    const base: DogForm = {
      ...EMPTY_FORM,
      name: editingDog.name,
      size: editingDog.size,
      sex: editingDog.sex ?? '',
      age: editingDog.age ?? '',
      description: editingDog.description ?? '',
    };
    const initial = editingDog.description
      ? parseDescriptionToForm(editingDog.description, base, t)
      : base;
    return (
      <div className="min-h-screen bg-warm-50">
        <header className="bg-white border-b border-warm-200 sticky top-0 z-40">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-3">
            <button onClick={handleCancel} className="p-2 text-warm-500 hover:text-warm-900 hover:bg-warm-100 rounded-lg transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
              </svg>
            </button>
            <div>
              <h1 className="font-bold text-warm-900 text-sm">{editingDog.name}</h1>
              <p className="text-warm-400 text-xs">{t.admin.editDogSub}</p>
            </div>
          </div>
        </header>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-2xl border border-warm-200 shadow-sm p-6 sm:p-8">
            <DogFormPanel
              initial={initial}
              existingDog={editingDog}
              onSave={handleSaved}
              onCancel={handleCancel}
              t={t}
            />
          </div>
        </div>
      </div>
    );
  }

  // Dashboard view (default)
  if (dogsLoading) {
    return (
      <div className="min-h-screen bg-warm-50 flex items-center justify-center gap-3 text-warm-500">
        <Spinner size="lg" />
        <span className="font-medium">{t.admin.loading}</span>
      </div>
    );
  }

  return (
    <Dashboard
      dogs={dogs}
      onRefresh={loadDogs}
      onAdd={() => setView('add')}
      onEdit={handleEdit}
      onLogout={handleLogout}
      t={t}
    />
  );
}
