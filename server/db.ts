import { and, desc, eq, gte, isNull, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  chatMessages,
  conversations,
  examDates,
  flashcardEdits,
  flashcardReviews,
  flashcardSchedules,
  InsertUser,
  materialChunks,
  materials,
  mistakeNotes,
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

export async function updateMaterialMetadata(ownerId: number, materialId: number, input: { title?: string; folder?: string | null; tags?: string[] }) {
  const db = await requireDb();
  const set: Record<string, unknown> = {};
  if (input.title !== undefined) set.title = input.title;
  if (input.folder !== undefined) set.folder = input.folder?.trim() || null;
  if (input.tags !== undefined) set.tags = input.tags.filter(Boolean).slice(0, 12);
  if (!Object.keys(set).length) return getMaterialForOwner(ownerId, materialId);
  await db.update(materials).set(set).where(and(eq(materials.id, materialId), eq(materials.ownerId, ownerId)));
  return getMaterialForOwner(ownerId, materialId);
}

export async function replaceMaterialExtraction(ownerId: number, materialId: number, input: { pageCount: number; extractedText: string; processingStatus: "ready" | "needs_attention"; chunks: Array<{ pageNumber: number | null; chunkIndex: number; content: string }> }) {
  const db = await requireDb();
  const material = await getMaterialForOwner(ownerId, materialId);
  if (!material) return undefined;
  await db.delete(materialChunks).where(and(eq(materialChunks.materialId, materialId), eq(materialChunks.ownerId, ownerId)));
  if (input.chunks.length) {
    await db.insert(materialChunks).values(input.chunks.map(chunk => ({ materialId, subjectId: material.subjectId, ownerId, pageNumber: chunk.pageNumber, chunkIndex: chunk.chunkIndex, content: chunk.content })));
  }
  await db.update(materials).set({ pageCount: input.pageCount, extractedText: input.extractedText, processingStatus: input.processingStatus }).where(and(eq(materials.id, materialId), eq(materials.ownerId, ownerId)));
  return getMaterialForOwner(ownerId, materialId);
}

export async function archiveMaterial(ownerId: number, materialId: number, archived: boolean) {
  const db = await requireDb();
  await db.update(materials).set({ archivedAt: archived ? new Date() : null }).where(and(eq(materials.id, materialId), eq(materials.ownerId, ownerId)));
  return getMaterialForOwner(ownerId, materialId);
}

export async function deleteMaterial(ownerId: number, materialId: number) {
  const db = await requireDb();
  const existing = await getMaterialForOwner(ownerId, materialId);
  if (!existing) return false;
  await db.delete(materials).where(and(eq(materials.id, materialId), eq(materials.ownerId, ownerId)));
  return true;
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
  folder?: string | null;
  tags?: string[];
  supersedesMaterialId?: number | null;
  version?: number;
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
    folder: input.folder?.trim() || null,
    tags: input.tags?.filter(Boolean).slice(0, 12) || null,
    supersedesMaterialId: input.supersedesMaterialId ?? null,
    version: input.version ?? 1,
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
  const [materialRows, archivedMaterialRows, setRows, conversationRows, reviewRows, editRows, examRows, mistakeRows] = await Promise.all([
    db.select().from(materials).where(and(eq(materials.ownerId, ownerId), eq(materials.subjectId, subjectId), isNull(materials.archivedAt))).orderBy(desc(materials.createdAt)),
    db.select().from(materials).where(and(eq(materials.ownerId, ownerId), eq(materials.subjectId, subjectId))).orderBy(desc(materials.createdAt)),
    db.select().from(studySets).where(and(eq(studySets.ownerId, ownerId), eq(studySets.subjectId, subjectId))).orderBy(desc(studySets.createdAt)).limit(16),
    db.select().from(conversations).where(and(eq(conversations.ownerId, ownerId), eq(conversations.subjectId, subjectId))).orderBy(desc(conversations.updatedAt)).limit(8),
    db.select().from(flashcardReviews).where(eq(flashcardReviews.ownerId, ownerId)).orderBy(desc(flashcardReviews.createdAt)).limit(80),
    db.select().from(flashcardEdits).where(eq(flashcardEdits.ownerId, ownerId)).orderBy(desc(flashcardEdits.updatedAt)).limit(160),
    db.select().from(examDates).where(and(eq(examDates.ownerId, ownerId), eq(examDates.subjectId, subjectId))).orderBy(examDates.occursAt).limit(12),
    db.select().from(mistakeNotes).where(and(eq(mistakeNotes.ownerId, ownerId), eq(mistakeNotes.subjectId, subjectId))).orderBy(desc(mistakeNotes.createdAt)).limit(48),
  ]);
  const latestConversation = conversationRows[0];
  const messageRows = latestConversation
    ? await db.select().from(chatMessages).where(and(eq(chatMessages.ownerId, ownerId), eq(chatMessages.conversationId, latestConversation.id))).orderBy(chatMessages.createdAt).limit(50)
    : [];
  return { subject, materials: materialRows, archivedMaterials: archivedMaterialRows.filter(material => material.archivedAt), studySets: setRows, conversations: conversationRows, messages: messageRows, reviews: reviewRows, cardEdits: editRows, exams: examRows, mistakes: mistakeRows };
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

export async function addFlashcardReview(ownerId: number, studySetId: number, cardIndex: number, rating: "easy" | "hard" | "review_again", confidence: "low" | "steady" | "high" = "steady") {
  const db = await requireDb();
  await db.insert(flashcardReviews).values({ ownerId, studySetId, cardIndex, rating, confidence });
}

export async function saveFlashcardEdit(ownerId: number, studySetId: number, cardIndex: number, front: string, back: string) {
  const db = await requireDb();
  const existing = await db.select().from(flashcardEdits).where(and(eq(flashcardEdits.ownerId, ownerId), eq(flashcardEdits.studySetId, studySetId), eq(flashcardEdits.cardIndex, cardIndex))).limit(1);
  if (existing[0]) {
    await db.update(flashcardEdits).set({ front, back }).where(eq(flashcardEdits.id, existing[0].id));
    return { ...existing[0], front, back };
  }
  const result = await db.insert(flashcardEdits).values({ ownerId, studySetId, cardIndex, front, back });
  const rows = await db.select().from(flashcardEdits).where(eq(flashcardEdits.id, Number(result[0].insertId))).limit(1);
  return rows[0]!;
}

export async function getFlashcardSchedule(ownerId: number, studySetId: number, cardIndex: number) {
  const db = await requireDb();
  const rows = await db.select().from(flashcardSchedules).where(and(eq(flashcardSchedules.ownerId, ownerId), eq(flashcardSchedules.studySetId, studySetId), eq(flashcardSchedules.cardIndex, cardIndex))).limit(1);
  return rows[0];
}

export async function saveFlashcardSchedule(ownerId: number, studySetId: number, cardIndex: number, schedule: { repetition: number; intervalDays: number; easeFactor: number; dueAt: Date; lastReviewedAt: Date }) {
  const db = await requireDb();
  const existing = await getFlashcardSchedule(ownerId, studySetId, cardIndex);
  if (existing) {
    await db.update(flashcardSchedules).set(schedule).where(and(eq(flashcardSchedules.id, existing.id), eq(flashcardSchedules.ownerId, ownerId)));
    return { ...existing, ...schedule };
  }
  const result = await db.insert(flashcardSchedules).values({ ownerId, studySetId, cardIndex, ...schedule });
  const rows = await db.select().from(flashcardSchedules).where(eq(flashcardSchedules.id, Number(result[0].insertId))).limit(1);
  return rows[0]!;
}

export async function seedFlashcardSchedules(ownerId: number, studySetId: number, cardCount: number) {
  const db = await requireDb();
  if (cardCount < 1) return;
  const existing = await db.select({ cardIndex: flashcardSchedules.cardIndex }).from(flashcardSchedules).where(and(eq(flashcardSchedules.ownerId, ownerId), eq(flashcardSchedules.studySetId, studySetId)));
  const existingIndexes = new Set(existing.map(row => row.cardIndex));
  const missing = Array.from({ length: cardCount }, (_, cardIndex) => cardIndex).filter(cardIndex => !existingIndexes.has(cardIndex));
  if (missing.length) await db.insert(flashcardSchedules).values(missing.map(cardIndex => ({ ownerId, studySetId, cardIndex, dueAt: new Date() })));
}

export async function seedExistingFlashcardSchedules(ownerId: number, subjectId?: number) {
  const db = await requireDb();
  const scope = subjectId
    ? and(eq(studySets.ownerId, ownerId), eq(studySets.kind, "flashcards"), eq(studySets.subjectId, subjectId))
    : and(eq(studySets.ownerId, ownerId), eq(studySets.kind, "flashcards"));
  const sets = await db.select({ id: studySets.id, payload: studySets.payload }).from(studySets).where(scope);
  for (const set of sets) {
    const payload = set.payload as { cards?: unknown[] };
    if (Array.isArray(payload.cards)) await seedFlashcardSchedules(ownerId, set.id, payload.cards.length);
  }
}

export async function getDueFlashcards(ownerId: number, subjectId?: number) {
  const db = await requireDb();
  const scope = subjectId
    ? and(eq(flashcardSchedules.ownerId, ownerId), eq(studySets.subjectId, subjectId), lte(flashcardSchedules.dueAt, new Date()))
    : and(eq(flashcardSchedules.ownerId, ownerId), lte(flashcardSchedules.dueAt, new Date()));
  return db.select({ schedule: flashcardSchedules, studySet: studySets, subject: subjects }).from(flashcardSchedules).innerJoin(studySets, eq(flashcardSchedules.studySetId, studySets.id)).innerJoin(subjects, eq(studySets.subjectId, subjects.id)).where(scope).orderBy(flashcardSchedules.dueAt).limit(48);
}

export async function saveQuizAttempt(ownerId: number, input: { studySetId: number; subjectId: number; score: number; totalQuestions: number; answers: unknown; feedback: unknown }) {
  const db = await requireDb();
  const result = await db.insert(quizAttempts).values({ ...input, ownerId });
  const rows = await db.select().from(quizAttempts).where(and(eq(quizAttempts.id, Number(result[0].insertId)), eq(quizAttempts.ownerId, ownerId))).limit(1);
  return rows[0]!;
}

export async function saveMistakes(ownerId: number, input: { subjectId: number; quizAttemptId: number; items: Array<{ prompt: string; answer: string; citations: unknown }> }) {
  const db = await requireDb();
  if (!input.items.length) return [];
  await db.insert(mistakeNotes).values(input.items.map(item => ({ ownerId, subjectId: input.subjectId, quizAttemptId: input.quizAttemptId, prompt: item.prompt, answer: item.answer, citations: item.citations })));
  return db.select().from(mistakeNotes).where(and(eq(mistakeNotes.ownerId, ownerId), eq(mistakeNotes.quizAttemptId, input.quizAttemptId))).orderBy(desc(mistakeNotes.createdAt));
}

export async function resolveMistake(ownerId: number, mistakeId: number, resolved: boolean) {
  const db = await requireDb();
  await db.update(mistakeNotes).set({ resolvedAt: resolved ? new Date() : null }).where(and(eq(mistakeNotes.id, mistakeId), eq(mistakeNotes.ownerId, ownerId)));
  const rows = await db.select().from(mistakeNotes).where(and(eq(mistakeNotes.id, mistakeId), eq(mistakeNotes.ownerId, ownerId))).limit(1);
  return rows[0];
}

export async function createExamDate(ownerId: number, input: { subjectId: number; title: string; occursAt: Date; notes?: string }) {
  const db = await requireDb();
  const result = await db.insert(examDates).values({ ownerId, subjectId: input.subjectId, title: input.title, occursAt: input.occursAt, notes: input.notes || null });
  const rows = await db.select().from(examDates).where(and(eq(examDates.id, Number(result[0].insertId)), eq(examDates.ownerId, ownerId))).limit(1);
  return rows[0]!;
}

export async function deleteExamDate(ownerId: number, examId: number) {
  const db = await requireDb();
  const result = await db.delete(examDates).where(and(eq(examDates.id, examId), eq(examDates.ownerId, ownerId)));
  return Number(result[0].affectedRows || 0) > 0;
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

export function calculateWeeklyDigest(input: {
  subjects: Array<{ id: number; name: string }>;
  sessions: Array<{ subjectId: number; minutes: number }>;
  attempts: Array<{ subjectId: number; score: number; totalQuestions: number }>;
  reviews: Array<{ subjectId: number }>;
  dueCards: Array<{ studySet: { subjectId: number } }>;
}) {
  const subjects = input.subjects.map(subject => {
    const subjectSessions = input.sessions.filter(session => session.subjectId === subject.id);
    const subjectAttempts = input.attempts.filter(attempt => attempt.subjectId === subject.id);
    const minutes = subjectSessions.reduce((sum, session) => sum + session.minutes, 0);
    const quizAverage = subjectAttempts.length ? Math.round(subjectAttempts.reduce((sum, attempt) => sum + (attempt.score / Math.max(1, attempt.totalQuestions)) * 100, 0) / subjectAttempts.length) : null;
    return { subjectId: subject.id, subjectName: subject.name, minutes, quizzesTaken: subjectAttempts.length, quizAverage, cardsReviewed: input.reviews.filter(review => review.subjectId === subject.id).length, dueCards: input.dueCards.filter(card => card.studySet.subjectId === subject.id).length };
  });
  return { totalMinutes: input.sessions.reduce((sum, session) => sum + session.minutes, 0), quizzesTaken: input.attempts.length, cardsReviewed: input.reviews.length, dueCards: input.dueCards.length, subjects };
}

export async function getWeeklyDigest(ownerId: number) {
  const db = await requireDb();
  const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  await seedExistingFlashcardSchedules(ownerId);
  const [subjectRows, sessions, attempts, reviews, dueCards] = await Promise.all([
    listSubjects(ownerId),
    db.select().from(studySessions).where(and(eq(studySessions.ownerId, ownerId), gte(studySessions.createdAt, weekStart))),
    db.select().from(quizAttempts).where(and(eq(quizAttempts.ownerId, ownerId), gte(quizAttempts.createdAt, weekStart))),
    db.select({ review: flashcardReviews, subjectId: studySets.subjectId }).from(flashcardReviews).innerJoin(studySets, eq(flashcardReviews.studySetId, studySets.id)).where(and(eq(flashcardReviews.ownerId, ownerId), gte(flashcardReviews.createdAt, weekStart))),
    getDueFlashcards(ownerId),
  ]);
  return { weekStart, ...calculateWeeklyDigest({ subjects: subjectRows, sessions, attempts, reviews, dueCards }) };
}

function collectCitationMaterialIds(value: unknown, result = new Set<number>()): Set<number> {
  if (Array.isArray(value)) value.forEach(item => collectCitationMaterialIds(item, result));
  else if (value && typeof value === "object") {
    const item = value as Record<string, unknown>;
    if (typeof item.materialId === "number") result.add(item.materialId);
    Object.values(item).forEach(child => collectCitationMaterialIds(child, result));
  }
  return result;
}

export function calculateSuggestedDailyMinutes(dueCards: number, unresolvedMistakes: number, daysToExam: number | null) {
  if (daysToExam === null) return null;
  return Math.max(15, Math.min(90, Math.ceil((dueCards * 4 + unresolvedMistakes * 8) / Math.max(1, daysToExam))));
}

export function calculateMaterialReviewState(materialId: number, hasFlashcards: boolean, dueMaterialIds: Set<number>, reviewedMaterialIds: Set<number>) {
  if (!hasFlashcards) return "Not started";
  if (dueMaterialIds.has(materialId)) return "Due practice";
  return reviewedMaterialIds.has(materialId) ? "Reviewed" : "Ready to review";
}

export async function getSubjectInsights(ownerId: number, subjectId: number) {
  const db = await requireDb();
  await seedExistingFlashcardSchedules(ownerId, subjectId);
  const [materialRows, setRows, dueCards, exams, mistakes, reviewRows] = await Promise.all([
    db.select().from(materials).where(and(eq(materials.ownerId, ownerId), eq(materials.subjectId, subjectId))).orderBy(desc(materials.createdAt)),
    db.select().from(studySets).where(and(eq(studySets.ownerId, ownerId), eq(studySets.subjectId, subjectId))),
    getDueFlashcards(ownerId, subjectId),
    db.select().from(examDates).where(and(eq(examDates.ownerId, ownerId), eq(examDates.subjectId, subjectId))).orderBy(examDates.occursAt),
    db.select().from(mistakeNotes).where(and(eq(mistakeNotes.ownerId, ownerId), eq(mistakeNotes.subjectId, subjectId))).orderBy(desc(mistakeNotes.createdAt)),
    db.select({ studySetId: flashcardReviews.studySetId }).from(flashcardReviews).innerJoin(studySets, eq(flashcardReviews.studySetId, studySets.id)).where(and(eq(flashcardReviews.ownerId, ownerId), eq(studySets.subjectId, subjectId))),
  ]);
  const byKind = new Map<string, Set<number>>();
  setRows.forEach(set => {
    const citedMaterialIds = byKind.get(set.kind) || new Set<number>();
    collectCitationMaterialIds(set.payload).forEach(materialId => citedMaterialIds.add(materialId));
    byKind.set(set.kind, citedMaterialIds);
  });
  const flashcardSets = new Map(setRows.filter(set => set.kind === "flashcards").map(set => [set.id, collectCitationMaterialIds(set.payload)]));
  const dueMaterialIds = new Set<number>();
  dueCards.forEach(({ studySet }) => flashcardSets.get(studySet.id)?.forEach(materialId => dueMaterialIds.add(materialId)));
  const reviewedMaterialIds = new Set<number>();
  reviewRows.forEach(review => flashcardSets.get(review.studySetId)?.forEach(materialId => reviewedMaterialIds.add(materialId)));
  const coverage = materialRows.map(material => {
    const flashcards = byKind.get("flashcards")?.has(material.id) || false;
    return { materialId: material.id, title: material.title, archived: Boolean(material.archivedAt), summary: byKind.get("summary")?.has(material.id) || false, flashcards, quiz: byKind.get("quiz")?.has(material.id) || false, reviewState: calculateMaterialReviewState(material.id, flashcards, dueMaterialIds, reviewedMaterialIds), version: material.version };
  });
  const upcomingExam = exams.find(exam => exam.occursAt.getTime() >= Date.now()) || null;
  const daysToExam = upcomingExam ? Math.max(0, Math.ceil((upcomingExam.occursAt.getTime() - Date.now()) / 86_400_000)) : null;
  const unresolvedMistakes = mistakes.filter(note => !note.resolvedAt).length;
  return { coverage, dueCards: dueCards.length, unresolvedMistakes, mistakes, exams, upcomingExam, daysToExam, suggestedDailyMinutes: calculateSuggestedDailyMinutes(dueCards.length, unresolvedMistakes, daysToExam) };
}
