CREATE TABLE IF NOT EXISTS `auth_users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`hash` text,
	`salt` text,
	`verified` integer NOT NULL DEFAULT 0,
	`failed` integer NOT NULL DEFAULT 0,
	`locked_until` integer NOT NULL DEFAULT 0,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `auth_email` ON `auth_users` (`email`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `auth_sessions` (
	`token` text PRIMARY KEY NOT NULL,
	`user` text NOT NULL,
	`scope` text NOT NULL,
	`expires` integer NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `auth_tokens` (
	`token` text PRIMARY KEY NOT NULL,
	`user` text NOT NULL,
	`purpose` text NOT NULL,
	`expires` integer NOT NULL,
	`used` integer NOT NULL DEFAULT 0,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `items_kind_owner` ON `items` (`kind`,`owner`);
