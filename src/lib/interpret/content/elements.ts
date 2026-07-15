import type { ProfileContext } from "@/lib/engine";

// 오행별 성향 한 줄 — 지배 오행의 결을 덧붙인다.
const ELEMENT_TRAIT: Record<string, string> = {
  목: "새로운 것을 향해 뻗어가고 자라나려는 마음이 강한 편이죠.",
  화: "밝게 드러내고 열정적으로 타오르는 면이 두드러져요.",
  토: "듬직하게 중심을 잡고 곁을 품어주는 안정감이 돋보여요.",
  금: "단단하게 매듭짓고 자기 원칙을 지키는 결이 또렷해요.",
  수: "유연하게 흐르며 깊이 사유하는 지혜가 은은히 배어 있어요.",
};

/**
 * 여덟 글자의 오행 분포를 실제 개수와 형태로 서술한다.
 * 지배 오행(월지 득령 가중)의 짙기 + 성향 + 옅은 오행을 '여백'으로 다정하게 안내.
 * 동률이면 "나란히 흐른다"로 — 임의로 한쪽을 단정하지 않는다(명리적 정직함).
 */
export function ELEMENT_BALANCE_TEXT(el: ProfileContext["elements"]): string {
  const strong = el.dominant;
  const co = el.coDominant ?? [strong]; // 구버전 캐시(coDominant 없음) 호환
  const trait = ELEMENT_TRAIT[strong];
  let s: string;
  if (co.length > 1) {
    s = `당신의 여덟 글자에는 ${co.join("·")}의 기운이 나란히 짙게 흐르고 있어요. 그중에서도 태어난 계절의 흐름을 타는 ${strong}의 기운을 보면 — ${trait}`;
  } else {
    const n = el.counts[strong];
    s = `당신의 여덟 글자에는 ${strong}의 기운이 ${n}개로 가장 짙게 흐르고 있어요. ${trait}`;
  }
  if (el.lacking.length) {
    s += ` ${el.lacking.join("·")}의 기운은 옅은 편인데, 모자람이라기보다 앞으로 천천히 채워갈 여백이라 생각하면 마음이 한결 가벼워져요.`;
  } else {
    s += ` 다섯 기운이 크게 치우치지 않아, 어느 자리에서도 당신다운 균형을 지켜가는 편이고요.`;
  }
  return s;
}
