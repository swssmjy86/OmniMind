// §5.4 문체 규칙 — '지적인 따뜻함'. 금지 표현 자동 검사.
// 템플릿 콘텐츠(P2-5)와 서버 액션(P2-3)이 사용하고, P5 LLM 출력 검사에도 재사용한다.

export interface ToneViolation {
  rule: string;
  match: string;
}

// 위반 패턴. 설계서 §5.4의 ❌ 규칙을 정규식으로.
const RULES: { rule: string; re: RegExp }[] = [
  { rule: "명령형(~하세요)", re: /하세요/ },
  { rule: "단정형 종결(~입니다/습니다/합니다)", re: /(?:입|습|합)니다/ },
  { rule: "분석용어", re: /분석\s*결과|데이터\s*분석|진단/ },
  { rule: "공포 마케팅", re: /조심하세요|나쁜\s*기운|불행/ },
  { rule: "형식 호칭", re: /회원님|사용자님/ },
];

/** 문구의 톤 위반 목록을 반환한다(없으면 빈 배열). */
export function checkTone(text: string): ToneViolation[] {
  const out: ToneViolation[] = [];
  for (const { rule, re } of RULES) {
    const m = re.exec(text);
    if (m) out.push({ rule, match: m[0] });
  }
  return out;
}

/** 톤 위반이 있으면 throw. 콘텐츠·해석문 생성 경로에서 강제 검사용. */
export function assertTone(text: string): void {
  const v = checkTone(text);
  if (v.length)
    throw new Error(`톤 위반: ${v.map((x) => `${x.rule}(${x.match})`).join(", ")}`);
}
