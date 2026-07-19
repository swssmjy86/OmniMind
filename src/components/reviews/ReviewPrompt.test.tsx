import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ReviewPrompt from "./ReviewPrompt";
import { submitReview } from "@/lib/reviews/actions";

vi.mock("@/lib/reviews/actions", () => ({ submitReview: vi.fn() }));

describe("ReviewPrompt (4단계 스펙 §2)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("별 5개와 비활성 남기기 버튼 — 별점 선택 시 활성", () => {
    render(<ReviewPrompt readingId="r-1" />);
    expect(screen.getByText("이 풀이, 어땠나요?")).toBeInTheDocument();
    const stars = screen.getAllByRole("button", { name: /점/ });
    expect(stars).toHaveLength(5);
    expect(screen.getByRole("button", { name: "남기기" })).toBeDisabled();
    fireEvent.click(stars[3]); // 4점
    expect(screen.getByRole("button", { name: "남기기" })).not.toBeDisabled();
  });

  it("제출 성공 → 감사 문구·내 후기 표시", async () => {
    vi.mocked(submitReview).mockResolvedValue({ ok: true });
    render(<ReviewPrompt readingId="r-1" />);
    fireEvent.click(screen.getAllByRole("button", { name: /점/ })[4]);
    fireEvent.change(screen.getByPlaceholderText(/한 줄로 남겨주시면/), {
      target: { value: "따뜻했어요" },
    });
    fireEvent.click(screen.getByRole("button", { name: "남기기" }));
    expect(await screen.findByText(/감사히 받았어요/)).toBeInTheDocument();
    expect(vi.mocked(submitReview)).toHaveBeenCalledWith("r-1", 5, "따뜻했어요");
  });

  it("이미 남긴 풀이(initial) — 폼 없이 내 후기만", () => {
    render(<ReviewPrompt readingId="r-1" initial={{ rating: 4, comment: "좋았어요" }} />);
    expect(screen.getByText(/내가 남긴 후기/)).toBeInTheDocument();
    expect(screen.getByText(/좋았어요/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "남기기" })).not.toBeInTheDocument();
  });

  it("exists 실패 → 이미 남긴 상태로 전환(재요청 없음)", async () => {
    vi.mocked(submitReview).mockResolvedValue({ ok: false, reason: "exists" });
    render(<ReviewPrompt readingId="r-1" />);
    fireEvent.click(screen.getAllByRole("button", { name: /점/ })[2]);
    fireEvent.click(screen.getByRole("button", { name: "남기기" }));
    expect(await screen.findByText(/이미 이 풀이의 후기를 받았어요/)).toBeInTheDocument();
  });
});
