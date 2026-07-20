import type { FourPillars } from "./types";
import { MONTH_LAYERS } from "./sarang";
import { tenGodOf, type TenGod } from "./ten-gods";
import { stemYang } from "./constants";

// 격국(格局) — 월지 지장간(여기/중기/정기) 중 어느 것이 천간(년간·월간·시간)에 투출했는지로
// 정한다. "투출"은 관대한 견해(년간·월간·시간 어디든 인정)를 따른다 — 월간에만 인정하는
// 엄격한 견해도 있으나(연구 결과), 이 프로젝트는 더 자주 격이 잡히는 관대한 쪽을 기본값으로
// 삼는다. 겸격(둘 이상 동시 투출)은 강약 비교로 하나만 남기지 않고 후보 배열로 그대로
// 낸다 — 그 비교 자체가 학파마다 갈리는 회색지대라, "있는 그대로"만 계산하고 단정하지 않는다.

export type Gyeok =
  | "식신격" | "상관격" | "정재격" | "편재격"
  | "정관격" | "편관격" | "정인격" | "편인격"
  | "건록격" | "월겁격" | "양인격";

export type GyeokBasis = "정기" | "중기" | "여기";

export interface GyeokCandidate {
  gyeok: Gyeok;
  /** 어느 지장간 층에서 나왔는지 — 정기가 아니면 변격(變格) */
  basis: GyeokBasis;
}

const EIGHT_GYEOK: Partial<Record<TenGod, Gyeok>> = {
  식신: "식신격", 상관: "상관격", 정재: "정재격", 편재: "편재격",
  정관: "정관격", 편관: "편관격", 정인: "정인격", 편인: "편인격",
};

// 왕지(旺支) — 자오묘유. 겁재가 여기서 투출·정기이면 양간에 한해 양인격.
const WANGJI: ReadonlySet<number> = new Set([0, 3, 6, 9]);

function candidateFor(
  dayStem: number,
  monthBranch: number,
  layerStem: number,
  basis: GyeokBasis,
): GyeokCandidate {
  const god = tenGodOf(dayStem, layerStem);
  const named = EIGHT_GYEOK[god];
  if (named) return { gyeok: named, basis };
  if (god === "비견") return { gyeok: "건록격", basis };
  // god === "겁재"
  if (stemYang(dayStem) && WANGJI.has(monthBranch)) return { gyeok: "양인격", basis };
  return { gyeok: "월겁격", basis };
}

/**
 * 격국 후보를 산출한다. 정기·중기·여기 순으로 투출 여부를 확인해, 투출한 층이 있으면
 * 그 층들 전부(정기 우선 순서로)를 후보로 낸다. 아무 층도 투출하지 않았으면 정기 자체를
 * 격으로 인정한다(투출 없이도 원국의 바탕으로 삼는 관례).
 */
export function detectGyeok(fp: FourPillars): GyeokCandidate[] {
  const layers = MONTH_LAYERS[fp.month.branch];
  const revealedStems = new Set(
    [fp.year.stem, fp.month.stem, fp.hour?.stem].filter(
      (s): s is number => s !== undefined && s !== null,
    ),
  );

  const revealed = layers.filter((l) => revealedStems.has(l.stem));
  const chosen = revealed.length > 0 ? [...revealed].reverse() : [layers[layers.length - 1]];
  return chosen.map((l) => candidateFor(fp.day.stem, fp.month.branch, l.stem, l.layer));
}
