"use client";

import { useState } from "react";
import { recordClientEvent } from "@/lib/metrics/actions";
import { pngDimensions } from "@/lib/share/pdf";

interface Props {
  query: string; // /api/card 쿼리 문자열 (유형 조합만, 개인정보 없음)
  via: "profile" | "daily"; // 유입 추적용 진입점
  label: string; // "나의 조각 카드" | "오늘의 나 카드"
}

/** 공유 시트 — 카드 미리보기 + 이미지 저장 / 공유(모바일 시트) / 링크 복사. */
export default function ShareSheet({ query, via, label }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pdfPending, setPdfPending] = useState(false);
  const [pdfError, setPdfError] = useState(false);

  const cardSrc = `/api/card?${query}`;
  const shareUrl = () => `${window.location.origin}/?ref=card&via=${via}`;

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    void recordClientEvent("card_copy_link", { via });
  }

  async function share() {
    try {
      if (navigator.share) {
        // 이미지 파일 공유가 되는 환경(모바일)이면 카드째로, 아니면 링크만
        try {
          const blob = await (await fetch(cardSrc)).blob();
          const file = new File([blob], "omnimind-card.png", { type: "image/png" });
          if (navigator.canShare?.({ files: [file] })) {
            await navigator.share({ files: [file], text: "나의 조합이 궁금하다면", url: shareUrl() });
            void recordClientEvent("card_share", { via, kind: "image" });
            return;
          }
        } catch {
          // 파일 공유 실패 → 링크 공유로
        }
        await navigator.share({ url: shareUrl() });
        void recordClientEvent("card_share", { via, kind: "link" });
        return;
      }
      await copyLink();
    } catch {
      // 사용자가 공유를 닫아도 조용히
    }
  }

  function openSheet() {
    setOpen(true);
    setPdfError(false); // 이전에 실패했던 흔적을 새로 열 때는 지운다
    void recordClientEvent("card_open", { via });
  }

  /** 카드 PNG를 그대로 한 장짜리 PDF로 감싸 저장. 페이지 크기를 이미지 픽셀 크기에 맞춰
   * "나의 조각"처럼 세로로 긴 카드도 잘리지 않는다. PNG 바이트에서 폭·높이를 직접 읽어
   * createImageBitmap/FileReader 없이 한 번의 fetch로 끝낸다(구형 브라우저 호환성도 좋아짐).
   * jsPDF는 클릭 시에만 동적 로드(초기 번들 영향 없음) — 클라이언트 처리라 서버 비용도 없다. */
  async function downloadPdf() {
    if (pdfPending) return;
    setPdfPending(true);
    setPdfError(false);
    try {
      const bytes = new Uint8Array(await (await fetch(cardSrc)).arrayBuffer());
      const size = pngDimensions(bytes);
      if (!size) throw new Error("png-dimensions");

      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({
        orientation: size.width >= size.height ? "landscape" : "portrait",
        unit: "px",
        format: [size.width, size.height],
        hotfixes: ["px_scaling"], // px 단위 스케일 보정 — 없으면 이미지가 페이지보다 크게 그려진다
      });
      doc.addImage(bytes, "PNG", 0, 0, size.width, size.height);
      doc.save(`omnimind-${via}.pdf`);
      void recordClientEvent("card_download_pdf", { via });
    } catch {
      setPdfError(true);
    } finally {
      setPdfPending(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={openSheet}
        className="press mt-4 block w-full rounded-card border border-accent-coral/40 bg-warm-surface py-3.5 text-center font-medium text-primary-green"
      >
        {label} 만들기 ✨
      </button>
    );
  }

  return (
    <section className="mt-4 rounded-card bg-warm-surface p-4">
      <p className="text-sm text-text-soft">{label}</p>
      {/* eslint-disable-next-line @next/next/no-img-element -- OG 라우트 PNG는 next/image 최적화 불필요 */}
      <img
        src={cardSrc}
        alt={label}
        className="mt-3 w-full rounded-card border border-warm-base"
      />
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          onClick={share}
          className="press rounded-card bg-accent-coral py-3 text-center font-medium text-white"
        >
          공유하기
        </button>
        <a
          href={cardSrc}
          download="omnimind-card.png"
          className="press rounded-card border border-primary-green/30 py-3 text-center font-medium text-primary-green"
        >
          이미지 저장
        </a>
        <button
          onClick={() => void downloadPdf()}
          disabled={pdfPending}
          className="press rounded-card border border-primary-green/30 py-3 text-center font-medium text-primary-green disabled:opacity-40"
        >
          {pdfPending ? "PDF 만드는 중…" : "PDF로 저장"}
        </button>
        <button
          onClick={copyLink}
          className="press rounded-card border border-primary-green/30 py-3 text-center font-medium text-primary-green"
        >
          {copied ? "복사했어요 ✓" : "링크 복사"}
        </button>
      </div>
      {pdfError && (
        <p className="mt-2 text-center text-sm text-accent-coral">
          PDF를 만들지 못했어요. 잠시 후 다시 시도해주세요.
        </p>
      )}
    </section>
  );
}
