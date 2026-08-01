import type { Metadata } from "next";
import MeView from "@/components/profile/MeView";

export const metadata: Metadata = {
  title: "나의 조각 — 옴니마인드",
  description: "사주·별자리·MBTI·혈액형을 하나로 이은, 온전한 나의 프로필.",
};

export default function MePage() {
  return <MeView />;
}
