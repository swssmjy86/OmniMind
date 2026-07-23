import { describe, expect, it } from "vitest";
import { checkTone, checkToneWarnings } from "../tone-guard";
import { VOICES } from "@/lib/persona/personas";
import { isBloodType, normalizeMbti, traitsText, type BloodType } from "./traits";

const MBTIS = (["E", "I"] as const).flatMap((ei) =>
  (["S", "N"] as const).flatMap((sn) =>
    (["T", "F"] as const).flatMap((tf) => (["J", "P"] as const).map((jp) => `${ei}${sn}${tf}${jp}`)),
  ),
);
const BLOODS: BloodType[] = ["A", "B", "O", "AB"];

describe("MBTI·혈액형 보조축 (2026-07-23 부분 복원)", () => {
  it("normalizeMbti — 16유형 전부 통과, 소문자 정규화, 형식 오류는 null", () => {
    for (const m of MBTIS) expect(normalizeMbti(m)).toBe(m);
    expect(normalizeMbti("enfp")).toBe("ENFP");
    expect(normalizeMbti(" istj ")).toBe("ISTJ");
    for (const bad of ["", "EN", "ENFPX", "ABCD", null, undefined]) {
      expect(normalizeMbti(bad)).toBeNull();
    }
  });

  it("isBloodType — 4유형만 참", () => {
    for (const b of BLOODS) expect(isBloodType(b)).toBe(true);
    expect(isBloodType("C")).toBe(false);
  });

  it("16 MBTI × 혈액형 4종 × 말투 4갈래 전부 문구 존재 + 톤 가드(경고 포함) 통과", () => {
    for (const v of VOICES) {
      for (const mbti of MBTIS) {
        for (const blood of BLOODS) {
          const t = traitsText({ mbti, blood }, v);
          expect(t).not.toBeNull();
          expect(checkTone(t!)).toEqual([]);
          expect(checkToneWarnings(t!)).toEqual([]);
        }
      }
    }
  });

  it("부분 입력 — 한쪽만 있으면 그 부분만, 둘 다 없거나 형식 오류면 null(풀이 생략 폴백)", () => {
    expect(traitsText({ mbti: "ENFP" })).toContain("생기를 얻는");
    expect(traitsText({ mbti: "ENFP" })).not.toContain("혈액형");
    expect(traitsText({ blood: "O" })).toContain("혈액형");
    expect(traitsText(null)).toBeNull();
    expect(traitsText({})).toBeNull();
    expect(traitsText({ mbti: "잘못된값" })).toBeNull();
  });

  it("말투 서명 — 반말에 요체 종결 없음, 하오체에 ~소/~오 종결, 지요체에 ~지요", () => {
    const t = (v: Parameters<typeof traitsText>[1]) => traitsText({ mbti: "ISTJ", blood: "AB" }, v)!;
    expect(t("banmal")).not.toMatch(/요[.!?]/);
    expect(t("hao")).not.toMatch(/요[.!?]/);
    expect(t("hao")).toMatch(/[오소]\./);
    expect(t("jiyo")).toMatch(/지요\./);
  });
});
