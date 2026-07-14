import type { FourPillars } from "./types";
import { stemElement, stemYang, branchPrimaryStem } from "./constants";

export type TenGod =
  | "비견" | "겁재" | "식신" | "상관" | "편재"
  | "정재" | "편관" | "정관" | "편인" | "정인";

/** 일간(dayStem) 기준, 대상 천간(target)의 십성. */
export function tenGodOf(dayStem: number, target: number): TenGod {
  const de = stemElement(dayStem);
  const te = stemElement(target);
  const same = stemYang(dayStem) === stemYang(target);
  const d = ((te - de) % 5 + 5) % 5;
  switch (d) {
    case 0: return same ? "비견" : "겁재"; // 같은 오행 (비겁)
    case 1: return same ? "식신" : "상관"; // 내가 생 (식상)
    case 2: return same ? "편재" : "정재"; // 내가 극 (재성)
    case 3: return same ? "편관" : "정관"; // 나를 극 (관성)
    default: return same ? "편인" : "정인"; // 나를 생 (인성)
  }
}

export interface TenGodChart {
  yearStem: TenGod;
  monthStem: TenGod;
  hourStem: TenGod | null;
  yearBranch: TenGod;
  monthBranch: TenGod;
  dayBranch: TenGod;
  hourBranch: TenGod | null;
}

/** 일간=아신(我身)이므로 dayStem 자체엔 십성 없음. 지지는 지장간 정기로 판정. */
export function tenGods(fp: FourPillars): TenGodChart {
  const dm = fp.day.stem;
  const branchGod = (b: number) => tenGodOf(dm, branchPrimaryStem(b));
  return {
    yearStem: tenGodOf(dm, fp.year.stem),
    monthStem: tenGodOf(dm, fp.month.stem),
    hourStem: fp.hour ? tenGodOf(dm, fp.hour.stem) : null,
    yearBranch: branchGod(fp.year.branch),
    monthBranch: branchGod(fp.month.branch),
    dayBranch: branchGod(fp.day.branch),
    hourBranch: fp.hour ? branchGod(fp.hour.branch) : null,
  };
}
