CREATE TABLE `flashcardSchedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studySetId` int NOT NULL,
	`ownerId` int NOT NULL,
	`cardIndex` int NOT NULL,
	`repetition` int NOT NULL DEFAULT 0,
	`intervalDays` int NOT NULL DEFAULT 0,
	`easeFactor` int NOT NULL DEFAULT 250,
	`dueAt` timestamp NOT NULL DEFAULT (now()),
	`lastReviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `flashcardSchedules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `flashcardSchedules` ADD CONSTRAINT `flashcardSchedules_studySetId_studySets_id_fk` FOREIGN KEY (`studySetId`) REFERENCES `studySets`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `flashcardSchedules` ADD CONSTRAINT `flashcardSchedules_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `flashcard_schedules_owner_due_idx` ON `flashcardSchedules` (`ownerId`,`dueAt`);--> statement-breakpoint
CREATE INDEX `flashcard_schedules_set_card_idx` ON `flashcardSchedules` (`studySetId`,`cardIndex`);