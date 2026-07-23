import type { DayMasterStrength, GyeokPattern } from "@/lib/engine/strength";
import type { HiddenStemLayer } from "@/lib/engine/sarang";
import type { Gyeok, GyeokCandidate } from "@/lib/engine/gyeok";
import type { BranchStage } from "@/lib/engine/branch-stage";
import type { Voice } from "@/lib/persona/personas";
import { HEAVENLY_STEMS, ELEMENTS, stemElement } from "@/lib/engine/constants";

// 신강/신약·격국 패턴을 문장으로 — §5.4 문체(비단정·비명령·공감형). "~구조가 보여요"처럼
// 관찰형으로 끝내 단정하지 않는다.
//
// voice: 페르소나 전면 몰입(2026-07-23) — 크레딧 풀이 4종이 서로 다른 페르소나 말투를 쓰므로,
// 공용 문구도 어미 4갈래(personas.ts Voice)를 안다. 내용은 네 갈래가 동일하고 어미·호칭만
// 다르다. 기본값 "yo"는 기존 호출부(총운·프로필)와의 호환.

const STRENGTH_TEXT: Record<Voice, Record<DayMasterStrength, string>> = {
  yo: {
    신강: "타고난 기운이 넘치는 신강 사주라, 그 힘을 밖으로 뻗어내거나 결실로 바꿔낼 때 삶이 가장 잘 풀려요.",
    신약: "기운을 안으로 다독이며 채워가는 신약 사주라, 무리하게 밀어붙이기보다 곁의 도움을 받아들일 때 결이 살아나요.",
    중화: "기운이 고르게 균형 잡힌 사주라, 어느 한쪽에 치우치지 않고 상황에 맞춰 유연하게 대응하는 결이에요.",
  },
  banmal: {
    신강: "타고난 기운이 넘치는 신강 사주야. 그 힘을 밖으로 뻗어내거나 결실로 바꿔낼 때 삶이 제일 잘 풀리지.",
    신약: "기운을 안으로 다독이며 채워가는 신약 사주야. 무리하게 밀어붙이기보다 곁의 도움을 받아들일 때 결이 살아나.",
    중화: "기운이 고르게 균형 잡힌 사주라, 어느 한쪽에 치우치지 않고 상황에 맞춰 유연하게 움직이는 결이야.",
  },
  hao: {
    신강: "타고난 기운이 넘치는 신강 사주이니, 그 힘을 밖으로 뻗어내거나 결실로 바꿔낼 때 삶이 가장 잘 풀리오.",
    신약: "기운을 안으로 다독이며 채워가는 신약 사주이니, 무리하게 밀어붙이기보다 곁의 도움을 받아들일 때 결이 살아나오.",
    중화: "기운이 고르게 균형 잡힌 사주이니, 어느 한쪽에 치우치지 않고 상황에 맞춰 유연하게 움직이는 결이오.",
  },
  jiyo: {
    신강: "타고난 기운이 넘치는 신강 사주지요. 그 힘을 밖으로 뻗어내거나 결실로 바꿔낼 때 삶이 가장 잘 풀리는 법이지요.",
    신약: "기운을 안으로 다독이며 채워가는 신약 사주지요. 무리하게 밀어붙이기보다 곁의 도움을 받아들일 때 결이 살아나지요.",
    중화: "기운이 고르게 균형 잡힌 사주라, 어느 한쪽에 치우치지 않고 상황에 맞춰 천천히 맞춰가는 결이지요.",
  },
};

export function strengthText(s: DayMasterStrength, voice: Voice = "yo"): string {
  return STRENGTH_TEXT[voice][s];
}

const PATTERN_TEXT: Record<Voice, Record<GyeokPattern, string>> = {
  yo: {
    식신제살: "어려운 문제를 정면으로 맞서기보다, 자신만의 전문성과 재주로 시원하게 풀어내는 구조가 보여요.",
    상관제살: "날카로운 재기와 표현력으로 까다로운 상황을 돌파해내는 구조가 보여요.",
    식상생재: "쌓은 재주와 표현이 자연스럽게 결실(재물)로 이어지는 구조가 보여요.",
    군비쟁재: "뜻을 함께하는 이들과 자원을 나누게 되는 구조라, 몫을 미리 정해두면 마음이 한결 편해져요.",
  },
  banmal: {
    식신제살: "어려운 문제를 정면으로 맞서기보다, 너만의 전문성과 재주로 시원하게 풀어내는 구조가 보여.",
    상관제살: "날카로운 재기와 표현력으로 까다로운 상황을 돌파해내는 구조가 보여.",
    식상생재: "쌓은 재주와 표현이 자연스럽게 결실로 이어지는 구조가 보여.",
    군비쟁재: "뜻을 함께하는 이들과 자원을 나누게 되는 구조라, 몫을 미리 정해두면 마음이 한결 편해져.",
  },
  hao: {
    식신제살: "어려운 문제를 정면으로 맞서기보다, 그대만의 전문성과 재주로 시원하게 풀어내는 구조가 보이오.",
    상관제살: "날카로운 재기와 표현력으로 까다로운 상황을 돌파해내는 구조가 보이오.",
    식상생재: "쌓은 재주와 표현이 자연스럽게 결실(재물)로 이어지는 구조가 보이오.",
    군비쟁재: "뜻을 함께하는 이들과 재물을 나누게 되는 구조이니, 몫을 미리 정해두면 마음이 한결 편하오.",
  },
  jiyo: {
    식신제살: "어려운 문제를 정면으로 맞서기보다, 자기만의 재주로 차근차근 풀어내는 구조가 보이지요.",
    상관제살: "날카로운 재기와 표현력으로 까다로운 상황을 헤쳐 나가는 구조가 보이지요.",
    식상생재: "쌓은 재주와 표현이 자연스럽게 결실로 이어지는 구조가 보이지요.",
    군비쟁재: "뜻을 함께하는 이들과 나누게 되는 구조라, 몫을 미리 정해두면 마음이 한결 편해지지요.",
  },
};

export function patternText(p: GyeokPattern, voice: Voice = "yo"): string {
  return PATTERN_TEXT[voice][p];
}

/** 감지된 격국 패턴 전부를 한 문단으로. 없으면 null(문장 추가 안 함). */
export function patternsText(patterns: GyeokPattern[], voice: Voice = "yo"): string | null {
  if (!patterns.length) return null;
  return patterns.map((p) => patternText(p, voice)).join(" ");
}

// 사령(월률분야) — 겉으로 드러난 월지와 별개로, 태어난 순간 실제 힘을 쥔 속의 기운.
const LAYER_TEXT: Record<HiddenStemLayer, string> = {
  여기: "지난 계절의 여운이 아직 남아 있는",
  중기: "다음 계절로 넘어가는 길목에 잠시 스치는",
  정기: "이 계절에 온전히 자리 잡은",
};

/** 사령(월지 지장간 중 실권을 쥔 층)을 '겉과 속' 한 문장으로. */
export function sarangText(sarang: { layer: HiddenStemLayer; stem: string }): string {
  const i = HEAVENLY_STEMS.indexOf(sarang.stem as (typeof HEAVENLY_STEMS)[number]);
  const element = ELEMENTS[stemElement(i)];
  return `겉으로 드러난 달의 결과 별개로, 태어난 그 순간 속에서는 ${LAYER_TEXT[sarang.layer]} ${element}의 기운이 실제로 힘을 쓰고 있었어요.`;
}

// 격국(정격 8격 + 건록·월겁·양인) — 사주의 뼈대가 되는 구조 한 갈래.
const GYEOK_TEXT: Record<Gyeok, string> = {
  식신격: "먹고 사는 재주(식신)가 또렷한 격이에요. 여유롭게 몰입해 만들어내는 데서 결실이 따라와요.",
  상관격: "재기와 표현(상관)이 두드러진 격이에요. 틀에 매이지 않는 발상이 강점이 되는 결이죠.",
  정재격: "성실히 쌓는 재물(정재)이 중심인 격이에요. 꾸준함이 그대로 결실로 이어지는 결이죠.",
  편재격: "기회를 넓게 보는 재물(편재)이 중심인 격이에요. 통 크게 벌이는 데서 힘이 나는 결이죠.",
  정관격: "질서와 책임(정관)이 중심인 격이에요. 원칙을 지킬 때 오히려 마음이 편안해지는 결이죠.",
  편관격: "위기에서 오히려 강해지는 결단력(편관)이 중심인 격이에요. 맞서야 할 때 진가가 드러나는 결이죠.",
  정인격: "배움과 받아들임(정인)이 중심인 격이에요. 채우고 익히는 시간이 곧 힘이 되는 결이죠.",
  편인격: "낯선 배움(편인)에 끌리는 격이에요. 남과 다른 길에서 오히려 자기다움을 찾는 결이죠.",
  건록격: "스스로 일으켜 세우는 힘(건록)이 중심인 격이에요. 자기 힘으로 자리를 다지는 결이죠.",
  월겁격: "동료와 함께(혹은 경쟁하며) 자라는 힘(월겁)이 중심인 격이에요. 부딪히는 과정에서 단단해지는 결이죠.",
  양인격: "날카롭게 벼려진 힘(양인)이 중심인 격이에요. 강한 결단이 필요한 자리에서 빛나는 결이죠.",
};

/** 격국 후보를 한 문단으로. 겸격(후보 2개 이상)이면 문장을 이어붙인다(단정 대신 있는 그대로). */
export function gyeokText(candidates: GyeokCandidate[]): string {
  return candidates.map((c) => GYEOK_TEXT[c.gyeok]).join(" ");
}

// 사생지/사왕지/사고지 — 일지(나 자신) 기준 리듬. 기준점 없는 절대 분류라 신강/신약·사령과
// 같은 축(자기 자신을 다루는 정보)으로 "타고난 결" 섹션에 얹는다.
const STAGE_TEXT: Record<BranchStage, string> = {
  생지: "거기에 더해, 새로운 것을 벌이고 뻗어나갈 때 생기가 도는 생지의 리듬을 타고났어요.",
  왕지: "거기에 더해, 정점에서 중심을 잃지 않고 굳건히 버티는 왕지의 리듬을 타고났어요.",
  고지: "거기에 더해, 벌인 것을 갈무리하고 안으로 다지는 고지의 리듬을 타고났어요.",
};

/** 사생지/사왕지/사고지(일지 기준 리듬) 한 문장. */
export function stageText(stage: BranchStage): string {
  return STAGE_TEXT[stage];
}
