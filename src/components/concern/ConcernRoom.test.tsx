import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { sessionStore } from "@/lib/session-store";
import { describe, expect, it, vi, beforeEach } from "vitest";
import ConcernRoom, { type PastAdvice } from "./ConcernRoom";
import { submitConcern } from "@/lib/concern/actions";
import type { ProfileContext } from "@/lib/engine";

vi.mock("@/lib/concern/actions", () => ({ submitConcern: vi.fn() }));

const CONCERN_KEY = "om_concern_log";
const profile = {} as ProfileContext;
const PAST: PastAdvice[] = [
  {
    id: "advice-1",
    date: "오늘",
    sections: [
      { title: "고민", body: "이직을 고민하고 있어요" },
      { title: "당신에게", body: "천천히 살펴봐요." },
    ],
  },
];

describe("ConcernRoom — 익명 로컬 기록", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStore.clear();
  });

  it("제목·카테고리·입력을 렌더하고 빈 입력이면 버튼이 비활성이다", () => {
    render(<ConcernRoom nickname="새벽" profile={profile} />);
    expect(screen.getByRole("heading", { name: "고민" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "관계" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/편하게 들려주세요/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "함께 생각해보기" })).toBeDisabled();
  });

  it("localStorage 기록을 불러오고, 항목 삭제는 즉시 목록·저장소에서 지운다", () => {
    sessionStore.setItem(CONCERN_KEY, JSON.stringify(PAST));
    render(<ConcernRoom nickname="달빛" profile={profile} />);

    expect(screen.getAllByText(/이직을 고민하고 있어요/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByLabelText("이 고민 기록 삭제"));

    expect(screen.queryAllByText(/이직을 고민하고 있어요/)).toHaveLength(0);
    expect(JSON.parse(sessionStore.getItem(CONCERN_KEY)!)).toHaveLength(0);
  });

  it("전체 삭제는 확인 후에만 진행된다", () => {
    sessionStore.setItem(CONCERN_KEY, JSON.stringify(PAST));
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<ConcernRoom nickname="달빛" profile={profile} />);

    fireEvent.click(screen.getByText("전체 삭제"));
    expect(screen.getAllByText(/이직을 고민하고 있어요/).length).toBeGreaterThan(0);
  });

  it("제출하면 프로필 맥락과 함께 submitConcern을 부르고 조언을 렌더한다", async () => {
    vi.mocked(submitConcern).mockResolvedValue({
      ok: true, source: "template",
      sections: [
        { title: "고민", body: "이직 고민" },
        { title: "오늘의 결", body: "차분히 들여다봐요." },
      ],
    });
    render(<ConcernRoom nickname="새벽" profile={profile} />);
    fireEvent.change(screen.getByPlaceholderText(/편하게 들려주세요/), {
      target: { value: "이직 고민" },
    });
    fireEvent.click(screen.getByRole("button", { name: "함께 생각해보기" }));

    expect((await screen.findAllByText("차분히 들여다봐요.")).length).toBeGreaterThan(0);
    await waitFor(() =>
      expect(submitConcern).toHaveBeenCalledWith(
        expect.objectContaining({ nickname: "새벽", concern: "이직 고민", profile }),
      ),
    );
  });
});
