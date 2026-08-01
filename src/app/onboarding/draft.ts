// 온보딩 draft — 세션 한정 인메모리에 담는다(sessionStore). 새로고침하면 사라진다
// (완전 세션 한정, 2026-08-01). 한 세션 안에서는 온보딩→나·마음·고민이 이 값을 공유한다.
import { sessionStore } from "@/lib/session-store";

export interface Draft {
  nickname: string;
  birthDate: string;
  birthTime: string;
  timeUnknown: boolean;
  /** 선택 — 있으면 대운(10년 흐름)까지 계산. 구버전 draft 호환을 위해 optional */
  gender?: "male" | "female" | null;
  /** 풀이 입력 시트(2026-07-23) — 보조축용. 구버전 draft 호환을 위해 optional */
  mbti?: string | null;
  blood?: "A" | "B" | "O" | "AB" | null;
}

export const DRAFT_KEY = "om_onboarding_draft";

/** 저장 재시도가 가능한(온보딩을 끝까지 채운) draft인지. */
export function isCompleteDraft(d: Draft): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(d.birthDate) &&
    (d.timeUnknown || /^\d{2}:\d{2}$/.test(d.birthTime))
  );
}

export function saveDraft(d: Draft): void {
  try {
    sessionStore.setItem(DRAFT_KEY, JSON.stringify(d));
  } catch {
    // 저장 불가(시크릿 모드 등)여도 온보딩은 계속
  }
}

export function loadDraft(): Draft | null {
  try {
    const raw = sessionStore.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Partial<Draft>;
    if (
      typeof d.nickname !== "string" ||
      typeof d.birthDate !== "string" ||
      typeof d.birthTime !== "string" ||
      typeof d.timeUnknown !== "boolean" ||
      (d.gender != null && d.gender !== "male" && d.gender !== "female") ||
      (d.mbti != null && typeof d.mbti !== "string") ||
      (d.blood != null && !["A", "B", "O", "AB"].includes(d.blood))
    )
      return null;
    return d as Draft;
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  try {
    sessionStore.removeItem(DRAFT_KEY);
  } catch {
    // 무시
  }
}
