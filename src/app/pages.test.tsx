import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ConcernRoom from "@/components/concern/ConcernRoom";

// 홈(/)·나(/me)·마음(/mind)·고민(/concern) 페이지는 Supabase 세션을 읽는 async
// 서버 컴포넌트라 동기 스모크 렌더 대상에서 제외한다(흐름 검증은 E2E).
// 고민 탭은 클라이언트 컴포넌트(ConcernRoom)를 직접 렌더해 확인한다.
describe("탭 페이지 렌더", () => {
  it("고민 룸이 제목·카테고리·입력을 렌더한다", () => {
    render(<ConcernRoom nickname="새벽" remaining={3} past={[]} />);
    expect(screen.getByRole("heading", { name: "고민" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "관계" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/편하게 들려주세요/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "함께 생각해보기" })).toBeDisabled();
  });

  it("소진 상태에선 입력 대신 안내를 보여준다", () => {
    render(<ConcernRoom nickname="새벽" remaining={0} past={[]} />);
    expect(screen.getByText(/오늘 나눌 수 있는 고민 이야기는 여기까지예요/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "함께 생각해보기" })).not.toBeInTheDocument();
  });
});
