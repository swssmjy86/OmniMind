import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GuestReadingView from "./GuestReadingView";
import { loadDraft, isCompleteDraft } from "@/app/onboarding/draft";
import { computeGuestChongun, computeGuestCreditReading } from "@/lib/readings/guest-actions";
import { computeProfile } from "@/lib/engine";

vi.mock("@/app/onboarding/draft", () => ({
  loadDraft: vi.fn(),
  isCompleteDraft: vi.fn(),
}));
vi.mock("@/lib/readings/guest-actions", () => ({
  computeGuestChongun: vi.fn(),
  computeGuestCreditReading: vi.fn(),
}));

const draft = { nickname: "다인", birthDate: "1995-08-20", birthTime: "14:30", timeUnknown: false };
const ctx = computeProfile({ birthDate: "1995-08-20", birthTime: "14:30", timeUnknown: false });

describe("GuestReadingView — 게스트 총운/사주상품 뷰", () => {
  beforeEach(() => vi.clearAllMocks());

  it("draft가 없으면 온보딩 유도 카드를 보여준다", async () => {
    vi.mocked(loadDraft).mockReturnValue(null);
    render(<GuestReadingView product="chongun" title="총운" />);
    expect(await screen.findByRole("link", { name: /나를 알아보기/ })).toHaveAttribute(
      "href", "/onboarding",
    );
    expect(computeGuestChongun).not.toHaveBeenCalled();
  });

  it("draft가 불완전하면(isCompleteDraft false) 온보딩 유도 카드를 보여준다", async () => {
    vi.mocked(loadDraft).mockReturnValue(draft);
    vi.mocked(isCompleteDraft).mockReturnValue(false);
    render(<GuestReadingView product="chongun" title="총운" />);
    expect(await screen.findByRole("link", { name: /나를 알아보기/ })).toBeInTheDocument();
  });

  it("draft가 있으면 총운 섹션과 SajuChart를 렌더한다", async () => {
    vi.mocked(loadDraft).mockReturnValue(draft);
    vi.mocked(isCompleteDraft).mockReturnValue(true);
    vi.mocked(computeGuestChongun).mockResolvedValue({
      ok: true, ctx, sections: [{ title: "당신을 만나서", body: "다인님, 반가워요." }],
    });
    render(<GuestReadingView product="chongun" title="총운" />);
    expect(await screen.findByText("당신을 만나서")).toBeInTheDocument();
    expect(screen.getByText("사주 명식")).toBeInTheDocument(); // SajuChart 표식
    expect(computeGuestCreditReading).not.toHaveBeenCalled();
  });

  it("career 상품은 computeGuestCreditReading을 부르고 SajuChart는 없다", async () => {
    vi.mocked(loadDraft).mockReturnValue(draft);
    vi.mocked(isCompleteDraft).mockReturnValue(true);
    vi.mocked(computeGuestCreditReading).mockResolvedValue({
      ok: true, ctx, sections: [{ title: "일의 결", body: "다인님, 일에서..." }],
    });
    render(<GuestReadingView product="career" title="직업운" />);
    expect(await screen.findByText("일의 결")).toBeInTheDocument();
    expect(screen.queryByText("사주 명식")).not.toBeInTheDocument();
    expect(computeGuestCreditReading).toHaveBeenCalledWith("career", draft);
  });

  it("액션이 실패하면 부드러운 오류 안내를 보여준다", async () => {
    vi.mocked(loadDraft).mockReturnValue(draft);
    vi.mocked(isCompleteDraft).mockReturnValue(true);
    vi.mocked(computeGuestChongun).mockResolvedValue({ ok: false });
    render(<GuestReadingView product="chongun" title="총운" />);
    await waitFor(() =>
      expect(screen.getByText(/지금은 풀이를 준비하지 못했어요/)).toBeInTheDocument(),
    );
  });

  it("로그인하면 더 받을 수 있다는 안내 문구가 있다(전환 유도)", async () => {
    vi.mocked(loadDraft).mockReturnValue(draft);
    vi.mocked(isCompleteDraft).mockReturnValue(true);
    vi.mocked(computeGuestChongun).mockResolvedValue({
      ok: true, ctx, sections: [{ title: "타고난 결", body: "..." }],
    });
    render(<GuestReadingView product="chongun" title="총운" />);
    expect(await screen.findByText(/로그인하면/)).toBeInTheDocument();
  });
});
