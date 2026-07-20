// 월령(달의 위상)·출몰시각·태양고도 — astronomy-engine으로 순수 계산(네트워크·IO 없음).
//
// 왜 KASI API를 실시간 호출하지 않는가: 이 값들은 전부 물리적으로 결정되는 값이라
// astronomy-engine(scripts/gen-solar-terms.ts가 절기 생성에도 쓰는 라이브러리)으로 정확히
// 계산 가능하다. KASI는 scripts/verify-sky.ts에서 대조용으로만 병행한다(패치 없음,
// solar-terms와 동일 철학).
//
// 왜 서울 좌표로 고정하는가: 이 프로젝트의 사주 계산 자체가 사용자의 실제 출생지와 무관하게
// KST(동경 135°) 고정으로 동작한다. 출몰시각·태양고도도 같은 철학으로 위치 입력 UI 없이
// 서울(37.5665N, 126.9780E)을 관측 기준점으로 쓴다.
import * as Astronomy from "astronomy-engine";
import { kstPartsToInstant, toKstParts } from "./kst";

export const SEOUL_OBSERVER = new Astronomy.Observer(37.5665, 126.978, 0);

const PHASE_NAMES = [
  "삭",
  "초승달",
  "상현",
  "보름달로가는달",
  "보름",
  "그믐으로가는달",
  "하현",
  "그믐달",
] as const;
export type MoonPhaseName = (typeof PHASE_NAMES)[number];

export interface MoonPhaseInfo {
  /** 최근 삭(신월)으로부터 경과일 (0~29.53) */
  ageDays: number;
  /** 태양-달 황경차, 0=삭 90=상현 180=보름 270=하현 */
  phaseAngle: number;
  phaseName: MoonPhaseName;
  /** 달 표면 조명 비율 0~1 */
  illumination: number;
}

export interface RiseSetInfo {
  sunriseKst: string | null;
  sunsetKst: string | null;
  /** 달은 매일 뜨고 지지 않을 수 있어 그날 없으면 null */
  moonriseKst: string | null;
  moonsetKst: string | null;
}

export interface SunAltitudeInfo {
  /** 남중(태양이 하늘에서 가장 높은 지점을 지나는) 시각 */
  noonKst: string;
  altitudeDeg: number;
}

type KstDate = { y: number; mo: number; d: number };

function toKstClock(date: Date): string {
  const p = toKstParts(date);
  return `${String(p.h).padStart(2, "0")}:${String(p.mi).padStart(2, "0")}`;
}

function phaseNameFor(angleDeg: number): MoonPhaseName {
  const normalized = ((angleDeg % 360) + 360) % 360;
  const idx = Math.round(normalized / 45) % 8;
  return PHASE_NAMES[idx];
}

export function moonPhaseOf(today: KstDate): MoonPhaseInfo {
  const instant = kstPartsToInstant({ ...today, h: 12, mi: 0 });
  const phaseAngle = Astronomy.MoonPhase(instant);
  const illumination = Astronomy.Illumination(Astronomy.Body.Moon, instant).phase_fraction;
  const prevNewMoon = Astronomy.SearchMoonPhase(0, instant, -30);
  const ageDays = prevNewMoon
    ? (instant.getTime() - prevNewMoon.date.getTime()) / 86_400_000
    : (phaseAngle / 360) * 29.53;
  return { ageDays, phaseAngle, phaseName: phaseNameFor(phaseAngle), illumination };
}

export function riseSetOf(today: KstDate): RiseSetInfo {
  // 탐색 시작점은 KST 자정이어야 한다 — UTC 자정으로 잡으면 그날 새벽 출몰이 다음 날로 밀린다.
  const dayStart = kstPartsToInstant({ ...today, h: 0, mi: 0 });
  const at = (body: Astronomy.Body, direction: 1 | -1) => {
    const t = Astronomy.SearchRiseSet(body, SEOUL_OBSERVER, direction, dayStart, 1);
    return t ? toKstClock(t.date) : null;
  };
  return {
    sunriseKst: at(Astronomy.Body.Sun, 1),
    sunsetKst: at(Astronomy.Body.Sun, -1),
    moonriseKst: at(Astronomy.Body.Moon, 1),
    moonsetKst: at(Astronomy.Body.Moon, -1),
  };
}

export function sunAltitudeOf(today: KstDate): SunAltitudeInfo {
  const dayStart = kstPartsToInstant({ ...today, h: 0, mi: 0 });
  const evt = Astronomy.SearchHourAngle(Astronomy.Body.Sun, SEOUL_OBSERVER, 0, dayStart, 1);
  return { noonKst: toKstClock(evt.time.date), altitudeDeg: evt.hor.altitude };
}
