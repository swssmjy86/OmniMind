import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { PERSONAS, type PersonaId } from "./personas";
import { PERSONA_IMAGES } from "./images";

const IDS = Object.keys(PERSONAS) as PersonaId[];

describe("페르소나 일러스트 매칭", () => {
  it("7인 전원에게 아바타·전신컷이 있다", () => {
    expect(Object.keys(PERSONA_IMAGES).sort()).toEqual([...IDS].sort());
  });

  // 경로만 맞고 파일이 없으면 화면에서 조용히 깨진다 — 실제 파일 존재까지 본다.
  it("가리키는 파일이 public/에 실제로 있다", () => {
    for (const id of IDS) {
      const { avatar, full } = PERSONA_IMAGES[id];
      expect(existsSync(`public${avatar}`), `${id} 아바타(${avatar})`).toBe(true);
      expect(existsSync(`public${full}`), `${id} 전신컷(${full})`).toBe(true);
    }
  });

  it("페르소나마다 서로 다른 파일을 가리킨다", () => {
    const paths = IDS.flatMap((id) => [PERSONA_IMAGES[id].avatar, PERSONA_IMAGES[id].full]);
    expect(new Set(paths).size).toBe(paths.length);
  });
});
