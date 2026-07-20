import { describe, expect, it } from "vitest";
import { sarangOf } from "./sarang";
import { termInstant } from "./solar-terms";
import { HEAVENLY_STEMS } from "./constants";

const DAY_MS = 86_400_000;
// 절입 시각 + n일 + 반나절(정오 부근) — 경계값(정확히 n*24h)에서의 부동소수 흔들림을 피한다.
const afterDays = (base: Date, n: number) => new Date(base.getTime() + n * DAY_MS + 12 * 3600_000);

describe("sarangOf — 월률분야(생지/왕지/고지 3유형)", () => {
  it("인월(생지, 무7·병7·갑16) — 여기→중기→정기 순서대로 사령이 바뀐다", () => {
    const ipchun = termInstant(2024, 2); // 입춘 = 인월 절입
    expect(HEAVENLY_STEMS[sarangOf(afterDays(ipchun, 2), 2).stem]).toBe("무"); // 여기(0~7일)
    expect(HEAVENLY_STEMS[sarangOf(afterDays(ipchun, 8), 2).stem]).toBe("병"); // 중기(7~14일)
    expect(HEAVENLY_STEMS[sarangOf(afterDays(ipchun, 20), 2).stem]).toBe("갑"); // 정기(14일~)
  });

  it("해월(생지, 무7·갑7·임16)", () => {
    const ipdong = termInstant(2024, 20); // 입동 = 해월 절입
    expect(HEAVENLY_STEMS[sarangOf(afterDays(ipdong, 3), 11).stem]).toBe("무");
    expect(HEAVENLY_STEMS[sarangOf(afterDays(ipdong, 10), 11).stem]).toBe("갑");
    expect(HEAVENLY_STEMS[sarangOf(afterDays(ipdong, 25), 11).stem]).toBe("임");
  });

  it("자월(왕지, 중기 없음, 임10·계20)", () => {
    const daeseol = termInstant(2024, 22); // 대설 = 자월 절입
    expect(HEAVENLY_STEMS[sarangOf(afterDays(daeseol, 5), 0).stem]).toBe("임"); // 여기(0~10일)
    expect(HEAVENLY_STEMS[sarangOf(afterDays(daeseol, 15), 0).stem]).toBe("계"); // 정기(10일~)
  });

  it("묘월(왕지, 갑10·을20)", () => {
    const gyeongchip = termInstant(2024, 4); // 경칩 = 묘월 절입
    expect(HEAVENLY_STEMS[sarangOf(afterDays(gyeongchip, 3), 3).stem]).toBe("갑");
    expect(HEAVENLY_STEMS[sarangOf(afterDays(gyeongchip, 15), 3).stem]).toBe("을");
  });

  it("오월(왕지 특례 3층, 병10·기9·정11)", () => {
    const mangjong = termInstant(2024, 10); // 망종 = 오월 절입
    expect(HEAVENLY_STEMS[sarangOf(afterDays(mangjong, 5), 6).stem]).toBe("병"); // 여기(0~10)
    expect(HEAVENLY_STEMS[sarangOf(afterDays(mangjong, 15), 6).stem]).toBe("기"); // 중기(10~19)
    expect(HEAVENLY_STEMS[sarangOf(afterDays(mangjong, 25), 6).stem]).toBe("정"); // 정기(19~)
  });

  it("진월(고지, 을9·계3·무18)", () => {
    const cheongmyeong = termInstant(2024, 6); // 청명 = 진월 절입
    expect(HEAVENLY_STEMS[sarangOf(afterDays(cheongmyeong, 3), 4).stem]).toBe("을"); // 여기(0~9)
    expect(HEAVENLY_STEMS[sarangOf(afterDays(cheongmyeong, 10), 4).stem]).toBe("계"); // 중기(9~12)
    expect(HEAVENLY_STEMS[sarangOf(afterDays(cheongmyeong, 20), 4).stem]).toBe("무"); // 정기(12~)
  });

  it("축월(고지, 계9·신3·기18)", () => {
    const sohan = termInstant(2024, 0); // 소한 = 축월 절입
    expect(HEAVENLY_STEMS[sarangOf(afterDays(sohan, 3), 1).stem]).toBe("계");
    expect(HEAVENLY_STEMS[sarangOf(afterDays(sohan, 10), 1).stem]).toBe("신");
    expect(HEAVENLY_STEMS[sarangOf(afterDays(sohan, 20), 1).stem]).toBe("기");
  });

  it("정기는 절입 직후(짧은 절기 등)에도 남은 기간 전부를 흡수해 always 반환된다", () => {
    const ipchun = termInstant(2024, 2);
    // 표의 합(30일)을 넘겨도(실제 절기 간격 29~31일 오차) 예외 없이 정기를 반환
    expect(() => sarangOf(afterDays(ipchun, 29), 2)).not.toThrow();
    expect(sarangOf(afterDays(ipchun, 29), 2).layer).toBe("정기");
  });

  it("결정론 — 같은 instant·월지는 항상 같은 결과", () => {
    const ipchun = termInstant(2024, 2);
    const t = afterDays(ipchun, 10);
    expect(sarangOf(t, 2)).toEqual(sarangOf(t, 2));
  });
});
