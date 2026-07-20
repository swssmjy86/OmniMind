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
    "당신에게는 스스로 서고자 하는 힘이 뚜렷해요. 누군가에게 기대기보다 자기 발로 길을 내고, 마음이 통하는 이들과 어깨를 나란히 할 때 가장 당신다워지죠. 그 곧은 마음이 때로 고집처럼 비칠 수도 있지만, 사실은 당신을 지켜온 단단한 뿌리예요.",
  식상:
    "당신 안에는 표현하고 싶은 것들이 늘 샘솟아요. 감각과 재주가 풍부해서, 마음속 이야기를 밖으로 꺼내 보일 때 유난히 반짝이죠. 무언가를 만들고 나누는 일에서 특히 살아있음을 느끼곤 해요.",
  재성:
    "당신은 현실을 다루는 감각이 남달라요. 눈앞의 것을 실속 있게 꾸려가고, 바라는 바를 손에 잡히는 결실로 바꿔내는 힘이 있죠. 사람과 기회를 알아보는 눈도 밝은 편이라, 필요한 순간에 필요한 것을 곧잘 끌어당기곤 해요.",
  관성:
    "당신에게는 책임을 마다하지 않는 단단함이 있어요. 맡은 자리를 정성껏 지키고, 옳다 여기는 길을 묵묵히 걸어가죠. 그 믿음직함이 주변에 조용한 안정감을 건네요.",
  인성:
    "당신은 받아들이고 곱씹는 힘이 깊어요. 배움을 즐기고, 서두르기보다 안으로 새기며 자기만의 깊이를 쌓아가죠. 그 차분한 사색이 흔들릴 때마다 당신을 붙들어주는 든든한 심지가 되어줘요.",
};

// 문장 조립용 명사구 — "…님에게는 ○○이 있어요" 꼴에 끼워도 문법이 깨지지 않도록
// 주어 없이, 전부 '힘'으로 끝나는 형태를 유지한다(조사 '이' 고정).
const STRENGTH: Record<TenGodCategory, string> = {
  비겁: "스스로 서고자 하는 곧은 힘",
  식상: "마음속 이야기를 꺼내 빚어내는 힘",
  재성: "바라는 바를 손에 잡히는 결실로 바꿔내는 힘",
  관성: "맡은 자리를 끝까지 지켜내는 힘",
  인성: "받아들이고 곱씹어 깊이를 쌓는 힘",
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

/** 조립용 명사구("…힘"). "○○님에게는 ${tenGodStrength(chart)}이 있어요" 꼴로 사용. */
export function tenGodStrength(chart: TenGodChart): string {
  return STRENGTH[dominantCategory(chart)];
}

// 십성 10갈래 개별 결 — 같은 갈래(비겁·식상 등)라도 음양이 다르면(비견≠겁재) 결이 다르다.
// dominantCategory보다 한 단계 더 세밀한 무늬만 더한다(교안 6·7강) — 5갈래 THEME을 대체하지
// 않고 그 위에 "그중에서도" 한 문장을 얹는다.
const NUANCE: Record<TenGod, string> = {
  비견: "그중에서도 비견의 결이 강해요 — 나와 닮은 이들과 나란히 설 때 오히려 힘이 나는 쪽이죠.",
  겁재: "그중에서도 겁재의 결이 강해요 — 경쟁하는 자리일수록 승부욕이 살아나는 쪽이죠.",
  식신: "그중에서도 식신의 결이 강해요 — 여유롭게 즐기며 재주를 펼칠 때 가장 편안한 쪽이죠.",
  상관: "그중에서도 상관의 결이 강해요 — 날카로운 재치로 반짝일 때가 많은 쪽이죠.",
  편재: "그중에서도 편재의 결이 강해요 — 기회를 넓게 벌리는 통 큰 쪽이죠.",
  정재: "그중에서도 정재의 결이 강해요 — 성실하게 차곡차곡 쌓아가는 쪽이죠.",
  편관: "그중에서도 편관의 결이 강해요 — 위기 앞에서 오히려 담담해지는 쪽이죠.",
  정관: "그중에서도 정관의 결이 강해요 — 원칙과 질서 안에서 마음이 편안한 쪽이죠.",
  편인: "그중에서도 편인의 결이 강해요 — 낯설고 독특한 배움에 끌리는 쪽이죠.",
  정인: "그중에서도 정인의 결이 강해요 — 배우고 받아들이며 천천히 채워지는 쪽이죠.",
};

/** 사주 차트에서 가장 많이 나타난 십성(10갈래, 음양까지 구분). */
export function dominantGod(chart: TenGodChart): TenGod {
  const counts: Partial<Record<TenGod, number>> = {};
  const gods = [
    chart.yearStem, chart.monthStem, chart.hourStem,
    chart.yearBranch, chart.monthBranch, chart.dayBranch, chart.hourBranch,
  ].filter((g): g is TenGod => g !== null);
  if (chart.monthStem) gods.push(chart.monthStem);
  if (chart.monthBranch) gods.push(chart.monthBranch);
  for (const g of gods) counts[g] = (counts[g] ?? 0) + 1;
  return (Object.entries(counts) as [TenGod, number][])
    .reduce((a, b) => (b[1] > a[1] ? b : a))[0];
}

/** '타고난 재능과 관계' 섹션에 얹는 한 단계 더 세밀한 무늬(10갈래). */
export function tenGodNuance(chart: TenGodChart): string {
  return NUANCE[dominantGod(chart)];
}
