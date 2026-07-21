// P4-1 공유 카드 이미지 — GET /api/card?dm=갑&el=목&zo=사자자리&strength=신강&category=재성 (유형 조합 티저)
// 또는 GET /api/card?mode=daily&dm=갑&el=목&headline=…&mind=…&color=…&keyword=…&lucky=…&sky=…&llm=… (오늘의 나, 전체 문구)
// 또는 GET /api/card?mode=profile&dm=갑&el=목&nickname=…&sections=[…] (나의 조각, 프로필 전체 섹션)
// 너비는 항상 1080, 높이는 모드별 콘텐츠 분량에 맞춘다(각 render* 함수가 함께 정한다).
// ?ratio=1은 정방형(1080×1080)을 강제 — 단 mode=profile은 섹션 전체를 담아야 해 항상
// 세로 긴 카드로만 렌더링하고 ratio 파라미터를 무시한다. 쿼리는 생년월일시를 절대 담지 않는다.
import { ImageResponse } from "next/og";
import {
  parseCardParams, copyFromParams,
  parseDailyCardParams, dailyCopyFromParams,
  parseProfileCardParams, profileCopyFromParams,
} from "@/lib/share/card-copy";

export const runtime = "edge";

// 브랜드 토큰(globals.css 라이트 팔레트) — OG 렌더러는 CSS 변수를 못 읽어 상수로 둔다.
const C = {
  base: "#f5efe6",
  surface: "#fdfbf7",
  coral: "#e8927c",
  green: "#2d5a4a",
  text: "#3e3a36",
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

function CardFrame({
  square, hanjaSize, hanja, eyebrow, children,
}: {
  square: boolean;
  hanjaSize: number;
  hanja: string;
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        position: "relative",
        backgroundColor: C.base,
        padding: square ? 72 : 96,
        fontFamily: "NotoSerifKR",
      }}
    >
      {/* 장식 심볼 — 일간 한자 워터마크 */}
      <div
        style={{
          position: "absolute",
          top: square ? -40 : 60,
          right: -20,
          fontSize: hanjaSize,
          color: C.green,
          opacity: 0.07,
          lineHeight: 1,
        }}
      >
        {hanja}
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 30, letterSpacing: 6, color: C.softText }}>OmniMind</div>
        <div style={{ fontSize: 24, marginTop: 8, color: C.softText }}>{eyebrow}</div>
      </div>

      {children}
    </div>
  );
}

function renderTeaser(searchParams: URLSearchParams, square: boolean) {
  const p = parseCardParams(searchParams);
  if (!p) return null;
  const c = copyFromParams(p);
  const fontText =
    c.line1 + c.line2 + c.hook + c.slogan + c.hanja + "나의 조합 보기 →OmniMind온전한";

  // 규격별 스케일 — 1:1은 세로 여백이 없어 전체적으로 조밀하게.
  const s = square
    ? { hanja: 420, hook: 34, line1: 72, line2: 44, cta: 34, slogan: 26 }
    : { hanja: 560, hook: 38, line1: 84, line2: 50, cta: 38, slogan: 30 };

  const node = (
    <CardFrame square={square} hanjaSize={s.hanja} hanja={c.hanja} eyebrow="온전한 나">
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
    </CardFrame>
  );

  return { node, fontText, height: square ? 1080 : 1920 };
}

function renderDaily(searchParams: URLSearchParams, square: boolean) {
  const p = parseDailyCardParams(searchParams);
  if (!p) return null;
  const d = dailyCopyFromParams(p);
  const fontText =
    d.headline + d.mind + (d.personal ?? "") + d.color + d.keyword + d.lucky + (d.sky ?? "") +
    (d.zodiac ?? "") + (d.llm ?? "") + d.cta + d.slogan + d.hanja +
    "OmniMind오늘의 나오늘의 색 · 🍀 행운 포인트 — 🌿 ";

  const s = square
    ? { hanja: 420, headline: 40, mind: 26, personal: 24, chip: 20, lucky: 22, sky: 20, zodiac: 20, llm: 24, cta: 28, slogan: 20 }
    : { hanja: 560, headline: 46, mind: 32, personal: 28, chip: 24, lucky: 26, sky: 22, zodiac: 22, llm: 28, cta: 32, slogan: 24 };

  const node = (
    <CardFrame square={square} hanjaSize={s.hanja} hanja={d.hanja} eyebrow="오늘의 나">
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            fontSize: s.headline,
            color: C.green,
            lineHeight: 1.35,
            fontWeight: 600,
          }}
        >
          {d.headline}
        </div>
        <div
          style={{
            width: 120,
            height: 4,
            marginTop: 28,
            marginBottom: 28,
            backgroundColor: C.coral,
            opacity: 0.6,
          }}
        />
        <div style={{ fontSize: s.mind, color: C.text, lineHeight: 1.6 }}>{d.mind}</div>

        {d.personal && (
          <div
            style={{
              display: "flex",
              marginTop: 24,
              padding: 26,
              borderRadius: 20,
              backgroundColor: C.surface,
              fontSize: s.personal,
              color: C.text,
              lineHeight: 1.6,
            }}
          >
            {d.personal}
          </div>
        )}

        <div style={{ display: "flex", marginTop: 28, gap: 12 }}>
          <div
            style={{
              display: "flex",
              backgroundColor: C.surface,
              color: C.softText,
              fontSize: s.chip,
              padding: "12px 22px",
              borderRadius: 999,
            }}
          >
            오늘의 색 · {d.color}
          </div>
          <div
            style={{
              display: "flex",
              backgroundColor: C.surface,
              color: C.softText,
              fontSize: s.chip,
              padding: "12px 22px",
              borderRadius: 999,
            }}
          >
            {d.keyword}
          </div>
        </div>
        <div style={{ display: "flex", fontSize: s.lucky, marginTop: 20, color: C.softText }}>
          🍀 행운 포인트 — {d.lucky}
        </div>
        {d.sky && (
          <div style={{ display: "flex", fontSize: s.sky, marginTop: 12, color: C.softText }}>
            🌙 {d.sky}
          </div>
        )}
        {d.zodiac && (
          <div style={{ display: "flex", fontSize: s.zodiac, marginTop: 12, color: C.softText }}>
            🐾 {d.zodiac}
          </div>
        )}
        {d.llm && (
          <div
            style={{
              display: "flex",
              marginTop: 24,
              padding: 26,
              borderRadius: 20,
              border: "2px solid rgba(45, 90, 74, 0.2)",
              backgroundColor: C.surface,
              fontSize: s.llm,
              color: C.text,
              lineHeight: 1.6,
            }}
          >
            🌿 {d.llm}
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
        <div
          style={{
            display: "flex",
            backgroundColor: C.coral,
            color: C.surface,
            fontSize: s.cta,
            padding: "18px 40px",
            borderRadius: 999,
          }}
        >
          {d.cta}
        </div>
        <div style={{ fontSize: s.slogan, marginTop: 24, color: C.softText }}>{d.slogan}</div>
      </div>
    </CardFrame>
  );

  // 문구가 짧아 1080×1920(스토리) 캔버스를 쓰면 아래쪽이 크게 비므로, 더 낮은 4:5 캔버스를 쓴다.
  return { node, fontText, height: square ? 1080 : 1350 };
}

// 한 줄에 들어가는 글자 수를 살짝 보수적으로(넓게) 잡아 줄 수를 과소평가하지 않는다 —
// 텍스트가 캔버스 밖으로 잘리는 쪽보다 아래쪽 여백이 조금 느는 쪽이 낫다.
function estimateLines(text: string, fontSize: number, boxWidth: number): number {
  const charsPerLine = Math.max(1, Math.floor(boxWidth / (fontSize * 1.05)));
  return Math.max(1, Math.ceil(text.length / charsPerLine));
}

function estimateProfileHeight(nickname: string, sections: { title: string; body: string }[]): number {
  const pad = 96;
  const boxWidth = 1080 - pad * 2;
  let h = pad * 2; // 상하 패딩
  h += 30 + 8 + 24 + 24; // OmniMind 워드마크 + eyebrow + 제목 앞 여백
  h += estimateLines(`${nickname}님의 이야기`, 44, boxWidth) * 44 * 1.3;
  h += 28 * 2 + 4; // 구분선 블록(margin 28+28 + height 4)
  for (const s of sections) {
    h += 28 * 1.3 + 8; // 섹션 제목 한 줄 + 제목-본문 간격
    h += estimateLines(s.body, 24, boxWidth) * 24 * 1.6;
    h += 32; // 다음 섹션과의 간격
  }
  h += 40 + 32 * 1.4 + 24 + 24 * 1.4; // 하단 CTA 버튼 + 슬로건
  // 상한은 parseProfileCardParams가 허용하는 최댓값(PROFILE_MAX_SECTIONS=10 ×
  // sectionBody 260자, nickname 20자)에서 이 공식이 계산하는 최대치(~4431px)보다
  // 커야 한다 — 그보다 낮으면 유효하게 통과된 입력도 캔버스 아래쪽이 잘린다.
  return Math.min(4700, Math.max(1400, Math.round(h)));
}

function renderProfile(searchParams: URLSearchParams) {
  const p = parseProfileCardParams(searchParams);
  if (!p) return null;
  const c = profileCopyFromParams(p);
  const fontText =
    c.nickname + c.cta + c.slogan + c.hanja +
    c.sections.flatMap((s) => [s.title, s.body]).join("") +
    "OmniMind나의 조각님의 이야기";

  const height = estimateProfileHeight(c.nickname, c.sections);

  const node = (
    <CardFrame square={false} hanjaSize={560} hanja={c.hanja} eyebrow="나의 조각">
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex", fontSize: 44, marginTop: 24, color: C.green, lineHeight: 1.3, fontWeight: 600,
          }}
        >
          {c.nickname}님의 이야기
        </div>
        <div
          style={{
            width: 120,
            height: 4,
            marginTop: 28,
            marginBottom: 28,
            backgroundColor: C.coral,
            opacity: 0.6,
          }}
        />
        {c.sections.map((s, i) => (
          <div
            key={i}
            style={{ display: "flex", flexDirection: "column", marginBottom: 32 }}
          >
            <div style={{ fontSize: 28, color: C.green, fontWeight: 600 }}>{s.title}</div>
            <div style={{ marginTop: 8, fontSize: 24, color: C.text, lineHeight: 1.6 }}>{s.body}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", marginTop: 40 }}>
        <div
          style={{
            display: "flex",
            backgroundColor: C.coral,
            color: C.surface,
            fontSize: 32,
            padding: "18px 40px",
            borderRadius: 999,
          }}
        >
          {c.cta}
        </div>
        <div style={{ fontSize: 24, marginTop: 24, color: C.softText }}>{c.slogan}</div>
      </div>
    </CardFrame>
  );

  return { node, fontText, height };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const square = searchParams.get("ratio") === "1";
  const mode = searchParams.get("mode");

  // 각 render* 함수가 자신의 콘텐츠 분량에 맞는 height까지 함께 정해 돌려준다 —
  // 모드가 늘어나도 GET에서 캔버스 크기 분기를 따로 유지할 필요가 없다.
  const rendered =
    mode === "daily" ? renderDaily(searchParams, square) :
    mode === "profile" ? renderProfile(searchParams) :
    renderTeaser(searchParams, square);
  if (!rendered) return new Response("잘못된 카드 파라미터예요", { status: 400 });

  const serif = await loadNotoSerifKR(rendered.fontText);

  return new ImageResponse(rendered.node, {
    width: 1080,
    height: rendered.height,
    fonts: [{ name: "NotoSerifKR", data: serif, weight: 600, style: "normal" }],
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
