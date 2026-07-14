import type { ProfileContext } from "@/lib/engine";

// 오행 분포로 '마음의 균형' 문구를 조립한다. dominant는 이끄는 기운,
// lacking은 채워가면 좋은 결로 부드럽게 안내(결핍을 결점으로 말하지 않음).
export function ELEMENT_BALANCE_TEXT(el: ProfileContext["elements"]): string {
  const strong = `${el.dominant}의 기운이 당신을 가장 크게 이끌어요`;
  const soft = el.lacking.length
    ? `가끔 ${el.lacking.join("·")}의 결이 그리울 땐, 그 부분을 천천히 채워가도 좋아요`
    : `다섯 기운이 고르게 어우러져 있어, 어느 자리에서도 당신다움을 지켜가는 편이에요`;
  return `${strong}. ${soft}.`;
}
