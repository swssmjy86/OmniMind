import { describe, expect, it } from "vitest";
import { checkTone, checkToneWarnings, assertTone } from "./tone-guard";

describe("tone-guard", () => {
  it("명령형(~하세요)을 검출한다", () => {
    expect(checkTone("지금 바로 명상을 하세요").some((v) => v.rule.includes("명령형"))).toBe(true);
  });
  it("격식체 종결(-습니다/-ㅂ니다)을 검출한다", () => {
    expect(checkTone("당신은 이런 사람입니다").length).toBeGreaterThan(0);
    expect(checkTone("좋은 하루 되었습니다").length).toBeGreaterThan(0);
    expect(checkTone("운이 좋아집니다").length).toBeGreaterThan(0);
    expect(checkTone("잘 흘러갑니다").length).toBeGreaterThan(0);
    expect(checkTone("마음이 편안해진답니다").length).toBeGreaterThan(0);
  });

  // 규칙을 정밀화한 뒤의 통과/차단 경계를 잠근다(리뷰 지적 — 완화가 무테스트였음).
  it("인사말 '안녕하세요'는 명령형으로 오탐하지 않는다", () => {
    expect(checkTone("안녕하세요, 다인님")).toHaveLength(0);
    // 진짜 명령형은 여전히 검출
    expect(checkTone("여기를 확인하세요").some((v) => v.rule.includes("명령형"))).toBe(true);
    expect(checkTone("이름을 입력하세요").some((v) => v.rule.includes("명령형"))).toBe(true);
  });
  it("격식체가 아닌 '니다' 종결(아니다/지니다/다니다)은 오탐하지 않는다", () => {
    // 앞 음절 받침이 ㅂ이 아니라 격식체가 아니다 — 정상 문장을 폐기하지 않도록 통과시킨다.
    expect(checkTone("그건 당신 잘못이 아니에요")).toHaveLength(0);
    expect(checkTone("이건 아니다 싶은 순간도 있죠")).toHaveLength(0);
    expect(checkTone("따뜻함을 지니고 있어요")).toHaveLength(0);
    expect(checkTone("자주 다니던 길이에요")).toHaveLength(0);
  });
  it("분석용어를 검출한다", () => {
    expect(checkTone("당신의 사주 분석 결과예요").length).toBeGreaterThan(0);
  });
  it("공포 마케팅을 검출한다", () => {
    expect(checkTone("나쁜 기운이 있으니 조심하세요").length).toBeGreaterThan(0);
  });
  it("형식 호칭을 검출한다", () => {
    expect(checkTone("회원님, 안녕하세요").length).toBeGreaterThan(0);
  });

  it("낙인형 단정(~하는 사람이에요/이죠)은 경고 레벨 — 하드 실패와 구분된다", () => {
    const t = "당신은 앞장서서 길을 내는 사람이에요";
    expect(checkToneWarnings(t).some((v) => v.rule.includes("낙인형"))).toBe(true);
    expect(checkToneWarnings("품이 넓은 사람이죠").length).toBeGreaterThan(0);
    // 하드 검사(checkTone/assertTone)는 이 패턴으로 실패하지 않는다(LLM 출력 보호).
    expect(checkTone(t)).toHaveLength(0);
    expect(() => assertTone(t)).not.toThrow();
    // 성격을 '면/결'로 여는 서술에는 경고가 없다.
    expect(checkToneWarnings("감싸 안는 결이 있어요")).toHaveLength(0);
  });

  it("따뜻한 문체는 통과한다", () => {
    expect(checkTone("오늘은 마음을 천천히 다뤄주면 어떨까요?")).toHaveLength(0);
    expect(checkTone("당신다운 하루가 되길 바라요")).toHaveLength(0);
    expect(checkTone("~한 면이 있으시군요. 이럴 땐 이런 마음가짐이 도움이 될 거예요")).toHaveLength(0);
    expect(() => assertTone("곧게 자라는 나무처럼, 다시 위를 향하는 힘이 있어요")).not.toThrow();
  });
});
