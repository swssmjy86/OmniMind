import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TodayInputSheet from "./TodayInputSheet";
import { TODAY_BIRTH_KEY } from "@/lib/today/birth-store";

describe("오늘의운세 입력 시트 (스펙 §3 팝업)", () => {
  beforeEach(() => window.localStorage.clear());

  it("태어난 날·성별·확인 버튼을 렌더한다", () => {
    render(<TodayInputSheet onSaved={() => {}} />);
    expect(screen.getByText("태어난 날")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "남성" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "여성" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "오늘의 기운 보기" })).toBeDisabled();
  });

  it("태어난 날을 고르면 제출 가능해지고, 저장 후 콜백·localStorage에 남는다", () => {
    const onSaved = vi.fn();
    render(<TodayInputSheet onSaved={onSaved} />);
    // document.body로 포탈 렌더링되므로 RTL container가 아닌 document 전체에서 찾는다.
    const dateInput = document.querySelector('input[type="date"]')!;
    fireEvent.change(dateInput, { target: { value: "1990-06-15" } });
    const submit = screen.getByRole("button", { name: "오늘의 기운 보기" });
    expect(submit).not.toBeDisabled();
    fireEvent.click(submit);
    expect(onSaved).toHaveBeenCalledWith({ birthDate: "1990-06-15", gender: null });
    expect(window.localStorage.getItem(TODAY_BIRTH_KEY)).toContain("1990-06-15");
  });

  it("성별을 선택하면 저장값에 반영된다", () => {
    const onSaved = vi.fn();
    render(<TodayInputSheet onSaved={onSaved} />);
    const dateInput = document.querySelector('input[type="date"]')!;
    fireEvent.change(dateInput, { target: { value: "1990-06-15" } });
    fireEvent.click(screen.getByRole("button", { name: "남성" }));
    fireEvent.click(screen.getByRole("button", { name: "오늘의 기운 보기" }));
    expect(onSaved).toHaveBeenCalledWith({ birthDate: "1990-06-15", gender: "male" });
  });
});
