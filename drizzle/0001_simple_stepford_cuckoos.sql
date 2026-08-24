CREATE TABLE `chatMessages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`ownerId` int NOT NULL,
	`role` enum('user','assistant') NOT NULL,
	`content` mediumtext NOT NULL,
	`citations` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chatMessages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subjectId` int NOT NULL,
	`ownerId` int NOT NULL,
	`title` varchar(160) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `flashcardReviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studySetId` int NOT NULL,
	`ownerId` int NOT NULL,
	`cardIndex` int NOT NULL,
	`rating` enum('easy','hard','review_again') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `flashcardReviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `materialChunks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`materialId` int NOT NULL,
	`subjectId` int NOT NULL,
	`ownerId` int NOT NULL,
	`pageNumber` int,
	`chunkIndex` int NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `materialChunks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `materials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subjectId` int NOT NULL,
	`ownerId` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`sourceType` enum('pdf','text') NOT NULL,
	`originalFileName` varchar(255),
	`mimeType` varchar(120),
	`storageKey` varchar(500),
	`storageUrl` varchar(700),
	`pageCount` int,
	`extractedText` mediumtext,
	`processingStatus` enum('ready','needs_attention') NOT NULL DEFAULT 'ready',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `materials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quizAttempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studySetId` int NOT NULL,
	`subjectId` int NOT NULL,
	`ownerId` int NOT NULL,
	`score` int NOT NULL,
	`totalQuestions` int NOT NULL,
	`answers` json NOT NULL,
	`feedback` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quizAttempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `studySessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subjectId` int NOT NULL,
	`ownerId` int NOT NULL,
	`minutes` int NOT NULL,
	`activityType` enum('reading','chat','flashcards','quiz') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `studySessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `studySets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subjectId` int NOT NULL,
	`materialId` int,
	`ownerId` int NOT NULL,
	`kind` enum('summary','flashcards','quiz') NOT NULL,
	`title` varchar(180) NOT NULL,
	`payload` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `studySets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subjects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`description` text,
	`accent` varchar(24) NOT NULL DEFAULT 'lavender',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subjects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `chatMessages` ADD CONSTRAINT `chatMessages_conversationId_conversations_id_fk` FOREIGN KEY (`conversationId`) REFERENCES `conversations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chatMessages` ADD CONSTRAINT `chatMessages_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `conversations` ADD CONSTRAINT `conversations_subjectId_subjects_id_fk` FOREIGN KEY (`subjectId`) REFERENCES `subjects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `conversations` ADD CONSTRAINT `conversations_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `flashcardReviews` ADD CONSTRAINT `flashcardReviews_studySetId_studySets_id_fk` FOREIGN KEY (`studySetId`) REFERENCES `studySets`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `flashcardReviews` ADD CONSTRAINT `flashcardReviews_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `materialChunks` ADD CONSTRAINT `materialChunks_materialId_materials_id_fk` FOREIGN KEY (`materialId`) REFERENCES `materials`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `materialChunks` ADD CONSTRAINT `materialChunks_subjectId_subjects_id_fk` FOREIGN KEY (`subjectId`) REFERENCES `subjects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `materialChunks` ADD CONSTRAINT `materialChunks_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `materials` ADD CONSTRAINT `materials_subjectId_subjects_id_fk` FOREIGN KEY (`subjectId`) REFERENCES `subjects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `materials` ADD CONSTRAINT `materials_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quizAttempts` ADD CONSTRAINT `quizAttempts_studySetId_studySets_id_fk` FOREIGN KEY (`studySetId`) REFERENCES `studySets`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quizAttempts` ADD CONSTRAINT `quizAttempts_subjectId_subjects_id_fk` FOREIGN KEY (`subjectId`) REFERENCES `subjects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quizAttempts` ADD CONSTRAINT `quizAttempts_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `studySessions` ADD CONSTRAINT `studySessions_subjectId_subjects_id_fk` FOREIGN KEY (`subjectId`) REFERENCES `subjects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `studySessions` ADD CONSTRAINT `studySessions_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `studySets` ADD CONSTRAINT `studySets_subjectId_subjects_id_fk` FOREIGN KEY (`subjectId`) REFERENCES `subjects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `studySets` ADD CONSTRAINT `studySets_materialId_materials_id_fk` FOREIGN KEY (`materialId`) REFERENCES `materials`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `studySets` ADD CONSTRAINT `studySets_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subjects` ADD CONSTRAINT `subjects_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `messages_conversation_created_idx` ON `chatMessages` (`conversationId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `conversations_subject_owner_idx` ON `conversations` (`subjectId`,`ownerId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `flashcard_reviews_owner_created_idx` ON `flashcardReviews` (`ownerId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `chunks_subject_owner_idx` ON `materialChunks` (`subjectId`,`ownerId`);--> statement-breakpoint
CREATE INDEX `chunks_material_idx` ON `materialChunks` (`materialId`,`chunkIndex`);--> statement-breakpoint
CREATE INDEX `materials_owner_created_idx` ON `materials` (`ownerId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `materials_subject_created_idx` ON `materials` (`subjectId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `quiz_attempts_owner_created_idx` ON `quizAttempts` (`ownerId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `study_sessions_owner_created_idx` ON `studySessions` (`ownerId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `study_sets_subject_owner_idx` ON `studySets` (`subjectId`,`ownerId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `subjects_owner_updated_idx` ON `subjects` (`ownerId`,`updatedAt`);