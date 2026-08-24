import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import * as db from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { storagePut } from "./storage";
import { answerGroundedly, extractPdf, gradeQuizAnswers, makeChunks, makeFlashcards, makeQuiz, makeSummary, ocrScannedPdfPages, scheduleFlashcardReview } from "./study";
import { COOKIE_NAME } from "../shared/const";

const aiUsage = new Map<number, { startedAt: number; count: number }>();

function requireOwned<T>(value: T | undefined, message = "This resource is unavailable.") {
  if (!value) throw new TRPCError({ code: "NOT_FOUND", message });
  return value;
}

function limitAiRequests(userId: number) {
  const now = Date.now();
  const current = aiUsage.get(userId);
  if (!current || now - current.startedAt > 60_000) {
    aiUsage.set(userId, { startedAt: now, count: 1 });
    return;
  }
  if (current.count >= 12) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Please pause for a moment before making more AI requests." });
  current.count += 1;
}

function decodePdfDataUrl(dataUrl: string) {
  const match = /^data:application\/pdf;base64,([a-zA-Z0-9+/=\s]+)$/.exec(dataUrl);
  if (!match) throw new TRPCError({ code: "BAD_REQUEST", message: "Choose a valid PDF file." });
  const file = Buffer.from(match[1].replace(/\s/g, ""), "base64");
  if (!file.length || !file.subarray(0, 4).toString().startsWith("%PDF")) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Choose a valid PDF file." });
  }
  return file;
}

function safeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-120) || "study-material.pdf";
}

const citationSchema = z.object({ chunkId: z.number(), materialId: z.number(), materialTitle: z.string(), pageNumber: z.number().nullable(), excerpt: z.string() });
const quizQuestionSchema = z.object({ id: z.string(), prompt: z.string(), type: z.enum(["multiple_choice", "short_answer"]), options: z.array(z.string()), answer: z.string(), explanation: z.string(), citations: z.array(citationSchema) });
const quizPayloadSchema = z.object({ questions: z.array(quizQuestionSchema) });
const flashcardPayloadSchema = z.object({ cards: z.array(z.object({ id: z.string(), front: z.string(), back: z.string(), citations: z.array(citationSchema) })) });

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  study: router({
    dashboard: protectedProcedure.query(({ ctx }) => db.getDashboard(ctx.user.id)),
    weeklyDigest: protectedProcedure.query(({ ctx }) => db.getWeeklyDigest(ctx.user.id)),
    createSubject: protectedProcedure.input(z.object({ name: z.string().trim().min(2).max(120), description: z.string().trim().max(700).optional(), accent: z.enum(["lavender", "blush", "mint"]).optional() })).mutation(async ({ ctx, input }) => {
      const subject = await db.createSubject(ctx.user.id, input);
      return requireOwned(subject, "Your subject could not be created.");
    }),
    workspace: protectedProcedure.input(z.object({ subjectId: z.number().int().positive() })).query(async ({ ctx, input }) => requireOwned(await db.getWorkspace(ctx.user.id, input.subjectId), "This subject is unavailable.")),
    addTextMaterial: protectedProcedure.input(z.object({ subjectId: z.number().int().positive(), title: z.string().trim().min(2).max(180), content: z.string().trim().min(80).max(90_000) })).mutation(async ({ ctx, input }) => {
      requireOwned(await db.getSubjectForOwner(ctx.user.id, input.subjectId), "This subject is unavailable.");
      const chunks = makeChunks(input.content, null, 0);
      const material = await db.createMaterialWithChunks(ctx.user.id, { subjectId: input.subjectId, title: input.title, sourceType: "text", extractedText: input.content, processingStatus: chunks.length ? "ready" : "needs_attention", chunks });
      return requireOwned(material, "Your material could not be saved.");
    }),
    uploadPdf: protectedProcedure.input(z.object({ subjectId: z.number().int().positive(), fileName: z.string().min(1).max(255), dataUrl: z.string().min(40) })).mutation(async ({ ctx, input }) => {
      requireOwned(await db.getSubjectForOwner(ctx.user.id, input.subjectId), "This subject is unavailable.");
      const file = decodePdfDataUrl(input.dataUrl);
      let parsed;
      try {
        parsed = await extractPdf(file);
      } catch {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Kevin could not read this PDF. Try a text-based, unprotected PDF instead." });
      }
      const extractedPageNumbers = new Set(parsed.pages.map(page => page.pageNumber));
      const missingTextPages = Array.from({ length: Math.min(parsed.totalPages, 12) }, (_, index) => index + 1).filter(pageNumber => !extractedPageNumbers.has(pageNumber));
      const ocrPages = missingTextPages.length ? await ocrScannedPdfPages(file, missingTextPages) : [];
      const pages = [...parsed.pages, ...ocrPages].sort((a, b) => a.pageNumber - b.pageNumber);
      const chunks = pages.flatMap((page, pageIndex) => makeChunks(page.text, page.pageNumber, pageIndex * 100));
      const safeName = safeFileName(input.fileName);
      const stored = await storagePut(`study-materials/${ctx.user.id}/${Date.now()}-${nanoid(8)}-${safeName}`, file, "application/pdf");
      const material = await db.createMaterialWithChunks(ctx.user.id, {
        subjectId: input.subjectId,
        title: safeName.replace(/\.pdf$/i, ""),
        sourceType: "pdf",
        originalFileName: safeName,
        mimeType: "application/pdf",
        storageKey: stored.key,
        storageUrl: stored.url,
        pageCount: parsed.totalPages,
        extractedText: pages.map(page => page.text).join("\n\n"),
        processingStatus: chunks.length ? "ready" : "needs_attention",
        chunks,
      });
      return { material: requireOwned(material, "Your PDF could not be saved."), truncated: parsed.truncated, ocrPages: ocrPages.length };
    }),
    ask: protectedProcedure.input(z.object({ subjectId: z.number().int().positive(), question: z.string().trim().min(3).max(1_200), conversationId: z.number().int().positive().optional() })).mutation(async ({ ctx, input }) => {
      limitAiRequests(ctx.user.id);
      requireOwned(await db.getSubjectForOwner(ctx.user.id, input.subjectId), "This subject is unavailable.");
      const conversation = await db.getOrCreateConversation(ctx.user.id, input.subjectId, input.conversationId, input.question);
      await db.addChatMessage(ctx.user.id, { conversationId: conversation.id, role: "user", content: input.question });
      const result = await answerGroundedly(input.question, await db.getSourceChunks(ctx.user.id, input.subjectId));
      await db.addChatMessage(ctx.user.id, { conversationId: conversation.id, role: "assistant", content: result.answer, citations: result.citations });
      await db.recordStudySession(ctx.user.id, input.subjectId, 2, "chat");
      return { conversationId: conversation.id, ...result };
    }),
    generateSummary: protectedProcedure.input(z.object({ subjectId: z.number().int().positive(), materialId: z.number().int().positive().optional() })).mutation(async ({ ctx, input }) => {
      limitAiRequests(ctx.user.id);
      requireOwned(await db.getSubjectForOwner(ctx.user.id, input.subjectId), "This subject is unavailable.");
      if (input.materialId) requireOwned(await db.getMaterialForOwner(ctx.user.id, input.materialId), "This material is unavailable.");
      const result = await makeSummary(await db.getSourceChunks(ctx.user.id, input.subjectId, input.materialId));
      const set = await db.saveStudySet(ctx.user.id, { subjectId: input.subjectId, materialId: input.materialId, kind: "summary", title: "Grounded summary", payload: result });
      await db.recordStudySession(ctx.user.id, input.subjectId, 4, "reading");
      return set;
    }),
    generateFlashcards: protectedProcedure.input(z.object({ subjectId: z.number().int().positive(), materialId: z.number().int().positive().optional(), count: z.number().int().min(4).max(16).default(8) })).mutation(async ({ ctx, input }) => {
      limitAiRequests(ctx.user.id);
      requireOwned(await db.getSubjectForOwner(ctx.user.id, input.subjectId), "This subject is unavailable.");
      if (input.materialId) requireOwned(await db.getMaterialForOwner(ctx.user.id, input.materialId), "This material is unavailable.");
      const cards = await makeFlashcards(await db.getSourceChunks(ctx.user.id, input.subjectId, input.materialId), input.count);
      const set = await db.saveStudySet(ctx.user.id, { subjectId: input.subjectId, materialId: input.materialId, kind: "flashcards", title: "Flashcard review", payload: { cards } });
      await db.seedFlashcardSchedules(ctx.user.id, set.id, cards.length);
      await db.recordStudySession(ctx.user.id, input.subjectId, 4, "flashcards");
      return set;
    }),
    generateQuiz: protectedProcedure.input(z.object({ subjectId: z.number().int().positive(), materialId: z.number().int().positive().optional(), count: z.number().int().min(3).max(10).default(5) })).mutation(async ({ ctx, input }) => {
      limitAiRequests(ctx.user.id);
      requireOwned(await db.getSubjectForOwner(ctx.user.id, input.subjectId), "This subject is unavailable.");
      if (input.materialId) requireOwned(await db.getMaterialForOwner(ctx.user.id, input.materialId), "This material is unavailable.");
      const questions = await makeQuiz(await db.getSourceChunks(ctx.user.id, input.subjectId, input.materialId), input.count);
      const set = await db.saveStudySet(ctx.user.id, { subjectId: input.subjectId, materialId: input.materialId, kind: "quiz", title: "Grounded quiz", payload: { questions } });
      return set;
    }),
    submitQuiz: protectedProcedure.input(z.object({ studySetId: z.number().int().positive(), answers: z.record(z.string(), z.string().max(2_000)) })).mutation(async ({ ctx, input }) => {
      const studySet = requireOwned(await db.getStudySetForOwner(ctx.user.id, input.studySetId), "This quiz is unavailable.");
      if (studySet.kind !== "quiz") throw new TRPCError({ code: "BAD_REQUEST", message: "This study set is not a quiz." });
      const payload = quizPayloadSchema.parse(studySet.payload);
      const { score, feedback } = gradeQuizAnswers(payload.questions, input.answers);
      const attempt = await db.saveQuizAttempt(ctx.user.id, { studySetId: studySet.id, subjectId: studySet.subjectId, score, totalQuestions: feedback.length, answers: input.answers, feedback });
      await db.recordStudySession(ctx.user.id, studySet.subjectId, Math.max(3, feedback.length * 2), "quiz");
      return { attempt, score, totalQuestions: feedback.length, feedback };
    }),
    reviewFlashcard: protectedProcedure.input(z.object({ studySetId: z.number().int().positive(), cardIndex: z.number().int().min(0), rating: z.enum(["easy", "hard", "review_again"]) })).mutation(async ({ ctx, input }) => {
      const set = requireOwned(await db.getStudySetForOwner(ctx.user.id, input.studySetId), "This flashcard set is unavailable.");
      if (set.kind !== "flashcards") throw new TRPCError({ code: "BAD_REQUEST", message: "This study set is not flashcards." });
      await db.addFlashcardReview(ctx.user.id, input.studySetId, input.cardIndex, input.rating);
      const current = await db.getFlashcardSchedule(ctx.user.id, input.studySetId, input.cardIndex);
      const schedule = await db.saveFlashcardSchedule(ctx.user.id, input.studySetId, input.cardIndex, scheduleFlashcardReview(current, input.rating));
      return { success: true, schedule } as const;
    }),
    dueFlashcards: protectedProcedure.input(z.object({ subjectId: z.number().int().positive().optional() })).query(async ({ ctx, input }) => {
      await db.seedExistingFlashcardSchedules(ctx.user.id, input.subjectId);
      const due = await db.getDueFlashcards(ctx.user.id, input.subjectId);
      return due.flatMap(({ schedule, studySet, subject }) => {
        const parsed = flashcardPayloadSchema.safeParse(studySet.payload);
        const card = parsed.success ? parsed.data.cards[schedule.cardIndex] : undefined;
        return card ? [{ schedule, studySetId: studySet.id, subjectId: subject.id, subjectName: subject.name, card }] : [];
      });
    }),
    recordSession: protectedProcedure.input(z.object({ subjectId: z.number().int().positive(), minutes: z.number().int().min(1).max(180), activityType: z.enum(["reading", "chat", "flashcards", "quiz"]) })).mutation(async ({ ctx, input }) => {
      requireOwned(await db.getSubjectForOwner(ctx.user.id, input.subjectId), "This subject is unavailable.");
      await db.recordStudySession(ctx.user.id, input.subjectId, input.minutes, input.activityType);
      return { success: true } as const;
    }),
  }),
});

export type AppRouter = typeof appRouter;
