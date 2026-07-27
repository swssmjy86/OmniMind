// 페르소나 일러스트 경로 — 표현 계층 순수 상수(personas.ts와 같은 원칙: 계산에 무관).
//
// 파일은 `scripts/gen-persona-images.ts`가 `docs/png/<페르소나 이름>.png` 원본에서 만들어
// public/에 커밋한다. 원본 파일명이 곧 페르소나 매칭 키다(달지기.png → dalzigi).
//
//   avatar 192×192  카드·시트의 원형 아바타
//   full   768×1376 전신 세로컷(9:16) — 히어로·인트로 배경용(현 원본 크기 그대로)
//
// 아직 화면에 붙이지 않은 곳에서는 PERSONA_GLYPHS(이모지)가 그대로 폴백으로 남는다.

import type { PersonaId } from "./personas";

export interface PersonaImage {
  avatar: string;
  full: string;
  /** 배너 카드가 세로 전신컷을 가로 창으로 크롭할 때의 CSS object-position.
   *  일러스트마다 얼굴 높이가 다르다(상단 ~20% · 중단 ~50%) — 고정 크롭이면
   *  얼굴이 카드 밖으로 잘리는 페르소나가 생겨, 얼굴이 창 중앙에 오도록 개별 지정. */
  fullPosition: string;
}

export const PERSONA_IMAGES: Record<PersonaId, PersonaImage> = {
  dalzigi: { avatar: "/images/persona/dalzigi-avatar.webp", full: "/images/persona/dalzigi.webp", fullPosition: "50% 45%" },
  seoon: { avatar: "/images/persona/seoon-avatar.webp", full: "/images/persona/seoon.webp", fullPosition: "50% 45%" },
  byeori: { avatar: "/images/persona/byeori-avatar.webp", full: "/images/persona/byeori.webp", fullPosition: "50% 20%" },
  hongyeon: { avatar: "/images/persona/hongyeon-avatar.webp", full: "/images/persona/hongyeon.webp", fullPosition: "50% 40%" },
  yeonri: { avatar: "/images/persona/yeonri-avatar.webp", full: "/images/persona/yeonri.webp", fullPosition: "50% 50%" },
  onsae: { avatar: "/images/persona/onsae-avatar.webp", full: "/images/persona/onsae.webp", fullPosition: "50% 38%" },
  geumo: { avatar: "/images/persona/geumo-avatar.webp", full: "/images/persona/geumo.webp", fullPosition: "50% 20%" },
};
