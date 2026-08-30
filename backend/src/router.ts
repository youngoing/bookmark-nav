import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  bookmarkBatchWriteInput,
  bookmarkCreateInput,
  bookmarkPatchInput,
} from "@loomark/shared";
import { getSessionUser } from "./auth";
import {
  clickBookmark,
  batchWriteBookmarks,
  createBookmark,
  getDashboard,
  listBookmarks,
  removeBookmark,
  updateBookmark,
} from "./store";

export type BackendContext = { headers: Headers };
const t = initTRPC.context<BackendContext>().create();
const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  const user = await getSessionUser(ctx.headers);
  if (!user.ok)
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Authentication required",
    });
  return next({ ctx: { ...ctx, user: user.value } });
});
export const appRouter = t.router({
  dashboard: protectedProcedure.query(({ ctx }) => getDashboard(ctx.user.id)),
  bookmark: t.router({
    list: protectedProcedure.query(({ ctx }) => listBookmarks(ctx.user.id)),
    create: protectedProcedure
      .input(bookmarkCreateInput)
      .mutation(({ ctx, input }) => createBookmark(ctx.user.id, input)),
    batchWrite: protectedProcedure
      .input(bookmarkBatchWriteInput)
      .mutation(({ ctx, input }) =>
        batchWriteBookmarks(ctx.user.id, input.items, input.updateExisting),
      ),
    update: protectedProcedure
      .input(z.object({ id: z.string(), patch: bookmarkPatchInput }))
      .mutation(({ ctx, input }) =>
        updateBookmark(ctx.user.id, input.id, input.patch),
      ),
    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(({ ctx, input }) => removeBookmark(ctx.user.id, input.id)),
    click: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(({ ctx, input }) => clickBookmark(ctx.user.id, input.id)),
  }),
});
export type AppRouter = typeof appRouter;
