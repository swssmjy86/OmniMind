import type { ProfileContext } from "@/lib/engine";
import { EARTHLY_BRANCHES } from "@/lib/engine/constants";
import { branchRelation, type BranchRelation } from "@/lib/engine/year-sign";

// 형충회합(육합·삼합·충·형·해·파) → 근묘화실 궁 도메인 캡션. 년지×오늘 일진에 이미 쓰이던
// branchRelation(year-sign.ts, 오늘의운세 띠 캡션의 근거)을 네 궁 전체로 확장한다 —
// 계산은 그대로 재사용하고 궁 매핑·문구만 새로 얹는다.

type PalaceKey = "year" | "month" | "day" | "hour";

const PALACE_LABEL: Record<PalaceKey, string> = {
  year: "조상궁", month: "부모궁", day: "나와 배우자의 궁", hour: "자녀궁",
};

// 년주(띠)는 오늘의운세 화면에 이미 전용 캡션이 있어(content/year-sign.ts) 여기서는 제외해
// 중복을 피한다. 나머지는 가까운 궁(일주)부터 우선한다.
const PALACE_PRIORITY: readonly PalaceKey[] = ["day", "month", "hour"];

const RELATION_FEEL: Record<BranchRelation, { verb: string; note: string }> = {
  육합: { verb: "손을 맞잡는 육합의 결이 흘러요", note: "마음이 잘 통하고 매듭이 부드럽게 풀리는 하루예요." },
  삼합: { verb: "한 방향으로 힘이 모이는 삼합의 결이 흘러요", note: "함께하는 흐름이 자연스럽게 붙는 하루예요." },
  충: { verb: "마주 서는 충의 결이 흘러요", note: "마음이 들뜨거나 변화가 생기기 쉬우니, 큰 결정은 한 번 더 숨을 고르고 가요." },
  형: { verb: "결을 다듬는 형의 결이 흘러요", note: "작은 마찰에 마음 쓰기보다 한 템포 쉬어가는 하루가 어울려요." },
  해: { verb: "살짝 어긋나는 해의 결이 흘러요", note: "서두르면 엇갈리기 쉬우니, 약속과 말은 여유를 두고 건네보아요." },
  파: { verb: "계획을 흔들 수 있는 파의 결이 흘러요", note: "일정이 틀어져도 여백을 두고 유연하게 움직여보아요." },
};

function branchOf(ganzhi: string): number | null {
  const b = EARTHLY_BRANCHES.indexOf(ganzhi[1] as (typeof EARTHLY_BRANCHES)[number]);
  return b >= 0 ? b : null;
}

/**
 * 오늘 일진 지지 × 세 궁(일주→월주→시주 우선순위) 중 형충회합이 있는 궁 하나를 찾아
 * 캡션 한 문장으로. 시주 미상(hour=null)이면 조용히 건너뛴다. 어디에도 관계가 없으면
 * null(단정 회피 — 평온한 날을 굳이 지어내지 않는다).
 */
export function palaceRelationCaption(
  todayGanzhi: string,
  pillars: ProfileContext["pillars"],
): string | null {
  const todayBranch = branchOf(todayGanzhi);
  if (todayBranch === null) return null;

  for (const key of PALACE_PRIORITY) {
    const gz = pillars[key];
    if (!gz) continue;
    const branch = branchOf(gz);
    if (branch === null) continue;
    const rel = branchRelation(todayBranch, branch);
    if (!rel) continue;
    const { verb, note } = RELATION_FEEL[rel];
    return `오늘은 ${PALACE_LABEL[key]}에 ${verb}. ${note}`;
  }
  return null;
}
