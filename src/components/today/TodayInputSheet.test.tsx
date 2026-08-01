import { fireEvent, render, screen } from "@testing-library/react";
import { sessionStore } from "@/lib/session-store";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TodayInputSheet from "./TodayInputSheet";
import { TODAY_BIRTH_KEY } from "@/lib/today/birth-store";

describe("오늘의운세 입력 시트 (스펙 §3 팝업)", () => {
  beforeEach(() => sessionStore.clear());

  it("태어난 날·태어난 시간·성별·확인 버튼을 렌더한다", () => {
    render(<TodayInputSheet onSaved={() => {}} />);
    expect(screen.getByText("태어난 날")).toBeInTheDocument();
    expect(screen.getByText("태어난 시간")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "남성" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "여성" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "오늘의 기운 보기" })).toBeDisabled();
  });

  it("태어난 날만 고르고 시간이 비어 있으면 제출 버튼이 계속 비활성 상태다", () => {
    render(<TodayInputSheet onSaved={() => {}} />);
    const dateInput = document.querySelector('input[type="date"]')!;
    fireEvent.change(dateInput, { target: { value: "1990-06-15" } });
    expect(screen.getByRole("button", { name: "오늘의 기운 보기" })).toBeDisabled();
  });

  it("태어난 시간·성별을 채우면 저장값에 반영된다", () => {
    const onSaved = vi.fn();
    render(<TodayInputSheet onSaved={onSaved} />);
    const dateInput = document.querySelector('input[type="date"]')!;
    const timeInput = document.querySelector('input[type="time"]')!;
    fireEvent.change(dateInput, { target: { value: "1990-06-15" } });
    fireEvent.change(timeInput, { target: { value: "23:30" } });
    fireEvent.click(screen.getByRole("button", { name: "남성" }));
    fireEvent.click(screen.getByRole("button", { name: "오늘의 기운 보기" }));
    expect(onSaved).toHaveBeenCalledWith({ birthDate: "1990-06-15", birthTime: "23:30", gender: "male" });
    expect(sessionStore.getItem(TODAY_BIRTH_KEY)).toContain("1990-06-15");
  });
});
