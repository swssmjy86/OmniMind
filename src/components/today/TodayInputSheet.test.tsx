import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TodayInputSheet from "./TodayInputSheet";
import { TODAY_BIRTH_KEY } from "@/lib/today/birth-store";

describe("오늘의운세 입력 시트 (스펙 §3 팝업)", () => {
  beforeEach(() => window.localStorage.clear());

  it("성별·확인 버튼을 렌더한다", () => {
    render(<TodayInputSheet onSaved={() => {}} />);
    expect(screen.getByRole("button", { name: "남성" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "여성" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "오늘의 기운 보기" })).not.toBeDisabled();
  });

  it("성별 선택 없이도 제출 가능하고, 저장 후 콜백·localStorage에 남는다", () => {
    const onSaved = vi.fn();
    render(<TodayInputSheet onSaved={onSaved} />);
    const submit = screen.getByRole("button", { name: "오늘의 기운 보기" });
    fireEvent.click(submit);
    expect(onSaved).toHaveBeenCalledWith({ gender: null });
    expect(window.localStorage.getItem(TODAY_BIRTH_KEY)).toContain("gender");
  });

  it("성별을 선택하면 저장값에 반영된다", () => {
    const onSaved = vi.fn();
    render(<TodayInputSheet onSaved={onSaved} />);
    fireEvent.click(screen.getByRole("button", { name: "남성" }));
    fireEvent.click(screen.getByRole("button", { name: "오늘의 기운 보기" }));
    expect(onSaved).toHaveBeenCalledWith({ gender: "male" });
  });
});
