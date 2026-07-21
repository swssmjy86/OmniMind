import { describe, expect, it } from "vitest";
import { branchStageOf } from "./branch-stage";
import { EARTHLY_BRANCHES } from "./constants";
import { MONTH_LAYERS } from "./sarang";

const idx = (b: string) => EARTHLY_BRANCHES.indexOf(b as (typeof EARTHLY_BRANCHES)[number]);

describe("branchStageOf — 사생지/사왕지/사고지 12지지 3분류", () => {
  it("생지(인신사해) 4개는 전부 생지", () => {
    for (const b of ["인", "신", "사", "해"]) expect(branchStageOf(idx(b))).toBe("생지");
  });

  it("왕지(자오묘유) 4개는 전부 왕지", () => {
    for (const b of ["자", "오", "묘", "유"]) expect(branchStageOf(idx(b))).toBe("왕지");
  });

  it("고지(진술축미) 4개는 전부 고지", () => {
    for (const b of ["진", "술", "축", "미"]) expect(branchStageOf(idx(b))).toBe("고지");
  });

  it("12지지 전부 분류되고, 4+4+4=12를 정확히 채운다", () => {
    const counts = { 생지: 0, 왕지: 0, 고지: 0 };
    for (let b = 0; b < 12; b++) counts[branchStageOf(b)] += 1;
    expect(counts).toEqual({ 생지: 4, 왕지: 4, 고지: 4 });
  });

  it("sarang.ts의 MONTH_LAYERS 층수(생지 3층·왕지 2~3층·고지 3층)와 분류 기준이 어긋나지 않는다", () => {
    // 생지·고지는 여기/중기/정기 3층, 왕지는 2층(오만 예외 3층) — branchStageOf 분류가
    // sarang.ts가 실제로 쓰는 LAYER_DAYS 키 그룹과 일치하는지 교차 검증한다.
    for (let b = 0; b < 12; b++) {
      const stage = branchStageOf(b);
      const layerCount = MONTH_LAYERS[b].length;
      if (stage === "생지") expect(layerCount).toBe(3);
      if (stage === "고지") expect(layerCount).toBe(3);
      if (stage === "왕지") expect([2, 3]).toContain(layerCount); // 오(午)만 3층 예외
    }
  });
});
