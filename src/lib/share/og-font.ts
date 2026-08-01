// OG/공유 카드 렌더러(/api/card, opengraph-image)가 공유하는 폰트 로더.
// Google Fonts에서 카드에 실제 쓰이는 글자만 서브셋(ttf)으로 받아온다 — 무료.
//
// 외부 fetch에 타임아웃을 건다: OG 이미지는 인증 없는 공개 엔드포인트라, 폰트 서버가
// 느려지면 edge 함수가 매달릴 수 있다. 타임아웃은 **헤더 도착뿐 아니라 body 읽기까지**
// 감싼다 — fetch()가 헤더만 받고 resolve한 뒤 body가 stall하면, 타이머를 그때 꺼 버리면
// .text()/.arrayBuffer()가 무한정 걸리기 때문. AbortController 신호를 body 읽기 동안
// 살려 두고, 작업 전체가 끝난 뒤에야 타이머를 정리한다. 실패는 호출자가 잡아 폴백한다.
async function withTimeout<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fn(ctrl.signal);
  } finally {
    clearTimeout(timer);
  }
}

export async function loadNotoSerifKR(
  text: string,
  timeoutMs = 3000,
): Promise<ArrayBuffer> {
  const css = await withTimeout(async (signal) => {
    const res = await fetch(
      `https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@600&text=${encodeURIComponent(text)}`,
      { signal },
    );
    return res.text(); // body 읽기도 같은 타임아웃 신호 아래에서
  }, timeoutMs);

  const m = /src: url\((.+?)\) format\('(?:opentype|truetype)'\)/.exec(css);
  if (!m) throw new Error("폰트 소스를 찾지 못했어요");

  return withTimeout(async (signal) => {
    const res = await fetch(m[1], { signal });
    if (!res.ok) throw new Error(`폰트 다운로드 실패: ${res.status}`);
    return res.arrayBuffer(); // body 읽기도 같은 타임아웃 신호 아래에서
  }, timeoutMs);
}
