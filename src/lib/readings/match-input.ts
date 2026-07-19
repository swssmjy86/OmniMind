// 궁합 심층 상대 입력(3단계 스펙 §5) — computeDeepMatch가 상대도 완전한 ProfileContext를
// 요구하므로(MBTI·혈액형 접근) 전부 필수다. 검증은 순수 함수 — 액션이 신뢰 경계에서 호출.
import { isMbti } from "@/lib/engine/mbti";
import { isBloodType } from "@/lib/engine/blood";
import { isMatchModeSlug, SLUG_TO_MODE, type MatchMode } from "@/lib/engine/match";
import type { BloodType, Mbti } from "@/lib/engine/types";

export interface MatchDeepInput {
  birthDate: string;        // "YYYY-MM-DD"
  birthTime: string | null; // "HH:MM" — timeUnknown이면 null
  timeUnknown: boolean;
  mbti: Mbti;
  bloodType: BloodType;
  mode: MatchMode;          // 슬러그 입력을 한글 모드로 변환해 담는다
}

/** 클라이언트가 보낸 값 → 검증된 입력. 하나라도 어긋나면 null. */
export function parseMatchDeepInput(raw: unknown): MatchDeepInput | null {
  if (raw === null || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  if (typeof d.birthDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(d.birthDate)) return null;
  if (typeof d.timeUnknown !== "boolean") return null;
  let birthTime: string | null = null;
  if (!d.timeUnknown) {
    if (typeof d.birthTime !== "string") return null;
    const t = /^(\d{2}):(\d{2})$/.exec(d.birthTime);
    if (!t || Number(t[1]) > 23 || Number(t[2]) > 59) return null;
    birthTime = d.birthTime;
  }
  if (typeof d.mbti !== "string" || !isMbti(d.mbti)) return null;
  if (typeof d.bloodType !== "string" || !isBloodType(d.bloodType)) return null;
  if (typeof d.mode !== "string" || !isMatchModeSlug(d.mode)) return null;
  return {
    birthDate: d.birthDate, birthTime, timeUnknown: d.timeUnknown,
    mbti: d.mbti, bloodType: d.bloodType, mode: SLUG_TO_MODE[d.mode],
  };
}
