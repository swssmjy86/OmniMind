import type { Metadata } from "next";
import MindGate from "@/components/chat/MindGate";

export const metadata: Metadata = {
  title: "마음 챗 — 옴니마인드",
  description: "나의 사주·성향을 기억한 채 곁에서 이야기를 들어주는 대화 동반자.",
};

export default function MindPage() {
  return <MindGate />;
}
