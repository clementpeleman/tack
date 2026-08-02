CREATE TABLE `cli_auth_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id_hash` text NOT NULL,
	`code_challenge` text NOT NULL,
	`redirect_port` integer,
	`user_code` text NOT NULL,
	`client_label` text NOT NULL,
	`approved_user_id` text,
	`auth_code_hash` text,
	`consumed_at` text,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`approved_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cli_auth_requests_request_id_hash_unique` ON `cli_auth_requests` (`request_id_hash`);--> statement-breakpoint
CREATE TABLE `owner_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`label` text NOT NULL,
	`source` text DEFAULT 'cli' NOT NULL,
	`scopes` text NOT NULL,
	`last_used_at` text,
	`expires_at` text NOT NULL,
	`revoked_at` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `owner_tokens_token_hash_unique` ON `owner_tokens` (`token_hash`);