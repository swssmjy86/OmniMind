"use server";

import { randomUUID } from "crypto";
import { createServerSupabase } from "@/lib/supabase/server";
import { isMatchModeSlug, type MatchModeSlug } from "@/lib/engine/match";
import { recordEvent } from "@/lib/metrics/events";
import type { ProfileRow, ConnectionRow } from "@/lib/db/types";

// P7-2 초대 연결 — 초대장 발급·수락. 심층 궁합 계산은 /connect 페이지(순수 함수)에서.

export type CreateInviteResult =
  | { ok: true; token: string }
  | { ok: false; reason: "auth" | "no-profile" | "error" };

/** 초대장 발급 — 내 프로필 스냅샷을 담은 pending 연결 생성. */
export async function createInvite(modeSlug: string): Promise<CreateInviteResult> {
  if (!isMatchModeSlug(modeSlug)) return { ok: false, reason: "error" };
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, reason: "auth" };

    const { data: profile } = await supabase
      .from("profiles").select("*").eq("user_id", user.id).maybeSingle<ProfileRow>();
    if (!profile) return { ok: false, reason: "no-profile" };

    const token = randomUUID();
    const { error } = await supabase.from("connections").insert({
      token,
      mode: modeSlug satisfies MatchModeSlug,
      inviter_id: user.id,
      inviter_nickname: profile.nickname,
      inviter_profile: profile.profile_context,
    });
    if (error) return { ok: false, reason: "error" };

    await recordEvent("match_invite_create", { mode: modeSlug });
    return { ok: true, token };
  } catch {
    return { ok: false, reason: "error" };
  }
}

export type AcceptInviteResult =
  | { ok: true }
  | { ok: false; reason: "auth" | "no-profile" | "not-found" | "own-invite" | "error" };

/** 초대 수락 — 내 프로필 스냅샷을 채우며 accepted로 전환(RLS가 조건을 강제). */
export async function acceptInvite(token: string): Promise<AcceptInviteResult> {
  if (!token) return { ok: false, reason: "error" };
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, reason: "auth" };

    const { data: profile } = await supabase
      .from("profiles").select("*").eq("user_id", user.id).maybeSingle<ProfileRow>();
    if (!profile) return { ok: false, reason: "no-profile" };

    const { data: conn } = await supabase
      .from("connections").select("*").eq("token", token).maybeSingle<ConnectionRow>();
    if (!conn || conn.status !== "pending") return { ok: false, reason: "not-found" };
    if (conn.inviter_id === user.id) return { ok: false, reason: "own-invite" };

    const { error } = await supabase
      .from("connections")
      .update({
        status: "accepted",
        invitee_id: user.id,
        invitee_nickname: profile.nickname,
        invitee_profile: profile.profile_context,
        accepted_at: new Date().toISOString(),
      })
      .eq("token", token).eq("status", "pending");
    if (error) return { ok: false, reason: "error" };

    await recordEvent("connect_accept", { mode: conn.mode });
    return { ok: true };
  } catch {
    return { ok: false, reason: "error" };
  }
}
