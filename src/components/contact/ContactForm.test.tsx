import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import ContactForm from "./ContactForm";
import { submitInquiry } from "@/app/contact/actions";

vi.mock("@/app/contact/actions", () => ({
  submitInquiry: vi.fn(),
}));

function fillForm() {
  fireEvent.change(screen.getByLabelText("회신 받을 이메일"), { target: { value: "me@omni.app" } });
  fireEvent.change(screen.getByLabelText("제목"), { target: { value: "문의 제목" } });
  fireEvent.change(screen.getByLabelText("내용"), { target: { value: "문의 내용입니다" } });
}

describe("문의 폼 (§9.2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  it("이메일·제목·내용 중 하나라도 비어 있으면 보내기 버튼이 비활성 상태다", () => {
    render(<ContactForm defaultEmail="" />);
    const button = screen.getByRole("button", { name: "보내기" });
    expect(button).toBeDisabled();

    fireEvent.change(screen.getByLabelText("회신 받을 이메일"), { target: { value: "me@omni.app" } });
    expect(button).toBeDisabled();

    fireEvent.change(screen.getByLabelText("제목"), { target: { value: "문의 제목" } });
    expect(button).toBeDisabled();

    fireEvent.change(screen.getByLabelText("내용"), { target: { value: "문의 내용입니다" } });
    expect(button).not.toBeDisabled();
  });

  it("제출이 성공하면 폼 대신 감사 안내를 보여준다", async () => {
    vi.mocked(submitInquiry).mockResolvedValue({ ok: true });
    render(<ContactForm defaultEmail="" />);
    fillForm();

    fireEvent.click(screen.getByRole("button", { name: "보내기" }));

    expect(await screen.findByText(/잘 받았어요/)).toBeInTheDocument();
    expect(screen.queryByLabelText("회신 받을 이메일")).not.toBeInTheDocument();
  });

  it("검증 실패 결과면 다시 확인해 달라는 오류 문구를 보여주고 폼은 남아있다", async () => {
    vi.mocked(submitInquiry).mockResolvedValue({ ok: false, reason: "invalid" });
    render(<ContactForm defaultEmail="" />);
    fillForm();

    fireEvent.click(screen.getByRole("button", { name: "보내기" }));

    expect(await screen.findByText(/입력을 다시 확인해/)).toBeInTheDocument();
    expect(screen.getByLabelText("회신 받을 이메일")).toBeInTheDocument();
  });

  it("서버 오류 결과면 접수가 어렵다는 오류 문구를 보여준다", async () => {
    vi.mocked(submitInquiry).mockResolvedValue({ ok: false, reason: "error" });
    render(<ContactForm defaultEmail="" />);
    fillForm();

    fireEvent.click(screen.getByRole("button", { name: "보내기" }));

    expect(await screen.findByText(/지금은 접수가 어려워요/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "보내기" })).not.toBeDisabled());
  });
});
