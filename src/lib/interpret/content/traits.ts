// MBTI·혈액형 보조축(2026-07-23 부분 복원) — 2026-07-20 제거된 mbti.ts/blood.ts의 문구를
// 해석 계층에서 계승한다. 엔진에는 되돌리지 않는다: 계산이 없는 룩업이라 순수 계산 계층에
// 넣을 이유가 없고, ProfileContext 버전 승격(전 프로필 재계산)을 피한다.
// 위계(§3): 사주가 주어·결론이고, 이 문구는 "그 결이 겉으로 어떻게 드러나는가"의 수식만 한다.
import type { Voice } from "@/lib/persona/personas";

export type BloodType = "A" | "B" | "O" | "AB";

/** 풀이에 곁들일 보조 입력 — 전부 선택. 없으면 문구가 생략될 뿐 풀이는 완전 동작(폴백). */
export interface Traits {
  mbti?: string | null;
  blood?: BloodType | null;
}

/** MBTI 16유형 검증·정규화("enfp" → "ENFP"). 형식이 아니면 null. */
export function normalizeMbti(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const v = raw.trim().toUpperCase();
  return /^[EI][SN][TF][JP]$/.test(v) ? v : null;
}

export const isBloodType = (v: string): v is BloodType =>
  v === "A" || v === "B" || v === "O" || v === "AB";

// MBTI 4축 수식구 — 어미가 없어 말투 무관(제거 전 MBTI_AXIS_TEXT의 조각 그대로).
const EI = { E: "사람들 곁에서 생기를 얻는", I: "혼자만의 시간에 마음이 채워지는" } as const;
const SN = { S: "지금 여기의 현실을 살피는", N: "보이지 않는 가능성을 그리는" } as const;
const TF = { T: "이치로 곰곰이 따져보고", F: "마음으로 먼저 헤아리고" } as const;
const JP = { J: "계획으로 하루를 정돈하는", P: "흐름에 유연하게 몸을 맡기는" } as const;

// 혈액형 4유형 수식구 — 어미 없는 몸통(제거 전 BLOOD_TEXT 계승). "~이/힘이/시선이"로 끝나
// 말투별 종결("있어요/있어/있소/있지요")과 결합한다.
const BLOOD_CORE: Record<BloodType, string> = {
  A: "겉으로 드러내기보다 속으로 깊이 살피며, 곁을 조용히 지켜주는 다정함이",
  B: "자기만의 리듬을 소중히 여기고, 좋아하는 것에 깊이 빠져드는 자유로움이",
  O: "품이 넓고 솔직해서, 사람들을 자연스레 끌어안는 따뜻한 힘이",
  AB: "여러 결을 동시에 지녀, 상황을 다면적으로 바라보는 독특한 시선이",
};

// 말투별 골격 — 호칭·종결어미만 다르고 내용은 동일(페르소나 전면 몰입의 내용 불변 원칙).
const SKELETON: Record<Voice, {
  mbti: (ei: string, sn: string, tf: string, jp: string) => string;
  blood: (core: string) => string;
}> = {
  yo: {
    mbti: (ei, sn, tf, jp) =>
      `겉으로 드러나는 결을 곁들이면, 당신은 ${ei}, ${sn} 편이에요. ${tf} ${jp} 모습도 함께 지녔고요.`,
    blood: (core) => `혈액형의 결로는, ${core} 있어요.`,
  },
  banmal: {
    mbti: (ei, sn, tf, jp) =>
      `겉으로 드러나는 결을 곁들이면, 너는 ${ei}, ${sn} 편이야. ${tf} ${jp} 모습도 함께 지녔지.`,
    blood: (core) => `혈액형의 결로는, ${core} 있어.`,
  },
  hao: {
    mbti: (ei, sn, tf, jp) =>
      `겉으로 드러나는 결을 곁들이면, 그대는 ${ei}, ${sn} 편이오. ${tf} ${jp} 모습도 함께 지녔소.`,
    blood: (core) => `혈액형의 결로는, ${core} 있소.`,
  },
  jiyo: {
    mbti: (ei, sn, tf, jp) =>
      `겉으로 드러나는 결을 곁들이면, 당신은 ${ei}, ${sn} 편이지요. ${tf} ${jp} 모습도 함께 지녔지요.`,
    blood: (core) => `혈액형의 결로는, ${core} 있지요.`,
  },
};

/**
 * 보조축 문장 — MBTI·혈액형 중 있는 것만으로 조립한다. 둘 다 없으면 null(섹션·문장 생략).
 * 잘못된 MBTI 형식은 조용히 무시한다(사용자 입력 방어 — 풀이를 깨지 않는다).
 */
export function traitsText(traits: Traits | null | undefined, voice: Voice = "yo"): string | null {
  if (!traits) return null;
  const sk = SKELETON[voice];
  const parts: string[] = [];
  const mbti = normalizeMbti(traits.mbti);
  if (mbti) {
    const [ei, sn, tf, jp] = mbti.split("") as ["E" | "I", "S" | "N", "T" | "F", "J" | "P"];
    parts.push(sk.mbti(EI[ei], SN[sn], TF[tf], JP[jp]));
  }
  if (traits.blood && isBloodType(traits.blood)) parts.push(sk.blood(BLOOD_CORE[traits.blood]));
  return parts.length ? parts.join(" ") : null;
}
