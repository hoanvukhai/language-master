import { beforeEach, describe, expect, it, vi } from "vitest";

const calls: string[] = [];
let failSave = false;

vi.mock("../src/lib/jlpt/historyService", () => ({
  buildAttemptHistoryRecord: (a: { mode?: string }) => ({ kind: "pool", mode: a.mode ?? "mock" }),
  markSaved: () => calls.push("markSaved"),
  readSavedIds: () => new Set<string>(),
  saveAttemptSummary: async () => {
    calls.push("save");
    if (failSave) throw Object.assign(new Error("denied"), { code: "permission-denied" });
  },
}));
vi.mock("../src/lib/jlpt/draftStore", () => ({
  removeUserDraft: () => calls.push("removeDraft"),
}));

import { persistSubmittedAttempt } from "../src/lib/jlpt/attemptPersistence";

const attempt = { id: "a1", status: "submitted" } as never;

describe("persistSubmittedAttempt (BE-2)", () => {
  beforeEach(() => {
    calls.length = 0;
    failSave = false;
  });

  it("chỉ xóa bản nháp sau khi lưu kết quả thành công", async () => {
    const res = await persistSubmittedAttempt("u1", attempt);
    expect(res.ok).toBe(true);
    expect(calls).toEqual(["save", "markSaved", "removeDraft"]);
  });

  it("bài không phải Thi thử thì không lưu lịch sử, chỉ xóa bản nháp", async () => {
    const res = await persistSubmittedAttempt("u1", { id: "d1", status: "submitted", mode: "drill" } as never);
    expect(res.ok).toBe(true);
    expect(calls).toEqual(["removeDraft"]);
  });

  it("lưu lỗi thì giữ nguyên bản nháp", async () => {
    failSave = true;
    const res = await persistSubmittedAttempt("u1", { id: "a2", status: "submitted" } as never);
    expect(res.ok).toBe(false);
    expect(calls).toEqual(["save"]);
  });
});
