import { index, int, json, mediumtext, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/** Core identity table used by Manus OAuth. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const subjects = mysqlTable("subjects", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description"),
  accent: varchar("accent", { length: 24 }).default("lavender").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("subjects_owner_updated_idx").on(table.ownerId, table.updatedAt)]);

export const materials = mysqlTable("materials", {
  id: int("id").autoincrement().primaryKey(),
  subjectId: int("subjectId").notNull().references(() => subjects.id, { onDelete: "cascade" }),
  ownerId: int("ownerId").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 180 }).notNull(),
  sourceType: mysqlEnum("sourceType", ["pdf", "text"]).notNull(),
  originalFileName: varchar("originalFileName", { length: 255 }),
  mimeType: varchar("mimeType", { length: 120 }),
  storageKey: varchar("storageKey", { length: 500 }),
  storageUrl: varchar("storageUrl", { length: 700 }),
  pageCount: int("pageCount"),
  extractedText: mediumtext("extractedText"),
  processingStatus: mysqlEnum("processingStatus", ["ready", "needs_attention"]).default("ready").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  index("materials_owner_created_idx").on(table.ownerId, table.createdAt),
  index("materials_subject_created_idx").on(table.subjectId, table.createdAt),
]);

export const materialChunks = mysqlTable("materialChunks", {
  id: int("id").autoincrement().primaryKey(),
  materialId: int("materialId").notNull().references(() => materials.id, { onDelete: "cascade" }),
  subjectId: int("subjectId").notNull().references(() => subjects.id, { onDelete: "cascade" }),
  ownerId: int("ownerId").notNull().references(() => users.id, { onDelete: "cascade" }),
  pageNumber: int("pageNumber"),
  chunkIndex: int("chunkIndex").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  index("chunks_subject_owner_idx").on(table.subjectId, table.ownerId),
  index("chunks_material_idx").on(table.materialId, table.chunkIndex),
]);

export const conversations = mysqlTable("conversations", {
  id: int("id").autoincrement().primaryKey(),
  subjectId: int("subjectId").notNull().references(() => subjects.id, { onDelete: "cascade" }),
  ownerId: int("ownerId").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 160 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("conversations_subject_owner_idx").on(table.subjectId, table.ownerId, table.updatedAt)]);

export const chatMessages = mysqlTable("chatMessages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  ownerId: int("ownerId").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: mysqlEnum("role", ["user", "assistant"]).notNull(),
  content: mediumtext("content").notNull(),
  citations: json("citations"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("messages_conversation_created_idx").on(table.conversationId, table.createdAt)]);

export const studySets = mysqlTable("studySets", {
  id: int("id").autoincrement().primaryKey(),
  subjectId: int("subjectId").notNull().references(() => subjects.id, { onDelete: "cascade" }),
  materialId: int("materialId").references(() => materials.id, { onDelete: "set null" }),
  ownerId: int("ownerId").notNull().references(() => users.id, { onDelete: "cascade" }),
  kind: mysqlEnum("kind", ["summary", "flashcards", "quiz"]).notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  payload: json("payload").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("study_sets_subject_owner_idx").on(table.subjectId, table.ownerId, table.createdAt)]);

export const flashcardReviews = mysqlTable("flashcardReviews", {
  id: int("id").autoincrement().primaryKey(),
  studySetId: int("studySetId").notNull().references(() => studySets.id, { onDelete: "cascade" }),
  ownerId: int("ownerId").notNull().references(() => users.id, { onDelete: "cascade" }),
  cardIndex: int("cardIndex").notNull(),
  rating: mysqlEnum("rating", ["easy", "hard", "review_again"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("flashcard_reviews_owner_created_idx").on(table.ownerId, table.createdAt)]);

export const quizAttempts = mysqlTable("quizAttempts", {
  id: int("id").autoincrement().primaryKey(),
  studySetId: int("studySetId").notNull().references(() => studySets.id, { onDelete: "cascade" }),
  subjectId: int("subjectId").notNull().references(() => subjects.id, { onDelete: "cascade" }),
  ownerId: int("ownerId").notNull().references(() => users.id, { onDelete: "cascade" }),
  score: int("score").notNull(),
  totalQuestions: int("totalQuestions").notNull(),
  answers: json("answers").notNull(),
  feedback: json("feedback").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("quiz_attempts_owner_created_idx").on(table.ownerId, table.createdAt)]);

export const studySessions = mysqlTable("studySessions", {
  id: int("id").autoincrement().primaryKey(),
  subjectId: int("subjectId").notNull().references(() => subjects.id, { onDelete: "cascade" }),
  ownerId: int("ownerId").notNull().references(() => users.id, { onDelete: "cascade" }),
  minutes: int("minutes").notNull(),
  activityType: mysqlEnum("activityType", ["reading", "chat", "flashcards", "quiz"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("study_sessions_owner_created_idx").on(table.ownerId, table.createdAt)]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
