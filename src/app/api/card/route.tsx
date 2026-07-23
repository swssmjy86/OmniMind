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

// 다크 팔레트(globals.css --dark-*) — 오늘의 나 카드는 오늘의운세 화면(다크 기본)과 같은
// 밤 네이비 + 달빛 골드로 렌더링해 화면과 카드가 한 장처럼 보이게 한다.
const D: typeof C = {
  base: "#0e1626",
  surface: "#1a2740",
  coral: "#e8927c",
  green: "#f0c96a", // 다크에서 primary는 달빛 골드
  text: "#f0ebe2",
  softText: "#a8b0c0",
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
  square, hanjaSize, hanja, eyebrow, children, colors = C,
}: {
  square: boolean;
  hanjaSize: number;
  hanja: string;
  eyebrow: string;
  children: React.ReactNode;
  colors?: typeof C;
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
        backgroundColor: colors.base,
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
          color: colors.green,
          opacity: 0.07,
          lineHeight: 1,
        }}
      >
        {hanja}
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 30, letterSpacing: 6, color: colors.softText }}>OmniMind</div>
        <div style={{ fontSize: 24, marginTop: 8, color: colors.softText }}>{eyebrow}</div>
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

/**
 * 오늘의 나 카드 — 오늘의운세 화면(다크 기본)과 같은 내용·같은 순서·같은 형식으로 렌더링한다:
 * 🏮 달지기 헤더 → 골드 헤드라인 → 마음가짐 → 개인화 박스 → 띠 박스 → LLM 박스 → 칩 →
 * 행운 포인트 → 오늘의 하늘 박스(3줄). §동기화 원칙 — 화면과 카드가 한 장처럼 보여야 한다.
 */
function renderDaily(searchParams: URLSearchParams, square: boolean) {
  const p = parseDailyCardParams(searchParams);
  if (!p) return null;
  const d = dailyCopyFromParams(p);
  const fontText =
    d.headline + d.mind + (d.personal ?? "") + d.color + d.keyword + d.lucky + (d.sky ?? "") +
    (d.zodiac ?? "") + (d.llm ?? "") + d.cta + d.slogan + d.hanja +
    "OmniMind🏮 달지기 · 오늘의운세오늘의 색 · 🍀 행운 포인트 — 🌙 ☀️ 🌿 ";

  const s = square
    ? { hanja: 420, headline: 40, mind: 26, box: 24, chip: 20, lucky: 22, sky: 20, cta: 28, slogan: 20 }
    : { hanja: 560, headline: 46, mind: 32, box: 28, chip: 24, lucky: 26, sky: 22, cta: 32, slogan: 24 };

  // 띠 박스는 화면처럼 "N띠인 당신에게 — " 접두를 흐리게, 본문은 밝게 나눠 그린다.
  const zodiacCut = d.zodiac ? d.zodiac.indexOf(" — ") : -1;
  const zodiacPrefix = zodiacCut >= 0 ? d.zodiac!.slice(0, zodiacCut + 3) : null;
  const zodiacRest = zodiacCut >= 0 ? d.zodiac!.slice(zodiacCut + 3) : d.zodiac;
  // 옛 공유 링크의 sky는 "\n" 없는 한 줄 — 그대로 한 줄 박스로 렌더된다.
  const skyLines = (d.sky ?? "").split("\n").filter(Boolean);
  const skyIcon = ["🌙 ", "☀️ ", ""];

  const boxStyle = {
    display: "flex" as const,
    marginTop: 24,
    padding: 26,
    borderRadius: 20,
    backgroundColor: D.surface,
    fontSize: s.box,
    color: D.text,
    lineHeight: 1.6,
  };

  const node = (
    <CardFrame square={square} hanjaSize={s.hanja} hanja={d.hanja} eyebrow="🏮 달지기 · 오늘의운세" colors={D}>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            fontSize: s.headline,
            color: D.green,
            lineHeight: 1.35,
            fontWeight: 600,
          }}
        >
          {d.headline}
        </div>
        <div style={{ fontSize: s.mind, marginTop: 24, color: D.text, lineHeight: 1.6 }}>{d.mind}</div>

        {d.personal && <div style={boxStyle}>{d.personal}</div>}

        {d.zodiac && (
          <div style={{ ...boxStyle, flexDirection: "column" as const }}>
            {/* OG 렌더러(satori)는 인라인 혼합 색을 지원하지 않아, 화면의 흐린 접두를 윗줄로 쌓는다 */}
            {zodiacPrefix && <div style={{ display: "flex", color: D.softText }}>{zodiacPrefix}</div>}
            <div style={{ display: "flex" }}>{zodiacRest}</div>
          </div>
        )}

        {d.llm && (
          <div style={{ ...boxStyle, border: "2px solid rgba(240, 201, 106, 0.2)" }}>
            🌿 {d.llm}
          </div>
        )}

        <div style={{ display: "flex", marginTop: 28, gap: 12 }}>
          <div
            style={{
              display: "flex",
              backgroundColor: D.surface,
              color: D.softText,
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
              backgroundColor: D.surface,
              color: D.softText,
              fontSize: s.chip,
              padding: "12px 22px",
              borderRadius: 999,
            }}
          >
            {d.keyword}
          </div>
        </div>
        <div style={{ display: "flex", fontSize: s.lucky, marginTop: 20, color: D.softText }}>
          🍀 행운 포인트 — {d.lucky}
        </div>

        {skyLines.length > 0 && (
          <div style={{ ...boxStyle, flexDirection: "column" as const, fontSize: s.sky, color: D.softText }}>
            {skyLines.map((line, i) => (
              <div key={i} style={{ display: "flex", marginTop: i === 0 ? 0 : 8 }}>
                {skyIcon[i] ?? ""}{line}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", marginTop: 40 }}>
        <div
          style={{
            display: "flex",
            backgroundColor: D.coral,
            color: D.base,
            fontSize: s.cta,
            padding: "18px 40px",
            borderRadius: 999,
          }}
        >
          {d.cta}
        </div>
        <div style={{ fontSize: s.slogan, marginTop: 24, color: D.softText }}>{d.slogan}</div>
      </div>
    </CardFrame>
  );

  // 세로 카드 높이는 콘텐츠 분량으로 추정한다 — 박스(개인화·띠·LLM·하늘)까지 다 실리면
  // 4:5 고정 캔버스로는 아래가 잘리기 때문. 문구가 짧은 날은 최소 1350(4:5)을 유지한다.
  const pad = 96;
  const boxWidth = 1080 - pad * 2;
  let h = pad * 2 + 30 + 8 + 24; // 상하 패딩 + 워드마크 + eyebrow
  h += 24 + estimateLines(d.headline, s.headline, boxWidth) * s.headline * 1.35;
  h += 24 + estimateLines(d.mind, s.mind, boxWidth) * s.mind * 1.6;
  for (const boxText of [d.personal, d.zodiac, d.llm]) {
    if (boxText) h += 24 + 52 + estimateLines(boxText, s.box, boxWidth - 52) * s.box * 1.6;
  }
  h += 28 + 24 + s.chip * 1.4; // 칩 줄
  h += 20 + estimateLines(d.lucky, s.lucky, boxWidth) * s.lucky * 1.6;
  if (skyLines.length) {
    h += 24 + 52 + skyLines.reduce((a, l) => a + estimateLines(l, s.sky, boxWidth - 52) * s.sky * 1.7 + 8, 0);
  }
  h += 40 + 36 + s.cta * 1.4 + 24 + s.slogan * 1.4; // CTA 버튼 + 슬로건

  return { node, fontText, height: square ? 1080 : Math.min(2400, Math.max(1350, Math.round(h))) };
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
