"use server";

import { dayMasterOf } from "@/lib/engine/index";
import { computeDaily } from "@/lib/engine/daily";
import { assembleDaily } from "@/lib/interpret/content/daily";
import { toKstParts } from "@/lib/engine/kst";

/**
 * 비로그인 오늘의운세 개인화(스펙 §3) — localStorage에만 있는 태어난 날/시간을 클라이언트가
 * 이 서버 액션으로 넘겨, 엔진은 서버에만 두면서 개인화 한 줄만 돌려받는다. 헤드라인·마음가짐·
 * 색·키워드·행운은 날짜 공통값이라 이미 서버 컴포넌트가 내려준 것을 그대로 쓰고, 여기서는
 * `personal`(내 일간 기준 오늘의 관계) 한 줄만 계산한다. 시간을 모르면(빈 문자열) 일간만으로,
 * 알면(야자시 경계까지 반영해) 더 정확한 일주로 계산한다.
 */
export async function computeGuestDailyPersonal(
  birthDate: string,
  birthTime: string,
): Promise<string | null> {
  try {
    const timeUnknown = birthTime === "";
    const dm = dayMasterOf(birthDate, timeUnknown ? null : birthTime, timeUnknown);
    const t = toKstParts(new Date());
    const daily = computeDaily({ y: t.y, mo: t.mo, d: t.d }, dm.element, dm.stem);
    return assembleDaily(daily).personal;
  } catch {
    return null; // 형식이 어긋나도 무료 공통 화면은 그대로 유지
  }
}
