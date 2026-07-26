// 페르소나 일러스트 경로 — 표현 계층 순수 상수(personas.ts와 같은 원칙: 계산에 무관).
//
// 파일은 `scripts/gen-persona-images.ts`가 `docs/png/<페르소나 이름>.png` 원본에서 만들어
// public/에 커밋한다. 원본 파일명이 곧 페르소나 매칭 키다(달지기.png → dalzigi).
//
//   avatar 192×192  카드·시트의 원형 아바타
//   full   864×1548 전신 세로컷(9:16) — 히어로·인트로 배경용
//
// 아직 화면에 붙이지 않은 곳에서는 PERSONA_GLYPHS(이모지)가 그대로 폴백으로 남는다.

import type { PersonaId } from "./personas";

export interface PersonaImage {
  avatar: string;
  full: string;
}

export const PERSONA_IMAGES: Record<PersonaId, PersonaImage> = {
  dalzigi: { avatar: "/images/persona/dalzigi-avatar.webp", full: "/images/persona/dalzigi.webp" },
  seoon: { avatar: "/images/persona/seoon-avatar.webp", full: "/images/persona/seoon.webp" },
  byeori: { avatar: "/images/persona/byeori-avatar.webp", full: "/images/persona/byeori.webp" },
  hongyeon: { avatar: "/images/persona/hongyeon-avatar.webp", full: "/images/persona/hongyeon.webp" },
  yeonri: { avatar: "/images/persona/yeonri-avatar.webp", full: "/images/persona/yeonri.webp" },
  onsae: { avatar: "/images/persona/onsae-avatar.webp", full: "/images/persona/onsae.webp" },
  geumo: { avatar: "/images/persona/geumo-avatar.webp", full: "/images/persona/geumo.webp" },
};
