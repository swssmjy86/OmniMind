// §5.4 문체 규칙 — '지적인 따뜻함'. 금지 표현 자동 검사.
// 템플릿 콘텐츠(P2-5)와 서버 액션(P2-3)이 사용하고, P5 LLM 출력 검사에도 재사용한다.

export interface ToneViolation {
  rule: string;
  match: string;
}

// 위반 패턴. 설계서 §5.4의 ❌ 규칙을 정규식으로.
// 단정 금지의 §5.4 해석: 물상 비유("큰 나무처럼")는 허용, 사람 자체를 규정하는
// 낙인형 단정("~하는 사람이에요/이죠")은 금지 — 성격 서술은 "~하는 면이 있어요" 꼴로.
const RULES: { rule: string; re: RegExp }[] = [
  { rule: "명령형(~하세요)", re: /하세요/ },
  { rule: "단정형 종결(~니다)", re: /[가-힣]니다/ },
  { rule: "분석용어", re: /분석\s*결과|데이터\s*분석|진단/ },
  { rule: "공포 마케팅", re: /조심하세요|나쁜\s*기운|불행/ },
  { rule: "형식 호칭", re: /회원님|사용자님/ },
];

// 경고 레벨 — 하드 실패는 아니지만 우리 콘텐츠에는 쓰지 않는 패턴.
// LLM 출력에서는 문장 전체를 버릴 만큼의 위반은 아니라 경고로만 다룬다.
const WARN_RULES: { rule: string; re: RegExp }[] = [
  { rule: "낙인형 단정(~하는 사람이에요/이죠)", re: /사람이(?:에요|죠|야)/ },
];

function run(rules: { rule: string; re: RegExp }[], text: string): ToneViolation[] {
  const out: ToneViolation[] = [];
  for (const { rule, re } of rules) {
    const m = re.exec(text);
    if (m) out.push({ rule, match: m[0] });
  }
  return out;
}

/** 문구의 톤 위반(하드) 목록을 반환한다(없으면 빈 배열). */
export function checkTone(text: string): ToneViolation[] {
  return run(RULES, text);
}

/** 경고 레벨 검사 — 자체 콘텐츠 테스트에서 강제하고, 런타임에서는 실패시키지 않는다. */
export function checkToneWarnings(text: string): ToneViolation[] {
  return run(WARN_RULES, text);
}

/** 톤 위반이 있으면 throw. 콘텐츠·해석문 생성 경로에서 강제 검사용. */
export function assertTone(text: string): void {
  const v = checkTone(text);
  if (v.length)
    throw new Error(`톤 위반: ${v.map((x) => `${x.rule}(${x.match})`).join(", ")}`);
}
