import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { getTranslations, type Locale } from '../i18n';

const SHELTER_EMAIL = 'capa.geralpvl@gmail.com';

type VisitScheduleSource = 'dog' | 'footer';

interface VisitScheduleProps {
  locale?: Locale;
  dogName?: string;
  source?: VisitScheduleSource;
  className?: string;
}

export default function VisitSchedule({ locale = 'pt', dogName, source = 'dog', className }: VisitScheduleProps) {
  const t = getTranslations(locale);
  const [isOpen, setIsOpen] = useState(false);
  const [mailtoHref, setMailtoHref] = useState('');
  const [showMailtoNote, setShowMailtoNote] = useState(false);

  const isFooter = source === 'footer';
  const contextLabel = isFooter ? t.footer.visitEmailContextLabel : t.dogProfile.visitDogLabel;
  const contextValue = isFooter ? t.footer.visitEmailContextValue : dogName || t.dogProfile.visitNotProvided;
  const modalTitle = isFooter ? t.footer.visitFormTitle : t.dogProfile.visitModalTitle;
  const modalIntro = isFooter ? t.footer.visitFormIntro : t.dogProfile.visitModalIntro;
  const bodyIntro = isFooter ? t.footer.visitEmailBodyIntro : t.dogProfile.visitBodyIntro;
  const emailSubject = isFooter ? t.footer.visitEmailSubject : t.dogProfile.visitEmailSubject;
  const buttonLabel = isFooter ? t.footer.visitScheduleButton : t.dogProfile.scheduleVisit;
  const defaultClassName = isFooter
    ? 'mt-4'
    : 'rounded-[2rem] border border-playful-orange/20 bg-white/88 p-5 text-center shadow-pillowy sm:p-6';

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const openModal = () => {
    setShowMailtoNote(false);
    setIsOpen(true);
  };
  const closeModal = () => setIsOpen(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;

    const data = new FormData(form);
    const get = (name: string) => String(data.get(name) ?? '').trim();
    const phone = get('visit_phone') || t.dogProfile.visitNotProvided;
    const message = get('visit_message') || t.dogProfile.visitNotProvided;

    const body = [
      bodyIntro,
      '',
      `${contextLabel}: ${contextValue}`,
      `${t.dogProfile.visitNameLabel}: ${get('visit_name')}`,
      `${t.dogProfile.visitEmailLabel}: ${get('visit_email')}`,
      `${t.dogProfile.visitPhoneLabel}: ${phone}`,
      `${t.dogProfile.visitTimeLabel}: ${get('visit_time')}`,
      `${t.dogProfile.visitMessageLabel}: ${message}`,
      '',
      `${t.dogProfile.visitPageLabel}: ${window.location.href}`,
    ].join('\n');

    const mailto = `mailto:${SHELTER_EMAIL}?subject=${encodeURIComponent(`${emailSubject} — ${contextValue}`)}&body=${encodeURIComponent(body)}`;
    setMailtoHref(mailto);
    setShowMailtoNote(true);

    if (form.dataset.skipMailLaunch !== 'true') {
      window.location.href = mailto;
    }
  };

  const modal: ReactNode = (
    <div
      data-visit-modal={source}
      className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-playful-ink/55 px-4 py-4 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="visit-modal-title"
      aria-describedby="visit-modal-intro"
      onClick={(event) => {
        if (event.target === event.currentTarget) closeModal();
      }}
    >
      <div data-visit-modal-panel className="relative w-full max-w-2xl overflow-y-auto rounded-[2rem] border-2 border-playful-line bg-playful-canvas p-5 text-left shadow-pillowy-lg sm:max-h-[calc(100svh-2rem)] sm:p-7" style={{ maxHeight: 'calc(100svh - 2rem)' }}>
        <button
          data-visit-close
          type="button"
          onClick={closeModal}
          className="playful-focus absolute right-4 top-4 rounded-full border border-playful-line bg-white px-3 py-2 text-sm font-extrabold text-playful-orange-dark shadow-sm"
          aria-label={t.dogProfile.visitClose}
        >
          ×
        </button>
        <span className="text-xs font-extrabold uppercase tracking-[0.24em] text-playful-orange-dark">{contextValue}</span>
        <h2 id="visit-modal-title" data-visit-modal-title className="mt-2 pr-10 font-playful-display text-3xl font-extrabold tracking-[-0.03em] text-playful-orange-dark">
          {modalTitle}
        </h2>
        <p id="visit-modal-intro" className="mt-3 text-sm font-semibold leading-7 text-playful-muted sm:text-base">
          {modalIntro}
        </p>

        <form data-visit-form={source} className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-extrabold text-playful-orange-dark">
              {t.dogProfile.visitNameLabel}
              <input name="visit_name" required className="mt-2 w-full rounded-[1.2rem] border border-playful-line bg-white px-4 py-3 text-base font-semibold text-playful-ink shadow-sm" autoComplete="name" />
            </label>
            <label className="block text-sm font-extrabold text-playful-orange-dark">
              {t.dogProfile.visitEmailLabel}
              <input name="visit_email" type="email" required className="mt-2 w-full rounded-[1.2rem] border border-playful-line bg-white px-4 py-3 text-base font-semibold text-playful-ink shadow-sm" autoComplete="email" />
            </label>
            <label className="block text-sm font-extrabold text-playful-orange-dark">
              {t.dogProfile.visitPhoneLabel}
              <input name="visit_phone" type="tel" className="mt-2 w-full rounded-[1.2rem] border border-playful-line bg-white px-4 py-3 text-base font-semibold text-playful-ink shadow-sm" autoComplete="tel" placeholder={t.dogProfile.visitPhonePlaceholder} />
            </label>
            <label className="block text-sm font-extrabold text-playful-orange-dark">
              {t.dogProfile.visitTimeLabel}
              <input name="visit_time" type="datetime-local" required className="mt-2 w-full rounded-[1.2rem] border border-playful-line bg-white px-4 py-3 text-base font-semibold text-playful-ink shadow-sm" />
            </label>
          </div>
          <label className="block text-sm font-extrabold text-playful-orange-dark">
            {t.dogProfile.visitMessageLabel}
            <textarea name="visit_message" rows={4} className="mt-2 w-full rounded-[1.2rem] border border-playful-line bg-white px-4 py-3 text-base font-semibold text-playful-ink shadow-sm" placeholder={t.dogProfile.visitMessagePlaceholder} />
          </label>

          {showMailtoNote && mailtoHref && (
            <p data-visit-mailto-note className="rounded-[1.25rem] border border-playful-line bg-white/85 px-4 py-3 text-sm font-bold leading-6 text-playful-muted">
              {t.dogProfile.visitFallbackNote}{' '}
              <a data-visit-mailto href={mailtoHref} className="playful-focus text-playful-orange-dark underline decoration-playful-orange/40 decoration-2 underline-offset-4 hover:text-playful-orange">
                {t.dogProfile.visitOpenEmail}
              </a>
            </p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button data-visit-close type="button" onClick={closeModal} className="playful-focus rounded-full border-2 border-playful-orange bg-white px-6 py-3 font-playful-display text-sm font-extrabold text-playful-orange-dark shadow-pillowy">
              {t.dogProfile.visitClose}
            </button>
            <button type="submit" className="squishy playful-focus rounded-full bg-playful-orange px-6 py-3 font-playful-display text-sm font-extrabold text-white shadow-squish">
              {t.dogProfile.visitSubmit}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <div className={className ?? defaultClassName} data-visit-cta data-visit-source={source}>
      <button
        type="button"
        onClick={openModal}
        data-visit-open={source}
        className={isFooter
          ? 'squishy playful-focus inline-flex w-full items-center justify-center gap-2 rounded-full bg-playful-orange px-5 py-3 font-playful-display text-sm font-extrabold text-white shadow-squish'
          : 'squishy playful-focus inline-flex w-full items-center justify-center gap-2 rounded-full bg-playful-orange px-7 py-4 font-playful-display text-base font-extrabold text-white shadow-squish sm:w-auto'}
        aria-haspopup="dialog"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden="true">
          <path fillRule="evenodd" d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2zm-1 5.5A1.25 1.25 0 003.5 8.75v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5a1.25 1.25 0 00-1.25-1.25H4.75z" clipRule="evenodd" />
        </svg>
        {buttonLabel}
      </button>
      {!isFooter && <p className="mx-auto mt-3 max-w-xl text-sm font-bold leading-6 text-playful-muted">{t.dogProfile.scheduleVisitIntro}</p>}
      {isOpen && typeof document !== 'undefined' ? createPortal(modal, document.body) : null}
    </div>
  );
}
