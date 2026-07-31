// 사이트 링크를 카카오톡·SNS에 공유했을 때 뜨는 기본 미리보기 카드.
// 상품별 공유 이미지(/api/card)와 별개로, "옴니마인드" 링크 자체의 대표 이미지다.
// 밤 네이비 + 달빛 골드 — 앱 기본 무드(다크)와 같은 톤으로 맞춘다.
import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "옴니마인드 — 모든 나를 잇다";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// 카드에 실제 쓰이는 글자만 서브셋으로 받아온다(무료, ttf).
async function loadNotoSerifKR(text: string): Promise<ArrayBuffer> {
  const css = await (
    await fetch(
      `https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@600&text=${encodeURIComponent(text)}`,
    )
  ).text();
  const m = /src: url\((.+?)\) format\('(?:opentype|truetype)'\)/.exec(css);
  if (!m) throw new Error("폰트 소스를 찾지 못했어요");
  const res = await fetch(m[1]);
  if (!res.ok) throw new Error(`폰트 다운로드 실패: ${res.status}`);
  return res.arrayBuffer();
}

export default async function OpengraphImage() {
  const base = "#0e1626"; // 밤 네이비
  const gold = "#f0c96a"; // 달빛 골드
  const text = "#f0ebe2";
  const soft = "#a8b0c0";
  const title = "모든 나를 잇다";
  const brand = "옴니마인드";
  const tagline = "사주 · 별자리 · MBTI · 혈액형, 흩어진 나의 조각을 하나로";
  const serif = await loadNotoSerifKR(brand + title + tagline + "OmniMind命");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          position: "relative",
          backgroundColor: base,
          padding: 80,
          fontFamily: "NotoSerifKR",
        }}
      >
        {/* 워터마크 한자 */}
        <div
          style={{
            position: "absolute",
            top: 20,
            right: -10,
            fontSize: 460,
            color: gold,
            opacity: 0.08,
            lineHeight: 1,
          }}
        >
          命
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 30, letterSpacing: 8, color: soft }}>OmniMind</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 96, color: gold, fontWeight: 600, lineHeight: 1.2 }}>
            {title}
          </div>
          <div
            style={{
              width: 140,
              height: 5,
              marginTop: 32,
              marginBottom: 32,
              backgroundColor: "#e8927c",
              opacity: 0.7,
            }}
          />
          <div style={{ fontSize: 34, color: text, lineHeight: 1.5 }}>{tagline}</div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ fontSize: 40, color: text, fontWeight: 600 }}>{brand}</div>
          <div style={{ fontSize: 26, color: soft }}>나보다 나를 더 잘 아는</div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "NotoSerifKR", data: serif, weight: 600, style: "normal" }],
    },
  );
}
