import { describe, expect, it } from "vitest";
import { checkTone, assertTone } from "./tone-guard";

describe("tone-guard", () => {
  it("명령형(~하세요)을 검출한다", () => {
    expect(checkTone("지금 바로 명상을 하세요").some((v) => v.rule.includes("명령형"))).toBe(true);
  });
  it("단정형 종결을 검출한다", () => {
    expect(checkTone("당신은 이런 사람입니다").length).toBeGreaterThan(0);
    expect(checkTone("좋은 하루 되었습니다").length).toBeGreaterThan(0);
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

  it("따뜻한 문체는 통과한다", () => {
    expect(checkTone("오늘은 마음을 천천히 다뤄주면 어떨까요?")).toHaveLength(0);
    expect(checkTone("당신다운 하루가 되길 바라요")).toHaveLength(0);
    expect(checkTone("~한 면이 있으시군요. 이럴 땐 이런 마음가짐이 도움이 될 거예요")).toHaveLength(0);
    expect(() => assertTone("곧게 자라는 나무처럼, 다시 위를 향하는 힘이 있어요")).not.toThrow();
  });
});
