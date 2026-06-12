CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`pin_id` text NOT NULL,
	`channel` text NOT NULL,
	`payload` text,
	`sent_at` text,
	`failed_at` text,
	`error` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`pin_id`) REFERENCES `pins`(`id`) ON UPDATE no action ON DELETE no action
);
