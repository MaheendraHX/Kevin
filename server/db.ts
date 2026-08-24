import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  chatMessages,
  conversations,
  flashcardReviews,
  InsertUser,
  materialChunks,
  materials,
  quizAttempts,
  studySessions,
  studySets,
  subjects,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Kevin's study database is temporarily unavailable.");
  return db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId, lastSignedIn: new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: new Date() };
  (["name", "email", "loginMethod"] as const).forEach(field => {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  });
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function listSubjects(ownerId: number) {
  const db = await requireDb();
  return db.select().from(subjects).where(eq(subjects.ownerId, ownerId)).orderBy(desc(subjects.updatedAt));
}

export async function getSubjectForOwner(ownerId: number, subjectId: number) {
  const db = await requireDb();
  const rows = await db.select().from(subjects).where(and(eq(subjects.id, subjectId), eq(subjects.ownerId, ownerId))).limit(1);
  return rows[0];
}

export async function createSubject(ownerId: number, input: { name: string; description?: string; accent?: string }) {
  const db = await requireDb();
  const result = await db.insert(subjects).values({
    ownerId,
    name: input.name,
    description: input.description || null,
    accent: input.accent || "lavender",
  });
  return getSubjectForOwner(ownerId, Number(result[0].insertId));
}

export async function getMaterialForOwner(ownerId: number, materialId: number) {
  const db = await requireDb();
  const rows = await db.select().from(materials).where(and(eq(materials.id, materialId), eq(materials.ownerId, ownerId))).limit(1);
  return rows[0];
}

export async function createMaterialWithChunks(ownerId: number, input: {
  subjectId: number;
  title: string;
  sourceType: "pdf" | "text";
  originalFileName?: string | null;
  mimeType?: string | null;
  storageKey?: string | null;
  storageUrl?: string | null;
  pageCount?: number | null;
  extractedText: string;
  processingStatus: "ready" | "needs_attention";
  chunks: Array<{ pageNumber: number | null; chunkIndex: number; content: string }>;
}) {
  const db = await requireDb();
  const subject = await getSubjectForOwner(ownerId, input.subjectId);
  if (!subject) return null;
  const result = await db.insert(materials).values({
    subjectId: input.subjectId,
    ownerId,
    title: input.title,
    sourceType: input.sourceType,
    originalFileName: input.originalFileName ?? null,
    mimeType: input.mimeType ?? null,
    storageKey: input.storageKey ?? null,
    storageUrl: input.storageUrl ?? null,
    pageCount: input.pageCount ?? null,
    extractedText: input.extractedText,
    processingStatus: input.processingStatus,
  });
  const materialId = Number(result[0].insertId);
  if (input.chunks.length) {
    await db.insert(materialChunks).values(input.chunks.map(chunk => ({
      materialId,
      subjectId: input.subjectId,
      ownerId,
      pageNumber: chunk.pageNumber,
      chunkIndex: chunk.chunkIndex,
      content: chunk.content,
    })));
  }
  return getMaterialForOwner(ownerId, materialId);
}

export async function getSourceChunks(ownerId: number, subjectId: number, materialId?: number) {
  const db = await requireDb();
  const scope = materialId
    ? and(eq(materialChunks.ownerId, ownerId), eq(materialChunks.subjectId, subjectId), eq(materialChunks.materialId, materialId))
    : and(eq(materialChunks.ownerId, ownerId), eq(materialChunks.subjectId, subjectId));
  return db.select({
    id: materialChunks.id,
    materialId: materialChunks.materialId,
    materialTitle: materials.title,
    pageNumber: materialChunks.pageNumber,
    chunkIndex: materialChunks.chunkIndex,
    content: materialChunks.content,
  }).from(materialChunks).innerJoin(materials, eq(materialChunks.materialId, materials.id)).where(scope).orderBy(materialChunks.materialId, materialChunks.chunkIndex).limit(240);
}

export async function getWorkspace(ownerId: number, subjectId: number) {
  const db = await requireDb();
  const subject = await getSubjectForOwner(ownerId, subjectId);
  if (!subject) return null;
  const [materialRows, setRows, conversationRows, reviewRows] = await Promise.all([
    db.select().from(materials).where(and(eq(materials.ownerId, ownerId), eq(materials.subjectId, subjectId))).orderBy(desc(materials.createdAt)),
    db.select().from(studySets).where(and(eq(studySets.ownerId, ownerId), eq(studySets.subjectId, subjectId))).orderBy(desc(studySets.createdAt)).limit(16),
    db.select().from(conversations).where(and(eq(conversations.ownerId, ownerId), eq(conversations.subjectId, subjectId))).orderBy(desc(conversations.updatedAt)).limit(8),
    db.select().from(flashcardReviews).where(eq(flashcardReviews.ownerId, ownerId)).orderBy(desc(flashcardReviews.createdAt)).limit(80),
  ]);
  const latestConversation = conversationRows[0];
  const messageRows = latestConversation
    ? await db.select().from(chatMessages).where(and(eq(chatMessages.ownerId, ownerId), eq(chatMessages.conversationId, latestConversation.id))).orderBy(chatMessages.createdAt).limit(50)
    : [];
  return { subject, materials: materialRows, studySets: setRows, conversations: conversationRows, messages: messageRows, reviews: reviewRows };
}

export async function getOrCreateConversation(ownerId: number, subjectId: number, conversationId: number | undefined, question: string) {
  const db = await requireDb();
  if (conversationId) {
    const existing = await db.select().from(conversations).where(and(eq(conversations.id, conversationId), eq(conversations.ownerId, ownerId), eq(conversations.subjectId, subjectId))).limit(1);
    if (existing[0]) return existing[0];
  }
  const result = await db.insert(conversations).values({ ownerId, subjectId, title: question.slice(0, 150) });
  const created = await db.select().from(conversations).where(eq(conversations.id, Number(result[0].insertId))).limit(1);
  return created[0]!;
}

export async function addChatMessage(ownerId: number, input: { conversationId: number; role: "user" | "assistant"; content: string; citations?: unknown }) {
  const db = await requireDb();
  await db.insert(chatMessages).values({ ownerId, conversationId: input.conversationId, role: input.role, content: input.content, citations: input.citations ?? null });
  await db.update(conversations).set({ updatedAt: new Date() }).where(and(eq(conversations.id, input.conversationId), eq(conversations.ownerId, ownerId)));
}

export async function saveStudySet(ownerId: number, input: { subjectId: number; materialId?: number; kind: "summary" | "flashcards" | "quiz"; title: string; payload: unknown }) {
  const db = await requireDb();
  const result = await db.insert(studySets).values({ ownerId, subjectId: input.subjectId, materialId: input.materialId ?? null, kind: input.kind, title: input.title, payload: input.payload });
  const rows = await db.select().from(studySets).where(and(eq(studySets.id, Number(result[0].insertId)), eq(studySets.ownerId, ownerId))).limit(1);
  return rows[0]!;
}

export async function getStudySetForOwner(ownerId: number, studySetId: number) {
  const db = await requireDb();
  const rows = await db.select().from(studySets).where(and(eq(studySets.id, studySetId), eq(studySets.ownerId, ownerId))).limit(1);
  return rows[0];
}

export async function addFlashcardReview(ownerId: number, studySetId: number, cardIndex: number, rating: "easy" | "hard" | "review_again") {
  const db = await requireDb();
  await db.insert(flashcardReviews).values({ ownerId, studySetId, cardIndex, rating });
}

export async function saveQuizAttempt(ownerId: number, input: { studySetId: number; subjectId: number; score: number; totalQuestions: number; answers: unknown; feedback: unknown }) {
  const db = await requireDb();
  const result = await db.insert(quizAttempts).values({ ...input, ownerId });
  const rows = await db.select().from(quizAttempts).where(and(eq(quizAttempts.id, Number(result[0].insertId)), eq(quizAttempts.ownerId, ownerId))).limit(1);
  return rows[0]!;
}

export async function recordStudySession(ownerId: number, subjectId: number, minutes: number, activityType: "reading" | "chat" | "flashcards" | "quiz") {
  const db = await requireDb();
  await db.insert(studySessions).values({ ownerId, subjectId, minutes, activityType });
}

export async function getDashboard(ownerId: number) {
  const db = await requireDb();
  const [subjectRows, materialRows, attemptRows, sessionRows, reviewRows] = await Promise.all([
    listSubjects(ownerId),
    db.select().from(materials).where(eq(materials.ownerId, ownerId)).orderBy(desc(materials.createdAt)).limit(5),
    db.select().from(quizAttempts).where(eq(quizAttempts.ownerId, ownerId)).orderBy(desc(quizAttempts.createdAt)).limit(12),
    db.select().from(studySessions).where(eq(studySessions.ownerId, ownerId)).orderBy(desc(studySessions.createdAt)).limit(50),
    db.select().from(flashcardReviews).where(eq(flashcardReviews.ownerId, ownerId)).orderBy(desc(flashcardReviews.createdAt)).limit(80),
  ]);
  const averageQuizScore = attemptRows.length ? Math.round(attemptRows.reduce((sum, attempt) => sum + (attempt.score / Math.max(attempt.totalQuestions, 1)) * 100, 0) / attemptRows.length) : 0;
  const studyMinutes = sessionRows.reduce((sum, session) => sum + session.minutes, 0);
  return { subjects: subjectRows, recentMaterials: materialRows, attempts: attemptRows, studyMinutes, averageQuizScore, reviewCount: reviewRows.length };
}
