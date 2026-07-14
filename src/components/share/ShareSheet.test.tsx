import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import ShareSheet from "./ShareSheet";

const QUERY = "dm=%EA%B0%91&el=%EB%AA%A9&mbti=ENFJ&zo=%EC%82%AC%EC%9E%90%EC%9E%90%EB%A6%AC&blood=O";

describe("ShareSheet", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("접힌 상태에서는 만들기 버튼만 보인다", () => {
    render(<ShareSheet query={QUERY} via="profile" label="나의 조각 카드" />);
    expect(screen.getByText("나의 조각 카드 만들기 ✨")).toBeInTheDocument();
    expect(screen.queryByAltText("나의 조각 카드")).not.toBeInTheDocument();
  });

  it("펼치면 카드 미리보기(/api/card)와 저장 링크가 나온다", () => {
    render(<ShareSheet query={QUERY} via="profile" label="나의 조각 카드" />);
    fireEvent.click(screen.getByText("나의 조각 카드 만들기 ✨"));

    const img = screen.getByAltText("나의 조각 카드");
    expect(img).toHaveAttribute("src", `/api/card?${QUERY}`);

    const save = screen.getByText("이미지 저장").closest("a");
    expect(save).toHaveAttribute("href", `/api/card?${QUERY}`);
    expect(save).toHaveAttribute("download");
  });

  it("링크 복사는 ?ref=card&via=<진입점> 링크를 클립보드에 넣는다", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<ShareSheet query={QUERY} via="daily" label="오늘의 나 카드" />);
    fireEvent.click(screen.getByText("오늘의 나 카드 만들기 ✨"));
    fireEvent.click(screen.getByText("링크 복사"));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(expect.stringContaining("/?ref=card&via=daily"));
    });
    expect(await screen.findByText("복사했어요 ✓")).toBeInTheDocument();
  });
});
