import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ConcernRoom from "@/components/concern/ConcernRoom";
import type { ProfileContext } from "@/lib/engine";

// 익명 앱: 탭 페이지는 로컬 프로필을 읽는 클라이언트 게이트라, 대표로 고민 룸을 직접
// 렌더해 기본 UI를 확인한다(흐름 검증은 E2E).
describe("탭 페이지 렌더", () => {
  it("고민 룸이 제목·카테고리·입력을 렌더한다", () => {
    render(<ConcernRoom nickname="새벽" profile={{} as ProfileContext} />);
    expect(screen.getByRole("heading", { name: "고민" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "관계" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/편하게 들려주세요/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "함께 생각해보기" })).toBeDisabled();
  });
});
