import type { ProfileContext } from "@/lib/engine";

// 근묘화실(根苗花實) — 사주 네 기둥이 저마다 인생의 어느 자리를 품는지 읽는다(왕초보7·8강).
// 년주=조상궁(뿌리, 먼 과거) · 월주=부모형제궁(싹, 가까운 과거) · 일주=나와 배우자궁(꽃, 지금) ·
// 시주=자녀·심리궁(열매, 다가올 미래). 계산은 이미 있다(ProfileContext.pillars) — 문구만 새로 얹는다.

/** '네 기둥, 네 자리' 섹션 본문. 출생 시간을 모르면 시주는 여백으로 남긴다. */
export function pillarPalaceText(ctx: ProfileContext): string {
  const { year, month, day, hour } = ctx.pillars;
  const parts = [
    `년주 ${year}는 조상과 뿌리를 품은 자리예요 — 당신이 태어나기 전부터 이어져 온, 먼 과거의 결이죠.`,
    `월주 ${month}는 부모·형제와 자라온 환경을 품은 자리예요 — 지금의 당신을 다져온 가까운 과거의 결이에요.`,
    `일주 ${day}는 다른 누구도 아닌 당신 자신, 그리고 함께할 사람을 품은 자리예요 — 지금 이 순간의 결이죠.`,
    hour
      ? `시주 ${hour}는 앞으로 다가올 마음과 자녀를 품은 자리예요 — 아직 오지 않은 미래의 결이에요.`
      : `시주는 출생 시간을 몰라 비어 있어요 — 미래의 결은 단정하지 말고, 살아가며 천천히 채워갈 여백으로 남겨두어요.`,
  ];
  return parts.join(" ");
}

/** 프로필 심층 리포트 프롬프트에 얹을 한 줄 요약. */
export function pillarPalaceSummary(ctx: ProfileContext): string {
  const { year, month, day, hour } = ctx.pillars;
  return `년주(조상·먼과거) ${year} · 월주(부모·가까운과거) ${month} · 일주(나·지금) ${day}` +
    (hour ? ` · 시주(자녀·미래) ${hour}` : " · 시주(자녀·미래) 미상");
}
