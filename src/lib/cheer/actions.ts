"use server";

// 익명 응원 — 완전 익명 앱에서 유일하게 서버에 남는 사용자 상호작용. 계정 없이 누구나
// 짧은 응원을 남기고(admin이 검증 후 insert) 최근 응원을 함께 본다(anon select). 서버 전용
// admin 클라이언트로만 쓴다(스팸 표면 최소화). Supabase 미설정이면 조용히 빈 결과로 폴백한다.
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createAnonSupabase } from "@/lib/supabase/anon";
import { validateCheer } from "./validate";

export interface Cheer {
  id: string;
  message: string;
  created_at: string;
}

/** 최근 응원 목록(기본 24개). 공개 읽기라 anon 클라이언트로 RLS의 SELECT 정책을 따른다.
 *  실패·미설정이면 빈 배열. */
export async function recentCheers(limit = 24): Promise<Cheer[]> {
  try {
    const anon = createAnonSupabase();
    const { data } = await anon
      .from("cheers")
      .select("id, message, created_at")
      .order("created_at", { ascending: false })
      .limit(limit)
      .returns<Cheer[]>();
    return data ?? [];
  } catch {
    return [];
  }
}

export type SubmitCheerResult = { ok: true; cheer: Cheer } | { ok: false };

/** 응원 한마디 등록 — 검증 후 익명 insert. */
export async function submitCheer(message: string): Promise<SubmitCheerResult> {
  const v = validateCheer(message);
  if (!v.ok) return { ok: false };
  try {
    const admin = createAdminSupabase();
    const { data, error } = await admin
      .from("cheers")
      .insert({ message: v.value })
      .select("id, message, created_at")
      .single<Cheer>();
    if (error || !data) return { ok: false };
    return { ok: true, cheer: data };
  } catch {
    return { ok: false };
  }
}
