import type { EngineInput, FourPillars } from "./types";
import { HEAVENLY_STEMS, EARTHLY_BRANCHES, ELEMENTS, stemElement, stemYang } from "./constants";
import { computePillars, resolveBirthInstant } from "./pillars";
import { elementDistribution, type ElementDistribution } from "./elements";
import { computeDaeun, type Daeun, type Gender } from "./daeun";
import { tenGods, type TenGodChart } from "./ten-gods";
import { dayMasterStrength, detectPatterns, type DayMasterStrength, type GyeokPattern } from "./strength";
import { zodiacSign, type ZodiacSign } from "./zodiac";
import { mbtiTrait, isMbti, type MbtiTrait } from "./mbti";
import { bloodTrait, isBloodType, type BloodTrait } from "./blood";
import { YEAR_MIN, YEAR_MAX } from "./solar-terms";
import { kstStringToInstant } from "./kst";

export type { ProfileContext };

/**
 * 계산 '의미'가 바뀔 때 올린다. 저장된 프로필의 version이 이 값보다 낮으면 지금 엔진과
 * 다른 값을 담고 있다는 뜻이다(재계산 대상). 입력만 있으면 언제든 다시 계산할 수 있으므로
 * 저장값은 캐시일 뿐이다.
 *   1 → 2 (2026-07-16): 표준시 UTC+8:30 보정, 절기 초 단위 경계, 대운이 4주와 같은 시각 사용.
 *   2 → 3 (2026-07-20): 신강/신약(strength)·격국 구조 패턴(patterns) 추가.
 */
export const PROFILE_CONTEXT_VERSION = 3;

interface ProfileContext {
  version: number;
  pillars: { year: string; month: string; day: string; hour: string | null }; // "갑자" 등
  dayMaster: { stem: string; element: string; yang: boolean }; // 일간=아신
  elements: ElementDistribution;
  tenGods: TenGodChart;
  /** 억부법 신강/신약/중화 — 십성표(tenGods)에서 결정론적으로 파생 */
  strength: DayMasterStrength;
  /** 감지된 격국(구조) 패턴 — 없으면 빈 배열 */
  patterns: GyeokPattern[];
  zodiac: ZodiacSign;
  mbti: MbtiTrait;
  blood: BloodTrait;
  /** 성별을 알 때만 — 10년 단위 운의 흐름(대운) */
  daeun?: Daeun;
  gender?: Gender;
  meta: { timeUnknown: boolean };
}

const gz = (p: { stem: number; branch: number }) =>
  HEAVENLY_STEMS[p.stem] + EARTHLY_BRANCHES[p.branch];

/** 생년월일시 문자열 → KST 절대 instant. 검증 포함. */
function parseKstBirthInstant(birthDate: string, birthTime: string | null, timeUnknown: boolean): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
  if (!m) throw new Error(`birthDate 형식 오류: ${birthDate}`);
  const y = Number(m[1]);
  if (y < YEAR_MIN || y > YEAR_MAX)
    throw new RangeError(`지원 연도 범위(${YEAR_MIN}~${YEAR_MAX}) 밖: ${y}`);

  let hhmm = "00:00";
  if (!timeUnknown) {
    if (!birthTime) throw new Error("birthTime 필요(timeUnknown=false)");
    // 형식만 보면 "99:99"도 통과해 Invalid Date가 되므로 값 범위까지 확인한다.
    const t = /^(\d{2}):(\d{2})$/.exec(birthTime);
    if (!t || Number(t[1]) > 23 || Number(t[2]) > 59)
      throw new Error(`birthTime 형식 오류: ${birthTime}`);
    hhmm = birthTime;
  }
  return kstStringToInstant(`${birthDate}T${hhmm}`);
}

function parseKstInstant(input: EngineInput): Date {
  return parseKstBirthInstant(input.birthDate, input.birthTime, input.timeUnknown);
}

/**
 * 일간(日干)만 가볍게 구한다 — MBTI·혈액형 없이도 데일리 개인화(오늘의운세 무료 뷰 등)에
 * 필요한 최소 계산만 하고 싶을 때 쓴다. computeProfile과 달리 오행 분포·십성표·대운은 계산하지
 * 않는다.
 */
export function dayMasterOf(
  birthDate: string,
  birthTime: string | null,
  timeUnknown: boolean,
): { stem: string; element: string } {
  const rawInstant = parseKstBirthInstant(birthDate, birthTime, timeUnknown);
  const fp = computePillars(rawInstant, { timeUnknown });
  const dm = fp.day.stem;
  return { stem: HEAVENLY_STEMS[dm], element: ELEMENTS[stemElement(dm)] };
}

export function computeProfile(input: EngineInput): ProfileContext {
  if (!isMbti(input.mbti)) throw new Error(`MBTI 오류: ${input.mbti}`);
  if (!isBloodType(input.bloodType)) throw new Error(`혈액형 오류: ${input.bloodType}`);

  const rawInstant = parseKstInstant(input);
  const fp: FourPillars = computePillars(rawInstant, { timeUnknown: input.timeUnknown });
  // 대운도 4주와 같은 시각을 봐야 한다 — 기록 벽시계(raw)를 그대로 넘기면 서머타임·표준시
  // 보정이 빠져 절입까지의 거리가 최대 1시간 어긋난다(대운수가 뒤집힐 수 있다).
  const birthInstant = resolveBirthInstant(rawInstant, input.timeUnknown);
  const [, mo, d] = input.birthDate.split("-").map(Number);

  const dm = fp.day.stem;
  const chart = tenGods(fp);
  return {
    version: PROFILE_CONTEXT_VERSION,
    pillars: {
      year: gz(fp.year),
      month: gz(fp.month),
      day: gz(fp.day),
      hour: fp.hour ? gz(fp.hour) : null,
    },
    dayMaster: {
      stem: HEAVENLY_STEMS[dm],
      element: ELEMENTS[stemElement(dm)],
      yang: stemYang(dm),
    },
    elements: elementDistribution(fp),
    tenGods: chart,
    strength: dayMasterStrength(chart),
    patterns: detectPatterns(chart),
    zodiac: zodiacSign(mo, d),
    mbti: mbtiTrait(input.mbti),
    blood: bloodTrait(input.bloodType),
    // 성별을 알면 대운까지 — 시 미상이어도 그날 정오 기준 근사(대운수 오차 미미)
    ...(input.gender
      ? { gender: input.gender, daeun: computeDaeun(birthInstant, fp, input.gender) }
      : {}),
    meta: { timeUnknown: input.timeUnknown },
  };
}
