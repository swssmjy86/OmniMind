import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PersonaCard from "./PersonaCard";
import { PRODUCTS } from "@/lib/persona/products";

const profileDeep = PRODUCTS.find((p) => p.id === "chongun")!;
const fate = PRODUCTS.find((p) => p.id === "career")!;

describe("PersonaCard (§4.3 CSS 모션 카드)", () => {
  it("live 상품 — 페르소나 멘트가 진짜 텍스트로, 카드 전체가 링크로 렌더된다", () => {
    render(<PersonaCard product={profileDeep} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/saju/chongun");
    expect(screen.getByText("서온")).toBeInTheDocument();
    expect(screen.getByText("총운")).toBeInTheDocument();
    // 멘트는 이미지가 아닌 텍스트 — 스크린리더·SEO에 잡힌다(§4.3)
    expect(screen.getByText(/서고에 이미 닿아 있어요/)).toBeInTheDocument();
    expect(screen.getByText("로그인하면 무료")).toBeInTheDocument();
  });

  it("soon 상품 — 링크가 없고 '곧 만나요'로 비활성 표시된다", () => {
    render(<PersonaCard product={fate} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("직업운")).toBeInTheDocument();
    expect(screen.getByText("곧 만나요")).toBeInTheDocument();
  });

  it("장식(글리프·별)은 스크린리더에서 숨겨진다", () => {
    const { container } = render(<PersonaCard product={profileDeep} />);
    const decorations = container.querySelectorAll("[aria-hidden]");
    expect(decorations.length).toBeGreaterThan(0);
  });
});
