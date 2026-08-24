import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

describe("study router authorization", () => {
  it("blocks unauthenticated callers before loading a dashboard", async () => {
    const ctx: TrpcContext = { user: null, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] };
    const caller = appRouter.createCaller(ctx);
    await expect(caller.study.dashboard()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("blocks unauthenticated callers before exporting a study pack", async () => {
    const ctx: TrpcContext = { user: null, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] };
    const caller = appRouter.createCaller(ctx);
    await expect(caller.study.exportPack({ subjectId: 1, kind: "summary" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("protects the final material, practice, and planning workflows", async () => {
    const ctx: TrpcContext = { user: null, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] };
    const caller = appRouter.createCaller(ctx);
    await expect(caller.study.archiveMaterial({ materialId: 1, archived: true })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.study.deleteMaterial({ materialId: 1 })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.study.createTextVersion({ materialId: 1, content: "A".repeat(80) })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.study.createExam({ subjectId: 1, title: "Midterm", occursAt: new Date() })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.study.resolveMistake({ mistakeId: 1, resolved: true })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.study.editFlashcard({ studySetId: 1, cardIndex: 0, front: "Prompt", back: "Answer" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.study.reviewFlashcard({ studySetId: 1, cardIndex: 0, rating: "easy", confidence: "high" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
