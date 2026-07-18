import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TodayInputSheet from "./TodayInputSheet";
import { TODAY_BIRTH_KEY } from "@/lib/today/birth-store";

describe("오늘의운세 입력 시트 (스펙 §3 팝업)", () => {
  beforeEach(() => window.localStorage.clear());

  it("생년월일·태어난 시·시간 몰라요·성별·확인 버튼을 렌더한다", () => {
    render(<TodayInputSheet onSaved={() => {}} />);
    expect(screen.getByText("태어난 날")).toBeInTheDocument();
    expect(screen.getByText("태어난 시간")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "시간을 몰라요" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "남성" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "여성" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "오늘의 기운 보기" })).toBeDisabled();
  });

  it("날짜 + 시간 몰라요면 제출 가능해지고, 저장 후 콜백·localStorage에 남는다", () => {
    const onSaved = vi.fn();
    const { container } = render(<TodayInputSheet onSaved={onSaved} />);
    const dateInput = container.querySelector('input[type="date"]')!;
    fireEvent.change(dateInput, { target: { value: "1990-06-15" } });
    fireEvent.click(screen.getByRole("button", { name: "시간을 몰라요" }));
    const submit = screen.getByRole("button", { name: "오늘의 기운 보기" });
    expect(submit).not.toBeDisabled();
    fireEvent.click(submit);
    expect(onSaved).toHaveBeenCalledWith({
      birthDate: "1990-06-15", birthTime: "", timeUnknown: true, gender: null,
    });
    expect(window.localStorage.getItem(TODAY_BIRTH_KEY)).toContain("1990-06-15");
  });
});
