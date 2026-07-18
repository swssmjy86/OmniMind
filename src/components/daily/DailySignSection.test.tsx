import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import DailySignSection from "./DailySignSection";
import { yearSign } from "@/lib/engine/year-sign";
import type { DailyGuide } from "@/lib/interpret/content/daily";

const guide: DailyGuide = {
  headline: "오늘은 화(병오)의 기운이 흐르는 날이에요.",
  mind: "해가 만물을 비추듯, 마음속 이야기를 환하게 꺼내 보여도 좋은 날이에요.",
  color: "밝은 코랄",
  keyword: "환한 표현",
  lucky: "안부 인사 한마디",
  personal: "오늘의 기운은 당신과 나란히 걷는 비견의 결이에요. 평소의 당신다움을 믿고 가면 되는 날이죠.",
};

describe("DailySignSection (스펙 §2 띠 일진)", () => {
  it("띠 헤더·년간지·공통 일진·띠 단락·년간 라벨·입춘 고지·온보딩 CTA를 렌더한다", () => {
    render(
      <DailySignSection year={1990} sign={yearSign(1990)} relation={"충"} guide={guide} />,
    );
    expect(screen.getByText("1990년생, 말띠시군요.")).toBeInTheDocument();
    expect(screen.getByText(/경오년의 기운/)).toBeInTheDocument();
    expect(screen.getByText(/화\(병오\)의 기운/)).toBeInTheDocument();
    expect(screen.getByText(/마주 서는 충의 날/)).toBeInTheDocument();
    expect(screen.getByText(/타고난 해의 기운으로 보면/)).toBeInTheDocument();
    expect(screen.getByText(/양력 연도 기준/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /나를 알아보기/ })).toHaveAttribute(
      "href", "/onboarding",
    );
  });

  it("personal이 null이면 년간 문단이 없다", () => {
    render(
      <DailySignSection
        year={1990} sign={yearSign(1990)} relation={null}
        guide={{ ...guide, personal: null }}
      />,
    );
    expect(screen.queryByText(/타고난 해의 기운으로 보면/)).not.toBeInTheDocument();
    expect(screen.getByText(/평온하게 흐르는 사이/)).toBeInTheDocument();
  });
});
