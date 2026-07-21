import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import GuestMatchDeepGate from "./GuestMatchDeepGate";
import { loadDraft, isCompleteDraft } from "@/app/onboarding/draft";

vi.mock("@/app/onboarding/draft", () => ({
  loadDraft: vi.fn(),
  isCompleteDraft: vi.fn(),
}));

describe("GuestMatchDeepGate", () => {
  it("draft가 없으면 온보딩 유도 카드를 보여준다", async () => {
    vi.mocked(loadDraft).mockReturnValue(null);
    render(<GuestMatchDeepGate />);
    expect(await screen.findByRole("link", { name: /나를 알아보기/ })).toHaveAttribute(
      "href", "/onboarding",
    );
  });

  it("draft가 있으면 MatchDeepForm(게스트 모드)을 렌더한다", async () => {
    const draft = { nickname: "다인", birthDate: "1995-08-20", birthTime: "14:30", timeUnknown: false };
    vi.mocked(loadDraft).mockReturnValue(draft);
    vi.mocked(isCompleteDraft).mockReturnValue(true);
    render(<GuestMatchDeepGate />);
    expect(await screen.findByText("상대의 생년월일")).toBeInTheDocument();
    // 게스트 모드라 크레딧 잔여 문구가 없다(effectiveUnlimited)
    expect(screen.queryByText(/크레딧 1개로/)).not.toBeInTheDocument();
  });
});
