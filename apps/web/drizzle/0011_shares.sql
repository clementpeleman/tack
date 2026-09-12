CREATE TABLE `shares` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`slug` text NOT NULL,
	`target_url` text NOT NULL,
	`passcode_hash` text,
	`label` text,
	`expires_at` text NOT NULL,
	`revoked_at` text,
	`last_access_at` text,
	`created_by` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint
CREATE UNIQUE INDEX `shares_slug_unique` ON `shares` (`slug`);--> statement-breakpoint
CREATE INDEX `shares_project_id_idx` ON `shares` (`project_id`);
