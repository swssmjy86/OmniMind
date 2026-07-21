import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { computeProfile } from "@/lib/engine";
import StemCombineDiagram from "./StemCombineDiagram";

const base = computeProfile({ birthDate: "1995-08-20", birthTime: "14:30", timeUnknown: false });

describe("StemCombineDiagram — 천간합 원형 다이어그램", () => {
  it("합이 없으면 아무것도 렌더하지 않는다(과장 없음)", () => {
    const ctx = { ...base, pillars: { year: "갑자", month: "을축", day: "병인", hour: "정묘" } };
    const { container } = render(<StemCombineDiagram ctx={ctx} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("합이 있으면 svg와 연결선을 렌더한다", () => {
    const ctx = { ...base, pillars: { year: "갑자", month: "기축", day: "병인", hour: "신묘" } };
    const { container } = render(<StemCombineDiagram ctx={ctx} />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    // 갑기합(년-월) + 병신합(일-시) 두 쌍 → line 2개
    expect(container.querySelectorAll("line")).toHaveLength(2);
    expect(container.textContent).toContain("기둥의 천간이 서로 합을 이루고 있어요");
  });

  it("시주 미상이어도 크래시 없이 동작한다", () => {
    const ctx = { ...base, pillars: { year: "갑자", month: "기축", day: "을묘", hour: null } };
    expect(() => render(<StemCombineDiagram ctx={ctx} />)).not.toThrow();
  });
});
