import { describe, expect, it } from "vitest";
import { BODY_MAX, SUBJECT_MAX, validateInquiry } from "./validate";

const valid = { email: "a@b.co", subject: "제목", body: "내용" };

describe("문의 입력 검증 (§9.2)", () => {
  it("정상 입력은 트리밍되어 통과한다", () => {
    const r = validateInquiry({ email: " a@b.co ", subject: " 제목 ", body: " 내용 " });
    expect(r).toEqual({ ok: true, value: valid });
  });

  it("이메일 형식이 아니면 email 사유로 거부한다", () => {
    for (const email of ["", "no-at", "a@b", "a b@c.co"]) {
      expect(validateInquiry({ ...valid, email })).toEqual({ ok: false, reason: "email" });
    }
  });

  it("제목·내용은 비어 있거나 상한을 넘으면 거부한다", () => {
    expect(validateInquiry({ ...valid, subject: "  " })).toEqual({ ok: false, reason: "subject" });
    expect(validateInquiry({ ...valid, subject: "가".repeat(SUBJECT_MAX + 1) }))
      .toEqual({ ok: false, reason: "subject" });
    expect(validateInquiry({ ...valid, body: "" })).toEqual({ ok: false, reason: "body" });
    expect(validateInquiry({ ...valid, body: "가".repeat(BODY_MAX + 1) }))
      .toEqual({ ok: false, reason: "body" });
  });
});
