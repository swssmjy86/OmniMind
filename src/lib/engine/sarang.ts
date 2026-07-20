import { adjacentMonthNodes } from "./solar-terms";
import { branchHiddenStems } from "./constants";

// 사령(司令) — 월률분야(月律分野). 월지 지장간은 여기(餘氣)·중기(中氣)·정기(正氣) 세 층으로
// 나뉘고, 절입(그 달의 시작 절기)으로부터 며칠째인지에 따라 어느 층이 "사령"(그 순간 실권을
// 쥔 기운)인지 정해진다. 표는 실무에서 가장 널리 쓰이는 정수 배분(생지 7/7/16, 왕지 10/20 —
// 午만 예외로 10/9/11, 고지 9/3/18)을 쓴다 — 고서·학파마다 배분이 갈리는 영역이라(연해자평
// 계열 내에서도 표가 두 가지로 갈리는 사례가 있다) 이 값이 유일한 정답은 아니라는 점을 남긴다.
// 정기(마지막 층)는 절입 후 남은 기간 전부를 흡수한다 — 실제 절기 간격은 29.x~31.x일로
// 표의 합(정확히 30일)과 어긋나므로, 그 오차는 항상 정기 쪽에 쌓인다.

export type HiddenStemLayer = "여기" | "중기" | "정기";

export interface LayerSpec {
  layer: HiddenStemLayer;
  stem: number; // HEAVENLY_STEMS 인덱스(0=갑…9=계)
  days: number;
}

// 지지별 여기/중기/정기 일수 배분(실무 표준). 지장간 "천간"은 constants.ts의
// branchHiddenStems(이미 ten-gods.ts 등이 쓰는 단일 진실 공급원)를 그대로 재사용하고,
// 여기서는 일수만 얹는다 — 천간 표를 두 곳에 따로 두면 서로 어긋날 위험이 생긴다.
// 생지(寅申巳亥) 7·7·16 · 왕지(子卯酉) 10·20(중기 없음, 午만 예외 10·9·11) · 고지(辰戌丑未) 9·3·18.
const LAYER_DAYS: Record<number, readonly number[]> = {
  2: [7, 7, 16], 5: [7, 7, 16], 8: [7, 7, 16], 11: [7, 7, 16], // 생지
  0: [10, 20], 3: [10, 20], 9: [10, 20], // 왕지(자묘유)
  6: [10, 9, 11], // 오(왕지 예외 3층)
  4: [9, 3, 18], 7: [9, 3, 18], 10: [9, 3, 18], 1: [9, 3, 18], // 고지
};
const LAYER_NAMES_3: readonly HiddenStemLayer[] = ["여기", "중기", "정기"];
const LAYER_NAMES_2: readonly HiddenStemLayer[] = ["여기", "정기"];

// 지지 인덱스(0=자…11=해) → 그 월의 지장간 층 순서(절입 직후부터, 천간+일수).
export const MONTH_LAYERS: Record<number, LayerSpec[]> = Object.fromEntries(
  Object.entries(LAYER_DAYS).map(([branchStr, days]) => {
    const branch = Number(branchStr);
    const stems = branchHiddenStems(branch);
    const names = days.length === 3 ? LAYER_NAMES_3 : LAYER_NAMES_2;
    return [branch, stems.map((stem, i) => ({ layer: names[i], stem, days: days[i] }))];
  }),
);

export interface SarangResult {
  layer: HiddenStemLayer;
  stem: number; // HEAVENLY_STEMS 인덱스
  /** 절입로부터 경과일(디버깅·테스트 투명성용) */
  elapsedDays: number;
}

/**
 * instant가 속한 월(monthBranch)에서 어느 지장간 층이 사령인지 판정.
 * instant는 사주를 세운 바로 그 순간(resolveBirthInstant 결과)이어야
 * adjacentMonthNodes가 같은 절입 경계를 본다.
 */
export function sarangOf(instant: Date, monthBranch: number): SarangResult {
  const { prev } = adjacentMonthNodes(instant);
  const elapsedDays = (instant.getTime() - prev.getTime()) / 86_400_000;
  const layers = MONTH_LAYERS[monthBranch];
  let acc = 0;
  for (let i = 0; i < layers.length; i++) {
    const isLast = i === layers.length - 1;
    if (isLast || elapsedDays < acc + layers[i].days) {
      return { layer: layers[i].layer, stem: layers[i].stem, elapsedDays };
    }
    acc += layers[i].days;
  }
  /* istanbul ignore next -- 위 루프가 마지막 층에서 항상 반환하므로 도달하지 않는다 */
  const last = layers[layers.length - 1];
  return { layer: last.layer, stem: last.stem, elapsedDays };
}
