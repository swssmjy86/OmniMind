import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import YearForm from "./YearForm";

describe("YearForm (스펙 §2 입력 폼)", () => {
  beforeEach(() => window.localStorage.clear());

  it("year 이름의 숫자 입력(1900~올해)과 제출 버튼을 GET 폼으로 렌더한다", () => {
    render(<YearForm currentYear={2026} />);
    const input = screen.getByLabelText("태어난 해 (4자리)");
    expect(input).toHaveAttribute("name", "year");
    expect(input).toHaveAttribute("min", "1900");
    expect(input).toHaveAttribute("max", "2026");
    expect(input.closest("form")).toHaveAttribute("method", "get");
    expect(screen.getByRole("button", { name: "내 띠로 오늘 보기" })).toBeInTheDocument();
  });

  it("invalid면 부드러운 안내를 보여준다", () => {
    render(<YearForm currentYear={2026} invalid />);
    expect(screen.getByText(/1900년부터 올해 사이/)).toBeInTheDocument();
  });

  it("localStorage에 저장된 년도를 prefill한다", () => {
    window.localStorage.setItem("om-birth-year", "1990");
    render(<YearForm currentYear={2026} />);
    expect(screen.getByLabelText("태어난 해 (4자리)")).toHaveValue(1990);
  });
});
