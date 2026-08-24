CREATE TABLE `examDates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subjectId` int NOT NULL,
	`ownerId` int NOT NULL,
	`title` varchar(160) NOT NULL,
	`occursAt` timestamp NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `examDates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `flashcardEdits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studySetId` int NOT NULL,
	`ownerId` int NOT NULL,
	`cardIndex` int NOT NULL,
	`front` text NOT NULL,
	`back` text NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `flashcardEdits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mistakeNotes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subjectId` int NOT NULL,
	`quizAttemptId` int,
	`ownerId` int NOT NULL,
	`prompt` text NOT NULL,
	`answer` text NOT NULL,
	`note` text,
	`citations` json,
	`resolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `mistakeNotes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `flashcardReviews` ADD `confidence` enum('low','steady','high') DEFAULT 'steady' NOT NULL;--> statement-breakpoint
ALTER TABLE `materials` ADD `folder` varchar(120);--> statement-breakpoint
ALTER TABLE `materials` ADD `tags` json;--> statement-breakpoint
ALTER TABLE `materials` ADD `version` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `materials` ADD `supersedesMaterialId` int;--> statement-breakpoint
ALTER TABLE `materials` ADD `archivedAt` timestamp;--> statement-breakpoint
ALTER TABLE `examDates` ADD CONSTRAINT `examDates_subjectId_subjects_id_fk` FOREIGN KEY (`subjectId`) REFERENCES `subjects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `examDates` ADD CONSTRAINT `examDates_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `flashcardEdits` ADD CONSTRAINT `flashcardEdits_studySetId_studySets_id_fk` FOREIGN KEY (`studySetId`) REFERENCES `studySets`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `flashcardEdits` ADD CONSTRAINT `flashcardEdits_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mistakeNotes` ADD CONSTRAINT `mistakeNotes_subjectId_subjects_id_fk` FOREIGN KEY (`subjectId`) REFERENCES `subjects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mistakeNotes` ADD CONSTRAINT `mistakeNotes_quizAttemptId_quizAttempts_id_fk` FOREIGN KEY (`quizAttemptId`) REFERENCES `quizAttempts`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mistakeNotes` ADD CONSTRAINT `mistakeNotes_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `exam_dates_owner_occurs_idx` ON `examDates` (`ownerId`,`occursAt`);--> statement-breakpoint
CREATE INDEX `flashcard_edits_set_card_idx` ON `flashcardEdits` (`studySetId`,`cardIndex`);--> statement-breakpoint
CREATE INDEX `mistake_notes_subject_owner_idx` ON `mistakeNotes` (`subjectId`,`ownerId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `materials_subject_archived_idx` ON `materials` (`subjectId`,`archivedAt`);