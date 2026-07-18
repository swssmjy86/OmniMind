"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { recordEvent } from "@/lib/metrics/events";
import { validateInquiry } from "@/lib/inquiry/validate";

export type InquiryResult = { ok: true } | { ok: false; reason: "invalid" | "error" };

/**
 * 문의 접수(§9.2) — 검증 후 inquiries에 저장. 로그인 상태면 user_id 자동 연결.
 * 쓰기는 admin 클라이언트로만 한다 — 비로그인 문의를 받기 위해 anon insert 정책을
 * 여는 대신, 검증을 마친 서버만 쓰게 해 스팸 표면을 줄인다(0009 마이그레이션 주석 참조).
 */
export async function submitInquiry(input: {
  email: string;
  subject: string;
  body: string;
}): Promise<InquiryResult> {
  const v = validateInquiry(input);
  if (!v.ok) return { ok: false, reason: "invalid" };

  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    const admin = createAdminSupabase();
    const { error } = await admin.from("inquiries").insert({
      user_id: user?.id ?? null,
      email: v.value.email,
      subject: v.value.subject,
      body: v.value.body,
    });
    if (error) return { ok: false, reason: "error" };

    await recordEvent("inquiry_submit", { loggedIn: Boolean(user) });
    return { ok: true };
  } catch {
    return { ok: false, reason: "error" };
  }
}
