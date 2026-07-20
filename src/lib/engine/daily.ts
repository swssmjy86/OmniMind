import type { ElementIndex } from "./types";
import { dayPillar } from "./pillars";
import { tenGodOf, type TenGod } from "./ten-gods";
import { HEAVENLY_STEMS, EARTHLY_BRANCHES, ELEMENTS, stemElement } from "./constants";
import { kstPartsToInstant } from "./kst";
import { moonPhaseOf, riseSetOf, sunAltitudeOf, type MoonPhaseInfo, type RiseSetInfo, type SunAltitudeInfo } from "./sky";

// 오늘의 기운이 '나'와 맺는 관계(오행 생극). 프로필이 있을 때만 산출.
export type DailyRelation = "동행" | "채움" | "발산" | "결실" | "단련";

export interface DailyContext {
  date: string; // "YYYY-MM-DD" (KST)
  dayGanzhi: string; // 오늘 일진 "갑자"
  element: string; // 오늘을 이끄는 오행(일간 오행)
  elementIndex: ElementIndex;
  relation: DailyRelation | null; // 내 일간 오행과 오늘 오행의 관계
  /** 내 일간 기준 오늘 천간의 십성(음양까지 반영한 세밀한 개인화). 내 일간 미상이면 null */
  tenGod: TenGod | null;
  /** 월령·출몰시각·태양고도(서울 기준). 프로필 유무와 무관하게 항상 계산된다 */
  sky: { moon: MoonPhaseInfo; riseSet: RiseSetInfo; altitude: SunAltitudeInfo };
}

/** 내 오행(mine)과 오늘 오행(today)의 관계. today 기준으로 판정. */
export function relateElement(mine: ElementIndex, today: ElementIndex): DailyRelation {
  const d = ((today - mine) % 5 + 5) % 5;
  switch (d) {
    case 0: return "동행"; // 같은 오행(비화)
    case 1: return "발산"; // 내가 오늘을 생(식상)
    case 2: return "결실"; // 내가 오늘을 극(재성)
    case 3: return "단련"; // 오늘이 나를 극(관성)
    default: return "채움"; // 오늘이 나를 생(인성)
  }
}

/**
 * 오늘의 기운. today는 KST 달력 날짜. myElement가 주어지면(내 일간 오행) 관계까지,
 * myStem(내 일간 천간 "갑" 등)까지 주어지면 십성 관계도 산출한다.
 * 일진은 그날 정오 기준으로 계산(경계 회피).
 */
export function computeDaily(
  today: { y: number; mo: number; d: number },
  myElement?: string,
  myStem?: string,
): DailyContext {
  const instant = kstPartsToInstant({ y: today.y, mo: today.mo, d: today.d, h: 12, mi: 0 });
  const p = dayPillar(instant);
  const elementIndex = stemElement(p.stem);
  const dateStr = `${today.y}-${String(today.mo).padStart(2, "0")}-${String(today.d).padStart(2, "0")}`;
  let relation: DailyRelation | null = null;
  if (myElement) {
    const mineIdx = ELEMENTS.indexOf(myElement as (typeof ELEMENTS)[number]);
    if (mineIdx >= 0) relation = relateElement(mineIdx as ElementIndex, elementIndex);
  }
  let tenGod: TenGod | null = null;
  if (myStem) {
    const stemIdx = HEAVENLY_STEMS.indexOf(myStem as (typeof HEAVENLY_STEMS)[number]);
    if (stemIdx >= 0) tenGod = tenGodOf(stemIdx, p.stem);
  }
  return {
    date: dateStr,
    dayGanzhi: HEAVENLY_STEMS[p.stem] + EARTHLY_BRANCHES[p.branch],
    element: ELEMENTS[elementIndex],
    elementIndex,
    relation,
    tenGod,
    sky: {
      moon: moonPhaseOf(today),
      riseSet: riseSetOf(today),
      altitude: sunAltitudeOf(today),
    },
  };
}
