import { useState, type FormEvent } from 'react';
import type { Locale } from '../i18n';
import { submitFormSubmission } from '../lib/formSubmission';

const SHELTER_EMAIL = 'capa.geralpvl@gmail.com';
const EUROPEAN_DATE_TIME_PATTERN = /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/;

type VolunteerFormProps = {
  locale?: Locale;
};

type VolunteerCopy = {
  eyebrow: string;
  title: string;
  intro: string;
  nameLabel: string;
  emailLabel: string;
  phoneLabel: string;
  phonePlaceholder: string;
  timeLabel: string;
  timePlaceholder: string;
  timeHelp: string;
  timeInvalid: string;
  workTypesLabel: string;
  workTypesHelp: string;
  workTypesRequired: string;
  messageLabel: string;
  messagePlaceholder: string;
  submit: string;
  submitting: string;
  sent: string;
  fallbackNote: string;
  openEmail: string;
  notProvided: string;
  subject: string;
  bodyIntro: string;
  pageLabel: string;
  selectedWorkLabel: string;
  contextLabel: string;
  contextValue: string;
  workOptions: string[];
};

const COPY: Record<Locale, VolunteerCopy> = {
  pt: {
    eyebrow: 'Voluntariado',
    title: 'Agenda uma altura para ajudar',
    intro: 'Diz-nos quando podes vir e que tipo de ajuda consegues oferecer. A equipa responde por email para combinar os detalhes.',
    nameLabel: 'Nome',
    emailLabel: 'Email',
    phoneLabel: 'Telefone (opcional)',
    phonePlaceholder: '+351 912 345 678',
    timeLabel: 'Dia e hora pretendidos',
    timePlaceholder: 'dd/mm/aaaa hh:mm',
    timeHelp: 'Usa formato europeu: dia/mês/ano e hora 24h, por exemplo 05/07/2026 10:30.',
    timeInvalid: 'Indica a data e hora no formato dd/mm/aaaa hh:mm, por exemplo 05/07/2026 10:30.',
    workTypesLabel: 'Tipo de voluntariado',
    workTypesHelp: 'Podes escolher mais do que uma opção.',
    workTypesRequired: 'Escolhe pelo menos um tipo de voluntariado.',
    messageLabel: 'Mensagem',
    messagePlaceholder: 'Conta-nos a tua disponibilidade, experiência com animais ou alguma pergunta.',
    submit: 'Enviar pedido de voluntariado',
    submitting: 'A enviar…',
    sent: 'Pedido enviado. A equipa da CAPA recebeu os dados e responderá por email.',
    fallbackNote: 'Não conseguimos confirmar o envio automático. Usa este link para enviar o email preparado:',
    openEmail: 'Abrir email preparado',
    notProvided: 'Não indicado',
    subject: 'Pedido de voluntariado',
    bodyIntro: 'Novo pedido de voluntariado através do site CAPA.',
    pageLabel: 'Página',
    selectedWorkLabel: 'Tipo(s) de voluntariado',
    contextLabel: 'Voluntariado',
    contextValue: 'Agenda de voluntariado CAPA',
    workOptions: [
      'Passear cães',
      'Cuidados no abrigo',
      'Limpeza e manutenção',
      'Fotografar animais',
      'Campanhas e eventos',
      'Divulgação nas redes sociais',
      'Transporte de animais ou donativos',
    ],
  },
  en: {
    eyebrow: 'Volunteering',
    title: 'Schedule a time to volunteer',
    intro: 'Tell us when you can come and what kind of help you are willing to do. The shelter team will reply by email to coordinate details.',
    nameLabel: 'Name',
    emailLabel: 'Email',
    phoneLabel: 'Phone (optional)',
    phonePlaceholder: '+351 912 345 678',
    timeLabel: 'Preferred date and time',
    timePlaceholder: 'dd/mm/yyyy hh:mm',
    timeHelp: 'Use European format: day/month/year and 24-hour time, for example 05/07/2026 10:30.',
    timeInvalid: 'Enter the date and time as dd/mm/yyyy hh:mm, for example 05/07/2026 10:30.',
    workTypesLabel: 'Volunteer work types',
    workTypesHelp: 'You can choose more than one option.',
    workTypesRequired: 'Choose at least one volunteer work type.',
    messageLabel: 'Message',
    messagePlaceholder: 'Tell us about your availability, animal experience, or any questions.',
    submit: 'Send volunteer request',
    submitting: 'Sending…',
    sent: 'Request sent. CAPA received the details and will reply by email.',
    fallbackNote: 'We could not confirm automatic sending. Use this link to send the prepared email:',
    openEmail: 'Open prepared email',
    notProvided: 'Not provided',
    subject: 'Volunteer request',
    bodyIntro: 'New volunteer request from the CAPA website.',
    pageLabel: 'Page',
    selectedWorkLabel: 'Volunteer work type(s)',
    contextLabel: 'Volunteering',
    contextValue: 'CAPA volunteer scheduling',
    workOptions: [
      'Dog walking',
      'Shelter animal care',
      'Cleaning and maintenance',
      'Animal photography',
      'Campaigns and events',
      'Social media outreach',
      'Transporting animals or donations',
    ],
  },
};

function formatEuropeanDateTimeInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 12);
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);
  const hour = digits.slice(8, 10);
  const minute = digits.slice(10, 12);

  if (digits.length <= 2) return day;
  if (digits.length <= 4) return `${day}/${month}`;
  if (digits.length <= 8) return `${day}/${month}/${year}`;
  if (digits.length <= 10) return `${day}/${month}/${year} ${hour}`;
  return `${day}/${month}/${year} ${hour}:${minute}`;
}

function isValidEuropeanDateTime(value: string): boolean {
  if (!EUROPEAN_DATE_TIME_PATTERN.test(value)) return false;
  const [, dayRaw, monthRaw, yearRaw, hourRaw, minuteRaw] = value.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/) ?? [];
  const day = Number(dayRaw);
  const month = Number(monthRaw);
  const year = Number(yearRaw);
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (!day || !month || !yearRaw || month < 1 || month > 12 || hour > 23 || minute > 59) return false;
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
    && date.getUTCHours() === hour
    && date.getUTCMinutes() === minute;
}

export default function VolunteerForm({ locale = 'pt' }: VolunteerFormProps) {
  const t = COPY[locale];
  const [mailtoHref, setMailtoHref] = useState('');
  const [showMailtoNote, setShowMailtoNote] = useState(false);
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'sent' | 'fallback'>('idle');
  const [workTypeError, setWorkTypeError] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const timeInput = form.elements.namedItem('volunteer_time') as HTMLInputElement | null;
    timeInput?.setCustomValidity(
      timeInput.value && isValidEuropeanDateTime(timeInput.value)
        ? ''
        : t.timeInvalid,
    );

    const data = new FormData(form);
    const workTypes = data.getAll('volunteer_work').map((value) => String(value).trim()).filter(Boolean);
    setWorkTypeError(workTypes.length > 0 ? '' : t.workTypesRequired);

    if (!form.reportValidity() || workTypes.length === 0) return;

    const get = (name: string) => String(data.get(name) ?? '').trim();
    const phone = get('volunteer_phone');
    const message = get('volunteer_message');
    const workTypesText = workTypes.join(', ');

    const body = [
      t.bodyIntro,
      '',
      `${t.nameLabel}: ${get('volunteer_name')}`,
      `${t.emailLabel}: ${get('volunteer_email')}`,
      `${t.phoneLabel}: ${phone || t.notProvided}`,
      `${t.timeLabel}: ${get('volunteer_time')}`,
      `${t.selectedWorkLabel}: ${workTypesText}`,
      `${t.messageLabel}: ${message || t.notProvided}`,
      '',
      `${t.pageLabel}: ${window.location.href}`,
    ].join('\n');

    const mailto = `mailto:${SHELTER_EMAIL}?subject=${encodeURIComponent(t.subject)}&body=${encodeURIComponent(body)}`;
    setMailtoHref(mailto);
    setShowMailtoNote(false);
    setSubmitState('submitting');

    const result = await submitFormSubmission({
      kind: 'volunteer',
      locale,
      source: 'volunteer-form',
      pageUrl: window.location.href,
      contextLabel: t.contextLabel,
      contextValue: t.contextValue,
      name: get('volunteer_name'),
      email: get('volunteer_email'),
      phone,
      preferredTime: get('volunteer_time'),
      workTypes,
      message,
      website: get('website'),
    }, { skipBackend: form.dataset.skipBackend === 'true' });

    if (result.status === 'sent') {
      setSubmitState('sent');
      form.reset();
      setWorkTypeError('');
      return;
    }

    setSubmitState('fallback');
    setShowMailtoNote(true);

    if (form.dataset.skipMailLaunch !== 'true') {
      window.location.href = mailto;
    }
  };

  return (
    <section data-volunteer-form-section className="relative z-10 mx-auto max-w-4xl rounded-[2.5rem] border-2 border-playful-orange/15 bg-white/90 p-5 shadow-pillowy-lg sm:p-8 lg:p-10" aria-labelledby="volunteer-form-heading">
      <div className="mb-7 text-center">
        <span className="inline-flex -rotate-1 rounded-full border border-playful-line bg-playful-peach px-4 py-2 text-xs font-extrabold uppercase tracking-[0.22em] text-playful-orange-dark shadow-sm">
          {t.eyebrow}
        </span>
        <h1 id="volunteer-form-heading" className="mx-auto mt-4 max-w-3xl font-playful-display text-4xl font-extrabold tracking-[-0.045em] text-playful-orange-dark sm:text-5xl">
          {t.title}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base font-medium leading-7 text-playful-muted sm:text-lg sm:leading-8">
          {t.intro}
        </p>
      </div>

      <form data-volunteer-form className="space-y-5" onSubmit={handleSubmit}>
        <label className="hidden" aria-hidden="true">
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-extrabold text-playful-orange-dark">
            {t.nameLabel}
            <input name="volunteer_name" required className="mt-2 w-full rounded-[1.2rem] border border-playful-line bg-white px-4 py-3 text-base font-semibold text-playful-ink shadow-sm" autoComplete="name" />
          </label>
          <label className="block text-sm font-extrabold text-playful-orange-dark">
            {t.emailLabel}
            <input name="volunteer_email" type="email" required className="mt-2 w-full rounded-[1.2rem] border border-playful-line bg-white px-4 py-3 text-base font-semibold text-playful-ink shadow-sm" autoComplete="email" />
          </label>
          <label className="block text-sm font-extrabold text-playful-orange-dark">
            {t.phoneLabel}
            <input name="volunteer_phone" type="tel" className="mt-2 w-full rounded-[1.2rem] border border-playful-line bg-white px-4 py-3 text-base font-semibold text-playful-ink shadow-sm" autoComplete="tel" placeholder={t.phonePlaceholder} />
          </label>
          <label className="block text-sm font-extrabold text-playful-orange-dark">
            {t.timeLabel}
            <input
              name="volunteer_time"
              type="text"
              required
              inputMode="numeric"
              autoComplete="off"
              maxLength={16}
              pattern="[0-9]{2}/[0-9]{2}/[0-9]{4} [0-9]{2}:[0-9]{2}"
              placeholder={t.timePlaceholder}
              title={t.timeHelp}
              aria-describedby="volunteer-time-help"
              onInput={(event: FormEvent<HTMLInputElement>) => {
                const input = event.currentTarget;
                input.value = formatEuropeanDateTimeInput(input.value);
                input.setCustomValidity('');
              }}
              onBlur={(event: FormEvent<HTMLInputElement>) => {
                const input = event.currentTarget;
                if (!input.value) {
                  input.setCustomValidity('');
                  return;
                }
                input.setCustomValidity(isValidEuropeanDateTime(input.value) ? '' : t.timeInvalid);
              }}
              className="mt-2 w-full rounded-[1.2rem] border border-playful-line bg-white px-4 py-3 text-base font-semibold text-playful-ink shadow-sm"
            />
            <span id="volunteer-time-help" className="mt-1 block text-xs font-bold leading-5 text-playful-muted">
              {t.timeHelp}
            </span>
          </label>
        </div>

        <fieldset className="rounded-[1.6rem] border border-playful-line bg-playful-cream/70 p-4 sm:p-5" aria-describedby="volunteer-work-help volunteer-work-error">
          <legend className="px-2 text-sm font-extrabold text-playful-orange-dark">{t.workTypesLabel}</legend>
          <p id="volunteer-work-help" className="mb-4 text-xs font-bold leading-5 text-playful-muted">{t.workTypesHelp}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {t.workOptions.map((option) => (
              <label key={option} className="flex items-start gap-3 rounded-[1.1rem] border border-playful-line bg-white/85 px-4 py-3 text-sm font-bold leading-6 text-playful-muted shadow-sm">
                <input
                  data-volunteer-work-option
                  name="volunteer_work"
                  type="checkbox"
                  value={option}
                  onChange={() => setWorkTypeError('')}
                  className="mt-1 h-5 w-5 accent-playful-orange"
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
          {workTypeError && (
            <p id="volunteer-work-error" data-volunteer-work-error className="mt-3 text-sm font-extrabold text-playful-orange-dark" aria-live="polite">
              {workTypeError}
            </p>
          )}
        </fieldset>

        <label className="block text-sm font-extrabold text-playful-orange-dark">
          {t.messageLabel}
          <textarea name="volunteer_message" rows={5} className="mt-2 w-full rounded-[1.2rem] border border-playful-line bg-white px-4 py-3 text-base font-semibold text-playful-ink shadow-sm" placeholder={t.messagePlaceholder} />
        </label>

        {submitState === 'sent' && (
          <p data-volunteer-success className="rounded-[1.25rem] border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold leading-6 text-green-800" aria-live="polite">
            {t.sent}
          </p>
        )}

        {showMailtoNote && mailtoHref && (
          <p data-volunteer-mailto-note className="rounded-[1.25rem] border border-playful-line bg-white/85 px-4 py-3 text-sm font-bold leading-6 text-playful-muted">
            {t.fallbackNote}{' '}
            <a data-volunteer-mailto href={mailtoHref} className="playful-focus text-playful-orange-dark underline decoration-playful-orange/40 decoration-2 underline-offset-4 hover:text-playful-orange">
              {t.openEmail}
            </a>
          </p>
        )}

        <div className="flex justify-end">
          <button type="submit" disabled={submitState === 'submitting'} className="squishy playful-focus w-full rounded-full bg-playful-orange px-7 py-4 font-playful-display text-base font-extrabold text-white shadow-squish disabled:cursor-wait disabled:opacity-70 sm:w-auto">
            {submitState === 'submitting' ? t.submitting : t.submit}
          </button>
        </div>
      </form>
    </section>
  );
}
