import { describe, expect, it, vi } from "vitest";

const { getWorkspace } = vi.hoisted(() => ({ getWorkspace: vi.fn() }));
vi.mock("./db", () => ({ getWorkspace }));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

describe("study pack export ownership", () => {
  it("blocks a signed-in learner from exporting a subject they do not own", async () => {
    getWorkspace.mockResolvedValueOnce(undefined);
    const ctx: TrpcContext = { user: { id: 44, openId: "learner-44", name: "Learner", email: null, loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] };
    const caller = appRouter.createCaller(ctx);
    await expect(caller.study.exportPack({ subjectId: 999, kind: "summary", format: "pdf" })).rejects.toMatchObject({ code: "NOT_FOUND", message: "This subject is unavailable." });
    expect(getWorkspace).toHaveBeenCalledWith(44, 999);
  });
});
