CREATE TABLE `law_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`uid` text,
	`email` text NOT NULL,
	`username` text,
	`role` text NOT NULL,
	`status` text NOT NULL,
	`data` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `law_email` ON `law_accounts` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `law_username` ON `law_accounts` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `law_uid` ON `law_accounts` (`uid`);--> statement-breakpoint
CREATE TABLE `law_records` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`owner` text NOT NULL,
	`data` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `law_sessions` (
	`token` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`uid` text NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `law_wallets` (
	`owner` text PRIMARY KEY NOT NULL,
	`available` integer DEFAULT 0 NOT NULL,
	`reserved` integer DEFAULT 0 NOT NULL
);
