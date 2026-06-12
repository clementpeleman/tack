CREATE TABLE `ai_group_pins` (
	`id` text PRIMARY KEY NOT NULL,
	`group_id` text NOT NULL,
	`pin_id` text NOT NULL,
	`run_id` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `ai_groups`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`pin_id`) REFERENCES `pins`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`run_id`) REFERENCES `ai_runs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `ai_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`project_id` text NOT NULL,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`type` text NOT NULL,
	`priority` text NOT NULL,
	`implementation_brief` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `ai_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `ai_pin_insights` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`pin_id` text NOT NULL,
	`label` text NOT NULL,
	`priority` text NOT NULL,
	`summary` text NOT NULL,
	`ambiguous` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `ai_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`pin_id`) REFERENCES `pins`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `ai_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`status` text NOT NULL,
	`trigger_type` text DEFAULT 'manual' NOT NULL,
	`model` text NOT NULL,
	`pin_count` integer DEFAULT 0 NOT NULL,
	`input_tokens` integer DEFAULT 0 NOT NULL,
	`output_tokens` integer DEFAULT 0 NOT NULL,
	`estimated_cost_cents` real DEFAULT 0 NOT NULL,
	`actual_cost_cents` real DEFAULT 0 NOT NULL,
	`error` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`completed_at` text,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
