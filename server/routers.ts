import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { notifyOwner } from "./_core/notification";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { storagePut, storageGetSignedUrl } from "./storage";
import { createOrder, createPayment, getAdminPayments, getOrderForUser, getPaymentMethods, getProductBySlug, getPurchases, isApprovedOwner, listCategories, listProducts, setPaymentStatus, toggleWishlist, getWishlist, getDb, products, reviews, orders, getProductReviews, recordDownload, getApprovedOrderForProduct, getUserNotifications, markNotificationsRead, createUserNotification, users } from "./db";
import { eq } from "drizzle-orm";
import { validateScreenshot, assertApprovedDownload } from "./validation";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  return next();
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => { const cookieOptions = getSessionCookieOptions(ctx.req); ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 }); return { success: true } as const; }),
  }),
  catalog: router({
    categories: publicProcedure.query(() => listCategories()),
    products: publicProcedure.input(z.object({ search: z.string().optional(), categoryId: z.number().optional(), featured: z.boolean().optional(), sort: z.string().optional(), minPrice: z.number().optional(), maxPrice: z.number().optional(), minRating: z.number().optional() }).optional()).query(({ input }) => listProducts(input)),
    detail: publicProcedure.input(z.object({ slug: z.string() })).query(({ input }) => getProductBySlug(input.slug)),
    reviews: publicProcedure.input(z.object({ productId: z.number().int().positive() })).query(({ input }) => getProductReviews(input.productId)),
    paymentMethods: publicProcedure.query(() => getPaymentMethods()),
  }),
  orders: router({
    create: protectedProcedure.input(z.object({ customerName: z.string().min(2), customerEmail: z.string().email(), items: z.array(z.object({ productId: z.number().int().positive(), quantity: z.number().int().min(1).max(1) })).min(1) })).mutation(({ ctx, input }) => createOrder(ctx.user.id, input.customerName, input.customerEmail, input.items)),
    mine: protectedProcedure.query(({ ctx }) => getPurchases(ctx.user.id)),
    submitPayment: protectedProcedure.input(z.object({ orderId: z.number().int().positive(), paymentMethod: z.string().min(2), senderName: z.string().min(2), senderPhone: z.string().min(5), transactionReference: z.string().max(120).optional(), screenshotData: z.string().min(20), screenshotContentType: z.enum(["image/jpeg", "image/png", "image/webp"]), screenshotSize: z.number().max(5 * 1024 * 1024) })).mutation(async ({ ctx, input }) => {
      const order = await getOrderForUser(ctx.user.id, input.orderId); if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      if (order.paymentStatus !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "This order has already been submitted" });
      const buffer = Buffer.from(input.screenshotData.replace(/^data:[^;]+;base64,/, ""), "base64");
      try { validateScreenshot(input.screenshotContentType, buffer.byteLength); } catch (error) { throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Invalid screenshot" }); }
      const ext = input.screenshotContentType.split("/")[1]; const stored = await storagePut(`payment-screenshots/${ctx.user.id}/${input.orderId}.${ext}`, buffer, input.screenshotContentType);
      const paymentId = await createPayment({ orderId: input.orderId, userId: ctx.user.id, paymentMethod: input.paymentMethod, amount: order.total, senderName: input.senderName, senderPhone: input.senderPhone, transactionReference: input.transactionReference, screenshotKey: stored.key });
      await createUserNotification(ctx.user.id, "Payment submitted", `Order #${input.orderId} is pending manual review.`, "payment_submitted");
      await notifyOwner({ title: `New payment submission #${input.orderId}`, content: `${input.paymentMethod} payment submitted by ${input.senderName} for ${order.total}. Review payment #${paymentId} in the admin panel.` });
      return { paymentId, orderId: input.orderId, status: "pending" as const };
    }),
    download: protectedProcedure.input(z.object({ productId: z.number().int().positive() })).mutation(async ({ ctx, input }) => { try { assertApprovedDownload(await isApprovedOwner(ctx.user.id, input.productId)); } catch (error) { throw new TRPCError({ code: "FORBIDDEN", message: error instanceof Error ? error.message : "Payment approval required" }); } const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); const p = (await db.select().from(products).where(eq(products.id, input.productId)).limit(1))[0]; if (!p?.digitalFileKey) throw new TRPCError({ code: "NOT_FOUND", message: "Digital file unavailable" }); const approved = await getApprovedOrderForProduct(ctx.user.id, input.productId); await recordDownload(ctx.user.id, input.productId, approved!.id); return { url: await storageGetSignedUrl(p.digitalFileKey) }; }),
  }),
  wishlist: router({ list: protectedProcedure.query(({ ctx }) => getWishlist(ctx.user.id)), toggle: protectedProcedure.input(z.object({ productId: z.number().int().positive() })).mutation(({ ctx, input }) => toggleWishlist(ctx.user.id, input.productId)) }),
  notifications: router({ list: protectedProcedure.query(({ ctx }) => getUserNotifications(ctx.user.id)), markRead: protectedProcedure.mutation(({ ctx }) => markNotificationsRead(ctx.user.id)) }),
  reviews: router({ create: protectedProcedure.input(z.object({ productId: z.number().int().positive(), orderId: z.number().int().positive(), rating: z.number().int().min(1).max(5), body: z.string().max(2000).optional() })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db || !(await isApprovedOwner(ctx.user.id, input.productId))) throw new TRPCError({ code: "FORBIDDEN", message: "Only verified purchasers can review" }); await db.insert(reviews).values({ userId: ctx.user.id, ...input }); return { success: true }; }) }),
  admin: router({
    payments: adminProcedure.query(() => getAdminPayments()),
    verifyPayment: adminProcedure.input(z.object({ paymentId: z.number().int().positive(), status: z.enum(["approved", "rejected"]), rejectionReason: z.string().max(1000).optional() })).mutation(({ ctx, input }) => { if (input.status === "rejected" && !input.rejectionReason?.trim()) throw new TRPCError({ code: "BAD_REQUEST", message: "Rejection reason is required" }); return setPaymentStatus(input.paymentId, input.status, ctx.user.id, input.rejectionReason); }),
    products: adminProcedure.query(async () => { const db = await getDb(); return db ? db.select().from(products).orderBy(products.createdAt) : []; }),
    orders: adminProcedure.query(async () => { const db = await getDb(); return db ? db.select().from(orders).orderBy(orders.createdAt) : []; }),
    createProduct: adminProcedure.input(z.object({ title: z.string().min(2), slug: z.string().min(2), price: z.string(), categoryId: z.number().int().positive(), status: z.enum(["draft", "published"]), featured: z.boolean() })).mutation(async ({ input }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); await db.insert(products).values(input); return { success: true }; }),
    updateProduct: adminProcedure.input(z.object({ id: z.number().int().positive(), title: z.string().min(2), price: z.string(), discountPrice: z.string().optional(), status: z.enum(["draft", "published"]), featured: z.boolean() })).mutation(async ({ input }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); const { id, ...changes } = input; await db.update(products).set(changes).where(eq(products.id, id)); const audience = await db.select({ id: users.id }).from(users); await Promise.all(audience.map(person => createUserNotification(person.id, "Product updated", `${input.title} has been updated in the marketplace.`, "product_updated"))); return { success: true }; }),
    deleteProduct: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); await db.delete(products).where(eq(products.id, input.id)); return { success: true }; }),
    settings: adminProcedure.query(async () => { const db = await getDb(); return db ? db.select().from((await import("../drizzle/schema")).paymentMethods) : []; }),
    updatePaymentMethod: adminProcedure.input(z.object({ id: z.number().int().positive(), enabled: z.boolean(), accountName: z.string().min(2), accountNumber: z.string().min(3), instructions: z.string().max(1000).optional() })).mutation(async ({ input }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); const { id, ...changes } = input; await db.update((await import("../drizzle/schema")).paymentMethods).set(changes).where(eq((await import("../drizzle/schema")).paymentMethods.id, id)); return { success: true }; }),
  }),
});
export type AppRouter = typeof appRouter;
