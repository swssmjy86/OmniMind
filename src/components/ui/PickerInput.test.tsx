import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PickerInput from "./PickerInput";

describe("PickerInput", () => {
  it(
    "값이 없으면 안내 문구를 보여준다 — iOS WebKit(카톡 인앱 브라우저)은 빈 date/time " +
      "입력에 아무것도 그리지 않아 '텅 빈 상자'로 보인다",
    () => {
      const { container } = render(
        <PickerInput type="date" value="" onChange={() => {}} placeholder="눌러서 날짜를 골라 주세요" />,
      );
      expect(screen.getByText("눌러서 날짜를 골라 주세요")).toBeInTheDocument();
      // 안드로이드의 네이티브 자리표시('연도-월-일')와 겹치지 않게 입력 글자는 투명 처리
      expect(container.querySelector("input")).toHaveClass("text-transparent");
    },
  );

  it("값이 생기면 안내 문구가 사라지고 입력 글자가 보인다", () => {
    const { container } = render(
      <PickerInput type="date" value="2000-01-07" onChange={() => {}} placeholder="눌러서 날짜를 골라 주세요" />,
    );
    expect(screen.queryByText("눌러서 날짜를 골라 주세요")).not.toBeInTheDocument();
    expect(container.querySelector("input")).not.toHaveClass("text-transparent");
  });

  it("포커스 중에는 안내 문구를 치우고 입력 글자를 드러낸다 — 키보드로 칸을 채우는 동안 value는 빈 문자열이라 투명 처리가 타이핑을 가린다", () => {
    const { container } = render(
      <PickerInput type="date" value="" onChange={() => {}} placeholder="눌러서 날짜를 골라 주세요" />,
    );
    const input = container.querySelector("input")!;
    fireEvent.focus(input);
    expect(screen.queryByText("눌러서 날짜를 골라 주세요")).not.toBeInTheDocument();
    expect(input).not.toHaveClass("text-transparent");
    fireEvent.blur(input);
    expect(screen.getByText("눌러서 날짜를 골라 주세요")).toBeInTheDocument();
  });

  it("변경 값을 onChange로 올려보낸다", () => {
    const onChange = vi.fn();
    const { container } = render(
      <PickerInput type="date" value="" onChange={onChange} placeholder="날짜" />,
    );
    fireEvent.change(container.querySelector("input")!, { target: { value: "1995-05-05" } });
    expect(onChange).toHaveBeenCalledWith("1995-05-05");
  });

  it("disabled면 입력이 비활성화되고 안내 문구도 흐려진다", () => {
    const { container } = render(
      <PickerInput type="time" value="" onChange={() => {}} placeholder="시간" disabled />,
    );
    expect(container.querySelector("input")).toBeDisabled();
    expect(screen.getByText("시간")).toHaveClass("opacity-40");
  });

  it("min/max를 네이티브 입력에 전달한다 — 연도 칸 자릿수 제한", () => {
    const { container } = render(
      <PickerInput
        type="date"
        value=""
        onChange={() => {}}
        placeholder="날짜"
        min="1900-01-01"
        max="2100-12-31"
      />,
    );
    const input = container.querySelector("input");
    expect(input).toHaveAttribute("min", "1900-01-01");
    expect(input).toHaveAttribute("max", "2100-12-31");
  });
});
