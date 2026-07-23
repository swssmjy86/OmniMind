import { describe, expect, it } from "vitest";
import { checkTone, checkToneWarnings } from "@/lib/interpret/tone-guard";
import { PERSONAS, PERSONA_LIST } from "./personas";

describe("페르소나 상수 (§2.3)", () => {
  it("7인이 정의되고 목록 순서는 달지기·서온·벼리·홍연·연리·온새·금오다", () => {
    expect(Object.keys(PERSONAS).sort()).toEqual([
      "byeori", "dalzigi", "geumo", "hongyeon", "onsae", "seoon", "yeonri",
    ]);
    expect(PERSONA_LIST.map((p) => p.id)).toEqual([
      "dalzigi", "seoon", "byeori", "hongyeon", "yeonri", "onsae", "geumo",
    ]);
  });

  it("모든 필드가 비어 있지 않고 id가 키와 일치한다", () => {
    for (const [key, p] of Object.entries(PERSONAS)) {
      expect(p.id).toBe(key);
      for (const field of [p.name, p.title, p.homeLine, p.greeting, p.toneInstruction]) {
        expect(field.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("어미 갈래(voice) — 홍연=반말, 금오=하오체, 온새=지요체, 나머지=요체", () => {
    expect(PERSONAS.hongyeon.voice).toBe("banmal");
    expect(PERSONAS.geumo.voice).toBe("hao");
    expect(PERSONAS.onsae.voice).toBe("jiyo");
    for (const id of ["dalzigi", "seoon", "byeori", "yeonri"] as const) {
      expect(PERSONAS[id].voice).toBe("yo");
    }
  });

  it("사용자 대면 대사(homeLine·greeting)가 톤 가드를 통과한다 (§11 톤 가드)", () => {
    for (const p of PERSONA_LIST) {
      for (const line of [p.homeLine, p.greeting]) {
        expect(checkTone(line)).toEqual([]);
        expect(checkToneWarnings(line)).toEqual([]);
      }
    }
  });
});
