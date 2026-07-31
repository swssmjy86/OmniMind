// OG/공유 카드 렌더러(/api/card, opengraph-image)가 공유하는 폰트 로더.
// Google Fonts에서 카드에 실제 쓰이는 글자만 서브셋(ttf)으로 받아온다 — 무료.
//
// 외부 fetch 2회에 타임아웃을 건다: OG 이미지는 인증 없는 공개 엔드포인트라, 폰트
// 서버가 느려지면 timeout 없는 fetch가 edge 함수를 매달 수 있다. AbortController로
// 상한을 두고, 실패는 호출자가 잡아 폴백하도록 그대로 throw한다.
async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function loadNotoSerifKR(
  text: string,
  timeoutMs = 3000,
): Promise<ArrayBuffer> {
  const cssRes = await fetchWithTimeout(
    `https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@600&text=${encodeURIComponent(text)}`,
    timeoutMs,
  );
  const css = await cssRes.text();
  const m = /src: url\((.+?)\) format\('(?:opentype|truetype)'\)/.exec(css);
  if (!m) throw new Error("폰트 소스를 찾지 못했어요");
  const res = await fetchWithTimeout(m[1], timeoutMs);
  if (!res.ok) throw new Error(`폰트 다운로드 실패: ${res.status}`);
  return res.arrayBuffer();
}
