import { HEAVENLY_STEMS, ELEMENTS, stemElement } from "@/lib/engine/constants";

// 대운(大運) 해석 — 대운 천간의 오행 5종으로 "10년의 계절"을 풀어낸다.
// §5.4 문체: 비단정·비명령·공감형. 명리에서 대운의 기세는 천간이 이끈다.

export const DAEUN_SEASON_TEXT: Record<string, string> = {
  목: "새싹이 흙을 밀고 올라오듯, 무언가를 시작하고 키워가기 좋은 계절이에요. 배움과 성장의 기운이 당신 곁을 천천히 흐르고 있어요.",
  화: "햇살이 번지듯 마음과 관계가 환해지는 계절이에요. 표현하고 나누는 만큼 기운이 더 살아나요.",
  토: "땅이 곡식을 품듯, 쌓아 온 것을 다지고 뿌리내리기 좋은 계절이에요. 서두르지 않아도 조금씩 단단해지는 시간이에요.",
  금: "열매를 거두듯 정리하고 매듭짓는 힘이 커지는 계절이에요. 덜어낼수록 남는 것이 또렷해져요.",
  수: "강이 깊어지듯 안으로 고요히 채워지는 계절이에요. 쉼과 사색이 다음 계절의 씨앗이 되어줘요.",
};

/** 대운 간지("경진" 등) → 천간 오행의 계절 문구. 형식이 어긋나면 빈 문자열. */
export function daeunSeasonText(ganzhi: string): string {
  const i = HEAVENLY_STEMS.indexOf(ganzhi?.[0] as (typeof HEAVENLY_STEMS)[number]);
  if (i < 0) return "";
  return DAEUN_SEASON_TEXT[ELEMENTS[stemElement(i)]];
}
