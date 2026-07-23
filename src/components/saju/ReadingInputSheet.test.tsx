import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ReadingInputSheet from "./ReadingInputSheet";

describe("ReadingInputSheet — 풀이 진입 입력 시트", () => {
  it("특성 모드 — 생년월일 없이 MBTI 4축 + 혈액형만으로 제출된다", async () => {
    const onSubmit = vi.fn();
    render(<ReadingInputSheet mode="traits" personaId="seoon" onSubmit={onSubmit} />);

    // 페르소나 헤더 + 생년월일 필드 없음
    expect(screen.getByText(/서온/)).toBeInTheDocument();
    expect(screen.queryByText("태어난 날")).not.toBeInTheDocument();

    const button = screen.getByRole("button", { name: "풀이 보기" });
    expect(button).toBeDisabled();

    fireEvent.click(screen.getByText("외향 E"));
    fireEvent.click(screen.getByText("직관 N"));
    fireEvent.click(screen.getByText("감정 F"));
    fireEvent.click(screen.getByText("유연 P"));
    expect(button).toBeDisabled(); // 혈액형 전까진 잠김

    fireEvent.click(screen.getByText("A형"));
    expect(button).toBeEnabled();

    fireEvent.click(button);
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ mbti: "ENFP", blood: "A" });
  });

  it("전체 모드 — 생년월일이 없으면 제출 불가, 시간을 비우면 timeUnknown", async () => {
    const onSubmit = vi.fn();
    render(<ReadingInputSheet mode="full" personaId="byeori" onSubmit={onSubmit} />);

    expect(screen.getByText("태어난 날")).toBeInTheDocument();
    fireEvent.click(screen.getByText("내향 I"));
    fireEvent.click(screen.getByText("현실 S"));
    fireEvent.click(screen.getByText("사고 T"));
    fireEvent.click(screen.getByText("계획 J"));
    fireEvent.click(screen.getByText("O형"));

    const button = screen.getByRole("button", { name: "풀이 보기" });
    expect(button).toBeDisabled(); // 생년월일 없음

    const date = document.querySelector('input[type="date"]')!;
    fireEvent.change(date, { target: { value: "1995-08-20" } });
    expect(button).toBeEnabled();

    fireEvent.click(button);
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      birthDate: "1995-08-20", timeUnknown: true, mbti: "ISTJ", blood: "O",
    });
  });

  it("initial 값으로 MBTI·혈액형이 미리 선택된다", () => {
    render(
      <ReadingInputSheet
        mode="traits" personaId="geumo"
        initial={{ mbti: "entp", blood: "AB" }}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "풀이 보기" })).toBeEnabled();
  });
});
