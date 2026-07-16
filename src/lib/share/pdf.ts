// P4-보강 — 카드 PDF 저장 보조. PNG 바이트에서 폭·높이를 직접 읽어(IHDR 청크는 PNG 시그니처
// 8바이트 뒤 고정 오프셋) createImageBitmap 없이도 페이지 크기를 정확히 잡을 수 있게 한다.

export interface PngDimensions {
  width: number;
  height: number;
}

/** PNG 바이트 배열에서 IHDR 청크의 폭·높이를 읽는다. PNG가 아니면 null. */
export function pngDimensions(bytes: Uint8Array): PngDimensions | null {
  // 시그니처(8) + 길이(4) + "IHDR"(4) 뒤 폭(4)·높이(4) — 총 24바이트 필요.
  if (bytes.length < 24) return null;
  const SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < SIGNATURE.length; i++) {
    if (bytes[i] !== SIGNATURE[i]) return null;
  }
  const isIhdr = bytes[12] === 0x49 && bytes[13] === 0x48 && bytes[14] === 0x44 && bytes[15] === 0x52;
  if (!isIhdr) return null;

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getUint32(16, false);
  const height = view.getUint32(20, false);
  if (width <= 0 || height <= 0) return null;
  return { width, height };
}
