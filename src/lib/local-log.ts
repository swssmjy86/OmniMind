// 마음 챗·고민 상담 기록 저장소 — 세션 한정 인메모리(sessionStore). 새로고침하면 사라진다
// (완전 세션 한정, 2026-08-01). 서버·계정·디스크 저장 없음. 클라이언트 전용.
import { sessionStore } from "@/lib/session-store";

/** key에 저장된 배열을 읽는다. 없거나 깨졌으면 빈 배열. */
export function loadLog<T>(key: string): T[] {
  try {
    const raw = sessionStore.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

/** key에 배열을 저장한다. 실패는 조용히 무시(용량 초과 등). */
export function saveLog<T>(key: string, items: T[]): void {
  try {
    sessionStore.setItem(key, JSON.stringify(items));
  } catch {
    /* 저장 실패는 치명적이지 않다 — 화면 상태는 이미 반영됨 */
  }
}

/** 짧은 로컬 id — 낙관적 렌더·삭제 대상 식별용(서버 저장 없음). */
export function localId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    // 구형 환경 폴백 — 충돌 가능성은 로컬 단일 기기라 무시 가능.
    return `id-${Math.random().toString(36).slice(2)}`;
  }
}
