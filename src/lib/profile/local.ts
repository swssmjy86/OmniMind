// 익명 앱의 로컬 프로필 — 온보딩에서 저장한 draft(localStorage)가 유일한 프로필 저장소다.
// 서버·계정 없이, 순수 엔진(computeProfile)으로 매번 ProfileContext를 계산한다.
// 클라이언트 전용(localStorage 접근). 서버 컴포넌트에서 호출 금지.
import { computeProfile, type ProfileContext } from "@/lib/engine";
import { loadDraft, type Draft } from "@/app/onboarding/draft";
import { sessionStore } from "@/lib/session-store";

export interface LocalProfile {
  draft: Draft;
  ctx: ProfileContext;
  /** 표시용 이름(빈 값이면 "당신"). */
  nickname: string;
}

/** 저장된 로컬 프로필을 읽어 계산한다. 프로필이 없거나 입력이 깨졌으면 null. */
export function loadLocalProfile(): LocalProfile | null {
  const draft = loadDraft();
  if (!draft || !/^\d{4}-\d{2}-\d{2}$/.test(draft.birthDate)) return null;
  try {
    const ctx = computeProfile({
      birthDate: draft.birthDate,
      birthTime: draft.timeUnknown ? null : draft.birthTime,
      timeUnknown: draft.timeUnknown,
      gender: draft.gender ?? undefined,
    });
    return { draft, ctx, nickname: draft.nickname?.trim() || "당신" };
  } catch {
    return null;
  }
}

// "함께한 날수" 계산용 최초 방문 시각(localStorage). 프로필과 별개로, 처음 읽는 순간
// 한 번 심는다. 서버 계정의 profiles.created_at을 대체한다.
const FIRST_SEEN_KEY = "om_first_seen";

/** 최초 방문 시각(ms). 없으면 지금으로 심고 반환한다. */
export function firstSeenAt(): number {
  try {
    const raw = sessionStore.getItem(FIRST_SEEN_KEY);
    const n = raw ? Number(raw) : NaN;
    if (Number.isFinite(n)) return n;
    const now = Date.now();
    sessionStore.setItem(FIRST_SEEN_KEY, String(now));
    return now;
  } catch {
    return Date.now();
  }
}
