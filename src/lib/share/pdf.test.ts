import { describe, it, expect } from "vitest";
import { pngDimensions } from "./pdf";

/** PNG 헤더(시그니처 + IHDR 청크 앞부분)만 있는 최소 바이트를 만든다 — 픽셀 데이터는 불필요. */
function fakePngHeader(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(24);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10], 0); // 시그니처
  bytes.set([0, 0, 0, 13], 8); // IHDR 길이(13, 실제 값은 안 봄)
  bytes.set([0x49, 0x48, 0x44, 0x52], 12); // "IHDR"
  new DataView(bytes.buffer).setUint32(16, width, false);
  new DataView(bytes.buffer).setUint32(20, height, false);
  return bytes;
}

describe("pngDimensions", () => {
  it("PNG 헤더에서 폭·높이를 읽는다", () => {
    expect(pngDimensions(fakePngHeader(1080, 1350))).toEqual({ width: 1080, height: 1350 });
  });

  it("세로로 긴 카드(나의 조각, 최대 4700px)도 정확히 읽는다", () => {
    expect(pngDimensions(fakePngHeader(1080, 4700))).toEqual({ width: 1080, height: 4700 });
  });

  it("PNG 시그니처가 아니면 null", () => {
    const bytes = fakePngHeader(1080, 1350);
    bytes[0] = 0;
    expect(pngDimensions(bytes)).toBeNull();
  });

  it("IHDR이 아니면 null", () => {
    const bytes = fakePngHeader(1080, 1350);
    bytes[12] = 0;
    expect(pngDimensions(bytes)).toBeNull();
  });

  it("너무 짧으면 null", () => {
    expect(pngDimensions(new Uint8Array(10))).toBeNull();
  });

  it("폭·높이가 0이면 null", () => {
    expect(pngDimensions(fakePngHeader(0, 100))).toBeNull();
  });
});
