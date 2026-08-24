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
});
