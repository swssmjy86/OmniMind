import { redirect } from "next/navigation";

// 년도 단독 흐름은 4탭 IA의 오늘의운세 탭으로 대체됐다(스펙 §3). 링크 호환용 리다이렉트.
export default function DailyRedirect() {
  redirect("/today");
}
