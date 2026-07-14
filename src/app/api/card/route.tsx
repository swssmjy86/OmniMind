// P4-1 공유 카드 이미지 — GET /api/card?dm=갑&el=목&mbti=ENFJ&zo=사자자리&blood=O
// 기본 9:16(1080×1920), ?ratio=1 → 1:1(1080×1080). 쿼리는 유형 조합만(생년월일시 금지).
import { ImageResponse } from "next/og";
import { parseCardParams, copyFromParams } from "@/lib/share/card-copy";

export const runtime = "edge";

// 브랜드 토큰(globals.css 라이트 팔레트) — OG 렌더러는 CSS 변수를 못 읽어 상수로 둔다.
const C = {
  base: "#f5efe6",
  surface: "#fdfbf7",
  coral: "#e8927c",
  green: "#2d5a4a",
  softText: "#8a8178",
};

/** Google Fonts에서 카드에 쓰일 글자만 서브셋으로 받아온다(무료, ttf). */
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

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const p = parseCardParams(searchParams);
  if (!p) return new Response("잘못된 카드 파라미터예요", { status: 400 });

  const square = searchParams.get("ratio") === "1";
  const width = 1080;
  const height = square ? 1080 : 1920;
  const c = copyFromParams(p);

  const fontText =
    c.line1 + c.line2 + c.hook + c.slogan + c.hanja + "나의 조합 보기 →OmniMind온전한";
  const serif = await loadNotoSerifKR(fontText);

  // 규격별 스케일 — 1:1은 세로 여백이 없어 전체적으로 조밀하게.
  const s = square
    ? { pad: 72, hanja: 420, hook: 34, line1: 72, line2: 44, cta: 34, slogan: 26 }
    : { pad: 96, hanja: 560, hook: 38, line1: 84, line2: 50, cta: 38, slogan: 30 };

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
          backgroundColor: C.base,
          padding: s.pad,
          fontFamily: "NotoSerifKR",
        }}
      >
        {/* 장식 심볼 — 일간 한자 워터마크 */}
        <div
          style={{
            position: "absolute",
            top: square ? -40 : 60,
            right: -20,
            fontSize: s.hanja,
            color: C.green,
            opacity: 0.07,
            lineHeight: 1,
          }}
        >
          {c.hanja}
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 30, letterSpacing: 6, color: C.softText }}>OmniMind</div>
          <div style={{ fontSize: 24, marginTop: 8, color: C.softText }}>온전한 나</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: s.hook, color: C.coral }}>{c.hook}</div>
          <div
            style={{
              fontSize: s.line1,
              marginTop: 24,
              color: C.green,
              lineHeight: 1.25,
              fontWeight: 600,
            }}
          >
            {c.line1}
          </div>
          <div
            style={{
              width: 120,
              height: 4,
              marginTop: 36,
              marginBottom: 36,
              backgroundColor: C.coral,
              opacity: 0.6,
            }}
          />
          <div style={{ fontSize: s.line2, color: C.softText }}>{c.line2}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <div
            style={{
              display: "flex",
              backgroundColor: C.coral,
              color: C.surface,
              fontSize: s.cta,
              padding: "20px 44px",
              borderRadius: 999,
            }}
          >
            나의 조합 보기 →
          </div>
          <div style={{ fontSize: s.slogan, marginTop: 28, color: C.softText }}>{c.slogan}</div>
        </div>
      </div>
    ),
    {
      width,
      height,
      fonts: [{ name: "NotoSerifKR", data: serif, weight: 600, style: "normal" }],
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    },
  );
}
