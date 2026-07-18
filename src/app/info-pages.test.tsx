import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SourcesPage from "./sources/page";
import FaqPage, { FAQ_ITEMS } from "./faq/page";
import TermsPage from "./terms/page";
import PrivacyPage from "./privacy/page";

// /sources /faq /terms /privacy 는 세션을 읽지 않는 동기 서버 컴포넌트라 직접 렌더한다
// (pages.test.tsx의 async 페이지 제외 원칙과 일관).
describe("/sources (§7 출처)", () => {
  it("검증 가능한 계산 근거 — USNO·KASI 대조를 명시한다", () => {
    render(<SourcesPage />);
    expect(screen.getByRole("heading", { level: 1, name: /풀이의 근거/ })).toBeInTheDocument();
    expect(screen.getByText(/USNO/)).toBeInTheDocument();
    expect(screen.getByText(/한국천문연구원/)).toBeInTheDocument();
    expect(screen.getByText(/467건/)).toBeInTheDocument();
  });

  it("AI 고지 — 계산에 AI가 관여하지 않음을 밝힌다", () => {
    render(<SourcesPage />);
    expect(screen.getByText(/계산에는 AI가 관여하지 않아요/)).toBeInTheDocument();
  });

  it("해석의 한계를 정직하게 고지한다 — 문장은 옴니마인드가 쓴다", () => {
    render(<SourcesPage />);
    expect(screen.getByText(/문장은 옴니마인드가 써요/)).toBeInTheDocument();
  });
});

describe("/faq (§8 Q&A)", () => {
  it("7개 문항이 <details>로 렌더된다", () => {
    const { container } = render(<FaqPage />);
    expect(FAQ_ITEMS).toHaveLength(7);
    expect(container.querySelectorAll("details")).toHaveLength(7);
    expect(screen.getByText("사주 계산은 정확한가요?")).toBeInTheDocument();
    expect(screen.getByText("MBTI·혈액형은 왜 물어보나요?")).toBeInTheDocument();
  });

  it("FAQPage JSON-LD가 7개 문항과 함께 들어간다", () => {
    const { container } = render(<FaqPage />);
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).not.toBeNull();
    const data = JSON.parse(script!.textContent ?? "{}");
    expect(data["@type"]).toBe("FAQPage");
    expect(data.mainEntity).toHaveLength(7);
    expect(data.mainEntity[0]["@type"]).toBe("Question");
  });

  it("모든 답변이 톤 규칙을 지킨다 — 단정형·명령형 없음", () => {
    for (const item of FAQ_ITEMS) {
      expect(item.a).not.toMatch(/[가-힣]니다/);
      expect(item.a).not.toMatch(/하세요/);
    }
  });
});

describe("/terms · /privacy (§9.3 개발 단계 초안)", () => {
  it("두 문서 모두 상단에 개발 단계 초안 표기가 있다", () => {
    const { unmount } = render(<TermsPage />);
    expect(screen.getByText(/개발 단계 초안 — 정식 오픈 전 법률 검토 예정/)).toBeInTheDocument();
    unmount();
    render(<PrivacyPage />);
    expect(screen.getByText(/개발 단계 초안 — 정식 오픈 전 법률 검토 예정/)).toBeInTheDocument();
  });

  it("이용약관 — 환불 규정과 면책이 있다", () => {
    render(<TermsPage />);
    expect(screen.getByText(/청약철회·환불/)).toBeInTheDocument();
    // "참고용"은 §1·§4 두 곳에 나온다 — 단일 매치 쿼리(getByText)는 던지므로 개수로 확인
    expect(screen.getAllByText(/참고용/).length).toBeGreaterThan(0);
  });

  it("개인정보처리방침 — 국외이전(OpenRouter·Gemini·Vercel)을 실제대로 고지한다", () => {
    render(<PrivacyPage />);
    expect(screen.getByText(/OpenRouter/)).toBeInTheDocument();
    expect(screen.getByText(/Google Gemini/)).toBeInTheDocument();
    expect(screen.getByText(/Vercel/)).toBeInTheDocument();
    expect(screen.getByText(/토스페이먼츠/)).toBeInTheDocument();
  });
});
