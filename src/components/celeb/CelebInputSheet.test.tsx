import { fireEvent, render, screen } from "@testing-library/react";
import { sessionStore } from "@/lib/session-store";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CelebInputSheet from "./CelebInputSheet";
import { DRAFT_KEY, loadDraft } from "@/app/onboarding/draft";

describe("유명인 궁합 입력 시트 (오늘의운세와 같은 팝업)", () => {
  beforeEach(() => sessionStore.clear());

  it("태어난 날·태어난 시간·성별·확인 버튼을 렌더한다", () => {
    render(<CelebInputSheet onSaved={() => {}} />);
    expect(screen.getByText("태어난 날")).toBeInTheDocument();
    expect(screen.getByText("태어난 시간")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "남성" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "여성" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "궁합 맞춰보기" })).toBeDisabled();
  });

  it("태어난 날만 고르고 시간이 비어 있으면 제출 버튼이 계속 비활성 상태다", () => {
    render(<CelebInputSheet onSaved={() => {}} />);
    const dateInput = document.querySelector('input[type="date"]')!;
    fireEvent.change(dateInput, { target: { value: "1990-06-15" } });
    expect(screen.getByRole("button", { name: "궁합 맞춰보기" })).toBeDisabled();
  });

  it("입력을 채우면 draft로 저장하고 onSaved에 넘긴다", () => {
    const onSaved = vi.fn();
    render(<CelebInputSheet onSaved={onSaved} />);
    const dateInput = document.querySelector('input[type="date"]')!;
    const timeInput = document.querySelector('input[type="time"]')!;
    fireEvent.change(dateInput, { target: { value: "1990-06-15" } });
    fireEvent.change(timeInput, { target: { value: "23:30" } });
    fireEvent.click(screen.getByRole("button", { name: "여성" }));
    fireEvent.click(screen.getByRole("button", { name: "궁합 맞춰보기" }));

    expect(onSaved).toHaveBeenCalledWith({
      nickname: "나",
      birthDate: "1990-06-15",
      birthTime: "23:30",
      timeUnknown: false,
      gender: "female",
    });
    // localStorage draft로도 저장돼, 다음 방문 땐 시트 없이 바로 궁합으로 이어진다.
    expect(sessionStore.getItem(DRAFT_KEY)).toContain("1990-06-15");
    expect(loadDraft()).toEqual({
      nickname: "나",
      birthDate: "1990-06-15",
      birthTime: "23:30",
      timeUnknown: false,
      gender: "female",
    });
  });
});
