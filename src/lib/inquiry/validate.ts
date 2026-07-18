// 문의 입력 검증(§9.2) — 순수 함수. 서버 액션이 insert 전에 반드시 거친다.

export const SUBJECT_MAX = 100;
export const BODY_MAX = 2000;
const EMAIL_MAX = 254;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface InquiryInput {
  email: string;
  subject: string;
  body: string;
}

export type InquiryValidation =
  | { ok: true; value: InquiryInput }
  | { ok: false; reason: "email" | "subject" | "body" };

export function validateInquiry(raw: InquiryInput): InquiryValidation {
  const email = raw.email.trim();
  const subject = raw.subject.trim();
  const body = raw.body.trim();
  if (!email || email.length > EMAIL_MAX || !EMAIL_RE.test(email))
    return { ok: false, reason: "email" };
  if (!subject || subject.length > SUBJECT_MAX) return { ok: false, reason: "subject" };
  if (!body || body.length > BODY_MAX) return { ok: false, reason: "body" };
  return { ok: true, value: { email, subject, body } };
}
