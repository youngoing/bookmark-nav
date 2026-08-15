import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";
import { bookmarkCreateInput, bookmarkPatchInput } from "@loomark/shared";
import { isValidApiToken, verifySession } from "./auth";
import { clickBookmark, createBookmark, getDashboard, listBookmarks, removeBookmark, updateBookmark } from "./store";

export type BackendContext = { apiToken?: string; sessionToken?: string };
const t = initTRPC.context<BackendContext>().create();
const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!isValidApiToken(ctx.apiToken) && !(await verifySession(ctx.sessionToken)).ok) throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
  return next();
});
export const appRouter = t.router({
  dashboard: protectedProcedure.query(() => getDashboard()),
  bookmark: t.router({
    list: protectedProcedure.query(() => listBookmarks()),
    create: protectedProcedure.input(bookmarkCreateInput).mutation(({ input }) => createBookmark(input)),
    update: protectedProcedure.input(z.object({ id: z.string(), patch: bookmarkPatchInput })).mutation(({ input }) => updateBookmark(input.id, input.patch)),
    delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(({ input }) => removeBookmark(input.id)),
    click: protectedProcedure.input(z.object({ id: z.string() })).mutation(({ input }) => clickBookmark(input.id)),
  }),
});
export type AppRouter = typeof appRouter;
