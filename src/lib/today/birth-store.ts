// 오늘의운세 비로그인 입력(스펙 §3) — localStorage 전용. 서버 저장 없음(스펙 §8).
// 파싱·검증은 순수 함수로 분리해 테스트한다. localStorage 접근은 클라이언트 컴포넌트 몫.

export interface TodayBirth {
  birthDate: string;                 // "YYYY-MM-DD"
  birthTime: string;                 // "HH:MM" — timeUnknown이면 "" 허용
  timeUnknown: boolean;
  gender: "male" | "female" | null;  // 선택
}

export const TODAY_BIRTH_KEY = "om-today-birth";

/** localStorage 원문 → TodayBirth. 형식이 하나라도 어긋나면 null(입력 다시 받기). */
export function parseTodayBirth(raw: string | null): TodayBirth | null {
  if (!raw) return null;
  try {
    const d = JSON.parse(raw) as Partial<TodayBirth>;
    if (typeof d.birthDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(d.birthDate)) return null;
    if (typeof d.timeUnknown !== "boolean") return null;
    if (
      typeof d.birthTime !== "string" ||
      (!d.timeUnknown && !/^\d{2}:\d{2}$/.test(d.birthTime))
    )
      return null;
    if (d.gender != null && d.gender !== "male" && d.gender !== "female") return null;
    return {
      birthDate: d.birthDate,
      birthTime: d.birthTime,
      timeUnknown: d.timeUnknown,
      gender: d.gender ?? null,
    };
  } catch {
    return null;
  }
}
