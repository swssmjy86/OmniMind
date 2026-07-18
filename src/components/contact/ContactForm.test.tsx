import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ContactForm from "./ContactForm";

describe("문의 폼 (§9.2)", () => {
  it("이메일·제목·내용 입력과 보내기 버튼이 렌더된다", () => {
    render(<ContactForm defaultEmail="" />);
    expect(screen.getByLabelText("회신 받을 이메일")).toBeInTheDocument();
    expect(screen.getByLabelText("제목")).toBeInTheDocument();
    expect(screen.getByLabelText("내용")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "보내기" })).toBeInTheDocument();
  });

  it("로그인 이메일이 있으면 미리 채워진다", () => {
    render(<ContactForm defaultEmail="me@omni.app" />);
    expect(screen.getByLabelText("회신 받을 이메일")).toHaveValue("me@omni.app");
  });
});
