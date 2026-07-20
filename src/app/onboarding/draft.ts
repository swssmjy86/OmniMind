// 온보딩 draft 보존 — 로그인 왕복(OAuth 리다이렉트) 동안 입력을 잃지 않기 위해
// localStorage에 저장하고, 복귀(?resume=1) 시 자동으로 저장을 이어간다.

export interface Draft {
  nickname: string;
  birthDate: string;
  birthTime: string;
  timeUnknown: boolean;
  /** 선택 — 있으면 대운(10년 흐름)까지 계산. 구버전 draft 호환을 위해 optional */
  gender?: "male" | "female" | null;
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
    localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
  } catch {
    // 저장 불가(시크릿 모드 등)여도 온보딩은 계속
  }
}

export function loadDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Partial<Draft>;
    if (
      typeof d.nickname !== "string" ||
      typeof d.birthDate !== "string" ||
      typeof d.birthTime !== "string" ||
      typeof d.timeUnknown !== "boolean" ||
      (d.gender != null && d.gender !== "male" && d.gender !== "female")
    )
      return null;
    return d as Draft;
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // 무시
  }
}
