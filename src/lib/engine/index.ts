import type { EngineInput, FourPillars } from "./types";
import { HEAVENLY_STEMS, EARTHLY_BRANCHES, ELEMENTS, stemElement, stemYang } from "./constants";
import { computePillars } from "./pillars";
import { elementDistribution, type ElementDistribution } from "./elements";
import { computeDaeun, type Daeun, type Gender } from "./daeun";
import { tenGods, type TenGodChart } from "./ten-gods";
import { zodiacSign, type ZodiacSign } from "./zodiac";
import { mbtiTrait, isMbti, type MbtiTrait } from "./mbti";
import { bloodTrait, isBloodType, type BloodTrait } from "./blood";
import { YEAR_MIN, YEAR_MAX } from "./solar-terms";
import { kstStringToInstant } from "./kst";

export type { ProfileContext };

interface ProfileContext {
  version: 1;
  pillars: { year: string; month: string; day: string; hour: string | null }; // "갑자" 등
  dayMaster: { stem: string; element: string; yang: boolean }; // 일간=아신
  elements: ElementDistribution;
  tenGods: TenGodChart;
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

/** 입력 문자열 → KST 절대 instant. 검증 포함. */
function parseKstInstant(input: EngineInput): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.birthDate);
  if (!m) throw new Error(`birthDate 형식 오류: ${input.birthDate}`);
  const y = Number(m[1]);
  if (y < YEAR_MIN || y > YEAR_MAX)
    throw new RangeError(`지원 연도 범위(${YEAR_MIN}~${YEAR_MAX}) 밖: ${y}`);

  let hhmm = "00:00";
  if (!input.timeUnknown) {
    if (!input.birthTime) throw new Error("birthTime 필요(timeUnknown=false)");
    if (!/^(\d{2}):(\d{2})$/.test(input.birthTime))
      throw new Error(`birthTime 형식 오류: ${input.birthTime}`);
    hhmm = input.birthTime;
  }
  return kstStringToInstant(`${input.birthDate}T${hhmm}`);
}

export function computeProfile(input: EngineInput): ProfileContext {
  if (!isMbti(input.mbti)) throw new Error(`MBTI 오류: ${input.mbti}`);
  if (!isBloodType(input.bloodType)) throw new Error(`혈액형 오류: ${input.bloodType}`);

  const instant = parseKstInstant(input);
  const fp: FourPillars = computePillars(instant, { timeUnknown: input.timeUnknown });
  const [, mo, d] = input.birthDate.split("-").map(Number);

  const dm = fp.day.stem;
  return {
    version: 1,
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
    tenGods: tenGods(fp),
    zodiac: zodiacSign(mo, d),
    mbti: mbtiTrait(input.mbti),
    blood: bloodTrait(input.bloodType),
    // 성별을 알면 대운까지 — 시 미상이어도 그날 기준 근사(대운수 오차 미미)
    ...(input.gender
      ? { gender: input.gender, daeun: computeDaeun(instant, fp, input.gender) }
      : {}),
    meta: { timeUnknown: input.timeUnknown },
  };
}
