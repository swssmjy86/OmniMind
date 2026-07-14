import type { TenGod, TenGodChart } from "@/lib/engine/ten-gods";

// 십성을 다섯 갈래로 묶어(비겁·식상·재성·관성·인성) 사주에서 가장 두드러진
// 결을 '타고난 재능과 관계'로 풀어낸다. 명리의 깊이를 §5.4 문체로 옮긴다.
export type TenGodCategory = "비겁" | "식상" | "재성" | "관성" | "인성";

const CATEGORY: Record<TenGod, TenGodCategory> = {
  비견: "비겁", 겁재: "비겁",
  식신: "식상", 상관: "식상",
  편재: "재성", 정재: "재성",
  편관: "관성", 정관: "관성",
  편인: "인성", 정인: "인성",
};

const THEME: Record<TenGodCategory, string> = {
  비겁:
    "당신에게는 스스로 서고자 하는 힘이 뚜렷해요. 누군가에게 기대기보다 자기 발로 길을 내고, 마음이 통하는 이들과 어깨를 나란히 할 때 가장 당신다워지죠. 그 곧은 마음이 때로 고집처럼 비칠 수도 있지만, 사실은 당신을 지켜온 단단한 뿌리랍니다.",
  식상:
    "당신 안에는 표현하고 싶은 것들이 늘 샘솟아요. 감각과 재주가 풍부해서, 마음속 이야기를 밖으로 꺼내 보일 때 유난히 반짝이는 사람이죠. 무언가를 만들고 나누는 일에서 특히 살아있음을 느끼곤 해요.",
  재성:
    "당신은 현실을 다루는 감각이 남달라요. 눈앞의 것을 실속 있게 꾸려가고, 바라는 바를 손에 잡히는 결실로 바꿔내는 힘이 있죠. 사람과 기회를 알아보는 눈도 밝은 편이라, 필요한 순간에 필요한 것을 곧잘 끌어당기곤 해요.",
  관성:
    "당신에게는 책임을 마다하지 않는 단단함이 있어요. 맡은 자리를 정성껏 지키고, 옳다 여기는 길을 묵묵히 걸어가는 사람이죠. 그 믿음직함이 주변에 조용한 안정감을 건네요.",
  인성:
    "당신은 받아들이고 곱씹는 힘이 깊어요. 배움을 즐기고, 서두르기보다 안으로 새기며 자기만의 깊이를 쌓아가는 사람이죠. 그 차분한 사색이 흔들릴 때마다 당신을 붙들어주는 든든한 심지가 되어줘요.",
};

/** 사주 차트에서 가장 많이 나타난 십성 갈래. */
export function dominantCategory(chart: TenGodChart): TenGodCategory {
  const counts: Record<TenGodCategory, number> = { 비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0 };
  const gods = [
    chart.yearStem, chart.monthStem, chart.hourStem,
    chart.yearBranch, chart.monthBranch, chart.dayBranch, chart.hourBranch,
  ].filter((g): g is TenGod => g !== null);
  // 월(월간·월지)은 계절의 중심이라 한 번 더 무게를 둔다.
  if (chart.monthStem) gods.push(chart.monthStem);
  if (chart.monthBranch) gods.push(chart.monthBranch);
  for (const g of gods) counts[CATEGORY[g]] += 1;
  return (Object.entries(counts) as [TenGodCategory, number][])
    .reduce((a, b) => (b[1] > a[1] ? b : a))[0];
}

/** '타고난 재능과 관계' 섹션 본문. */
export function tenGodTheme(chart: TenGodChart): string {
  return THEME[dominantCategory(chart)];
}
