// 궁합 심층 상대 입력(3단계 스펙 §5) — computeDeepMatch가 상대도 완전한 ProfileContext를
// 요구한다. 검증은 순수 함수 — 액션이 신뢰 경계에서 호출.
import { isMatchModeSlug, SLUG_TO_MODE, type MatchMode } from "@/lib/engine/match";

/** 상대 이름 최대 길이 — 유명인 이름을 담기에 충분하되 문구 남용은 막는다. */
const PARTNER_NAME_MAX = 20;

export interface MatchDeepInput {
  birthDate: string;        // "YYYY-MM-DD"
  birthTime: string | null; // "HH:MM" — timeUnknown이면 null
  timeUnknown: boolean;
  mode: MatchMode;          // 슬러그 입력을 한글 모드로 변환해 담는다
  /** 문구에 쓸 상대 호칭. 직접 입력 궁합은 이름을 받지 않아 없고(그때는 "상대"),
   *  유명인 궁합은 인물 이름이 들어온다. 캐시 키에도 포함돼 호칭만 다른 풀이가 섞이지 않는다. */
  partnerName?: string;
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
  if (typeof d.mode !== "string" || !isMatchModeSlug(d.mode)) return null;
  // 이름은 선택 — 없으면 그대로 생략하고, 있으면 형식·길이를 검증한다(어긋나면 입력 전체가 무효).
  let partnerName: string | undefined;
  if (d.partnerName !== undefined) {
    if (typeof d.partnerName !== "string") return null;
    const name = d.partnerName.trim();
    if (!name || name.length > PARTNER_NAME_MAX) return null;
    partnerName = name;
  }
  return {
    birthDate: d.birthDate, birthTime, timeUnknown: d.timeUnknown,
    mode: SLUG_TO_MODE[d.mode],
    ...(partnerName ? { partnerName } : {}),
  };
}
