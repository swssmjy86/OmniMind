import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import ShareSheet from "./ShareSheet";

const QUERY = "dm=%EA%B0%91&el=%EB%AA%A9&mbti=ENFJ&zo=%EC%82%AC%EC%9E%90%EC%9E%90%EB%A6%AC&blood=O";

/** 시그니처 + IHDR 청크(폭·높이)만 있는 최소 PNG 바이트 — pngDimensions가 읽을 수 있으면 충분. */
function fakePngBytes(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(24);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10], 0);
  bytes.set([0x49, 0x48, 0x44, 0x52], 12);
  new DataView(bytes.buffer).setUint32(16, width, false);
  new DataView(bytes.buffer).setUint32(20, height, false);
  return bytes;
}

const { addImageMock, saveMock } = vi.hoisted(() => ({ addImageMock: vi.fn(), saveMock: vi.fn() }));
vi.mock("jspdf", () => ({
  // 화살표 함수는 new로 호출할 수 없어 일반 함수로 생성자를 흉내낸다.
  jsPDF: vi.fn().mockImplementation(function jsPDFMock() {
    return { addImage: addImageMock, save: saveMock };
  }),
}));

describe("ShareSheet", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    addImageMock.mockClear();
    saveMock.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("접힌 상태에서는 만들기 버튼만 보인다", () => {
    render(<ShareSheet query={QUERY} via="profile" label="나의 조각 카드" />);
    expect(screen.getByText("나의 조각 카드 만들기 ✨")).toBeInTheDocument();
    expect(screen.queryByAltText("나의 조각 카드")).not.toBeInTheDocument();
  });

  it("펼치면 카드 미리보기(/api/card)와 저장 링크가 나온다", () => {
    render(<ShareSheet query={QUERY} via="profile" label="나의 조각 카드" />);
    fireEvent.click(screen.getByText("나의 조각 카드 만들기 ✨"));

    const img = screen.getByAltText("나의 조각 카드");
    expect(img).toHaveAttribute("src", `/api/card?${QUERY}`);

    const save = screen.getByText("이미지 저장").closest("a");
    expect(save).toHaveAttribute("href", `/api/card?${QUERY}`);
    expect(save).toHaveAttribute("download");
  });

  it("링크 복사는 ?ref=card&via=<진입점> 링크를 클립보드에 넣는다", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<ShareSheet query={QUERY} via="daily" label="오늘의 나 카드" />);
    fireEvent.click(screen.getByText("오늘의 나 카드 만들기 ✨"));
    fireEvent.click(screen.getByText("링크 복사"));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(expect.stringContaining("/?ref=card&via=daily"));
    });
    expect(await screen.findByText("복사했어요 ✓")).toBeInTheDocument();
  });

  it("PDF로 저장은 카드 이미지를 페이지 크기에 맞는 한 장짜리 PDF로 감싸 내려받는다", async () => {
    const bytes = fakePngBytes(1080, 1350);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ arrayBuffer: () => Promise.resolve(bytes.buffer) }),
    );

    render(<ShareSheet query={QUERY} via="daily" label="오늘의 나 카드" />);
    fireEvent.click(screen.getByText("오늘의 나 카드 만들기 ✨"));
    fireEvent.click(screen.getByText("PDF로 저장"));

    await waitFor(() => expect(saveMock).toHaveBeenCalledWith("omnimind-daily.pdf"));
    expect(addImageMock).toHaveBeenCalledWith(expect.any(Uint8Array), "PNG", 0, 0, 1080, 1350);
  });

  it("세로로 긴 나의 조각 카드도 페이지 크기를 정확히 잡는다", async () => {
    const bytes = fakePngBytes(1080, 4200);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ arrayBuffer: () => Promise.resolve(bytes.buffer) }),
    );

    render(<ShareSheet query={QUERY} via="profile" label="나의 조각 카드" />);
    fireEvent.click(screen.getByText("나의 조각 카드 만들기 ✨"));
    fireEvent.click(screen.getByText("PDF로 저장"));

    await waitFor(() => expect(saveMock).toHaveBeenCalledWith("omnimind-profile.pdf"));
    expect(addImageMock).toHaveBeenCalledWith(expect.any(Uint8Array), "PNG", 0, 0, 1080, 4200);
  });

  it("PDF 생성이 실패하면 오류 문구를 보여주고 다른 버튼은 계속 동작한다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));

    render(<ShareSheet query={QUERY} via="daily" label="오늘의 나 카드" />);
    fireEvent.click(screen.getByText("오늘의 나 카드 만들기 ✨"));
    fireEvent.click(screen.getByText("PDF로 저장"));

    expect(await screen.findByText("PDF를 만들지 못했어요. 잠시 후 다시 시도해주세요.")).toBeInTheDocument();
    expect(screen.getByText("PDF로 저장")).not.toBeDisabled();
  });
});
