CREATE TABLE `pins` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`url` text NOT NULL,
	`reviewer_id` text NOT NULL,
	`reviewer_name` text,
	`x_pct` real NOT NULL,
	`y_pct` real NOT NULL,
	`scroll_y` real DEFAULT 0 NOT NULL,
	`viewport_w` integer NOT NULL,
	`viewport_h` integer NOT NULL,
	`selector` text,
	`xpath` text,
	`tack_id` text,
	`element_text` text,
	`screenshot_path` text,
	`status` text DEFAULT 'open' NOT NULL,
	`browser` text,
	`os` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`resolved_at` text,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`preview_url` text NOT NULL,
	`project_key` text NOT NULL,
	`settings` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`archived_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `projects_project_key_unique` ON `projects` (`project_key`);--> statement-breakpoint
CREATE TABLE `replies` (
	`id` text PRIMARY KEY NOT NULL,
	`pin_id` text NOT NULL,
	`author_type` text NOT NULL,
	`author_id` text NOT NULL,
	`body` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`pin_id`) REFERENCES `pins`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`plan` text DEFAULT 'free' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);