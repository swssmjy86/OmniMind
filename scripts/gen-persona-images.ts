// AUTO-GEN TOOL (빌드 타임 전용) — 페르소나 일러스트 webp 변환.
//
// 원본은 `docs/png/<페르소나 이름>.png`(768×1376, 장당 1.5~2.6MB)에 소스로 둔다.
// 모바일 웹에 원본을 그대로 내보낼 수 없어, 여기서 두 벌을 만들어 public/에 커밋한다.
//
//   public/images/persona/<id>.webp         전신 세로컷(9:16) — 히어로·인트로용
//   public/images/persona/<id>-avatar.webp  정사각 크롭 — 카드 원형 아바타용
//
// 아바타 크롭은 페르소나별 얼굴 좌표(FOCUS)를 눈으로 확인해 박아 둔다. 원본이 전신 세로컷
// 이고 인물이 놓인 위치가 제각각이라(금오·벼리는 상단, 연리·온새는 좌측), 중앙 크롭도
// sharp의 attention 전략도 얼굴을 놓친다 — 자동 판정에 맡기지 않는다.
// 원본 이미지를 교체하면 FOCUS도 함께 확인해야 한다.
//
// 출력물을 커밋하므로 런타임·빌드는 sharp에 의존하지 않는다(gen-solar-terms.ts와 같은 방식).
// sharp는 Next.js가 함께 들여오는 것을 그대로 쓴다 — 별도 의존성으로 선언하지 않는다.
//
// 실행: npx tsx scripts/gen-persona-images.ts
import { mkdirSync, existsSync } from "node:fs";
import sharp from "sharp";

/** 원본 파일명(페르소나 이름) → 코드상의 PersonaId. 파일명이 곧 매칭 키다. */
const NAME_TO_ID: Record<string, string> = {
  달지기: "dalzigi",
  서온: "seoon",
  벼리: "byeori",
  홍연: "hongyeon",
  연리: "yeonri",
  온새: "onsae",
  금오: "geumo",
};

/** 얼굴 중심 — 원본 크기 대비 비율(x, y). 렌더된 원본을 보고 눈으로 잡은 값. */
const FOCUS: Record<string, { x: number; y: number }> = {
  dalzigi: { x: 0.58, y: 0.465 },
  seoon: { x: 0.56, y: 0.45 },
  byeori: { x: 0.51, y: 0.255 },
  hongyeon: { x: 0.56, y: 0.43 },
  yeonri: { x: 0.35, y: 0.5 },
  onsae: { x: 0.38, y: 0.4 },
  geumo: { x: 0.5, y: 0.276 },
};

/** 아바타 크롭 한 변 — 원본 높이 대비. 머리+어깨가 들어오는 크기. */
const CROP_RATIO = 0.24;
/** 크롭 안에서 얼굴이 놓일 세로 위치 — 살짝 위쪽에 두어야 어깨가 함께 담긴다. */
const FACE_IN_CROP = 0.4;

const SRC_DIR = "docs/png";
const OUT_DIR = "public/images/persona";

/** 전신컷 폭 — 모바일 셸 폭(~430px)의 2배수(레티나)면 충분하다. */
const FULL_WIDTH = 864;
/** 아바타 한 변 — 카드 원형이 56px이라 레티나 3배수까지 여유. */
const AVATAR_SIZE = 192;

async function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  for (const [name, id] of Object.entries(NAME_TO_ID)) {
    const src = `${SRC_DIR}/${name}.png`;
    if (!existsSync(src)) throw new Error(`원본 없음: ${src}`);

    const full = await sharp(src)
      .resize({ width: FULL_WIDTH, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(`${OUT_DIR}/${id}.webp`);

    const { width = 0, height = 0 } = await sharp(src).metadata();
    const focus = FOCUS[id];
    if (!focus) throw new Error(`얼굴 좌표 없음: ${id}`);
    const side = Math.round(height * CROP_RATIO);
    // 크롭 사각형이 원본 밖으로 나가지 않도록 가장자리에서 잘라 붙인다.
    const clamp = (v: number, max: number) => Math.max(0, Math.min(v, max - side));
    const left = clamp(Math.round(focus.x * width - side / 2), width);
    const top = clamp(Math.round(focus.y * height - side * FACE_IN_CROP), height);

    const avatar = await sharp(src)
      .extract({ left, top, width: side, height: side })
      .resize(AVATAR_SIZE, AVATAR_SIZE)
      .webp({ quality: 85 })
      .toFile(`${OUT_DIR}/${id}-avatar.webp`);

    const kb = (n: number) => `${Math.round(n / 1024)}KB`;
    console.log(`${name} → ${id}: 전신 ${kb(full.size)} / 아바타 ${kb(avatar.size)}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
