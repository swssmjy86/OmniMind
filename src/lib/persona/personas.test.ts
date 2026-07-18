import { describe, expect, it } from "vitest";
import { checkTone, checkToneWarnings } from "@/lib/interpret/tone-guard";
import { PERSONAS, PERSONA_LIST } from "./personas";

describe("페르소나 상수 (§2.3)", () => {
  it("4인이 정의되고 목록 순서는 달지기·서온·홍연·금오다", () => {
    expect(Object.keys(PERSONAS).sort()).toEqual(["dalzigi", "geumo", "hongyeon", "seoon"]);
    expect(PERSONA_LIST.map((p) => p.id)).toEqual(["dalzigi", "seoon", "hongyeon", "geumo"]);
  });

  it("모든 필드가 비어 있지 않고 id가 키와 일치한다", () => {
    for (const [key, p] of Object.entries(PERSONAS)) {
      expect(p.id).toBe(key);
      for (const field of [p.name, p.title, p.homeLine, p.greeting, p.toneInstruction]) {
        expect(field.trim().length).toBeGreaterThan(0);
      }
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
