const API_BASE_URL = (import.meta.env.PUBLIC_CAPA_API_URL || '').replace(/\/$/, '');

export type FormSubmissionKind = 'sponsorship' | 'mbway' | 'visit' | 'adoption_interest';

export type FormSubmissionPayload = {
  kind: FormSubmissionKind;
  locale: 'pt' | 'en';
  source: string;
  pageUrl: string;
  contextLabel?: string;
  contextValue?: string;
  name?: string;
  email?: string;
  phone?: string;
  preferredTime?: string;
  amount?: string;
  business?: string;
  contributionMethod?: string;
  message?: string;
  website?: string;
};

export type FormSubmissionResult =
  | { status: 'sent'; submissionId?: string; dryRun?: boolean }
  | { status: 'fallback'; error?: string; submissionId?: string };

type SubmitOptions = {
  skipBackend?: boolean;
};

export async function submitFormSubmission(payload: FormSubmissionPayload, options: SubmitOptions = {}): Promise<FormSubmissionResult> {
  if (options.skipBackend || !API_BASE_URL) return { status: 'fallback', error: 'Backend unavailable' };

  try {
    const response = await fetch(`${API_BASE_URL}/forms/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await response.json().catch(() => ({}));
    if (response.ok && body?.ok) {
      return { status: 'sent', submissionId: body.submissionId, dryRun: Boolean(body.dryRun) };
    }
    return {
      status: 'fallback',
      error: typeof body?.error === 'string' ? body.error : `Backend returned ${response.status}`,
      submissionId: typeof body?.submissionId === 'string' ? body.submissionId : undefined,
    };
  } catch (error) {
    return { status: 'fallback', error: error instanceof Error ? error.message : 'Network error' };
  }
}
