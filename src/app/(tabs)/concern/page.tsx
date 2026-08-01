import type { Metadata } from "next";
import ConcernGate from "@/components/concern/ConcernGate";

export const metadata: Metadata = {
  title: "고민 상담 — 옴니마인드",
  description: "이직·이별·선택 앞에서 — 성향과 운의 흐름을 함께 짚어 조언을 건네요.",
};

export default function ConcernPage() {
  return <ConcernGate />;
}
