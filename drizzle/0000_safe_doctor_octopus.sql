CREATE TABLE `items` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`owner` text NOT NULL,
	`data` text NOT NULL,
	`created` integer NOT NULL,
	`updated` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ledger` (
	`id` text PRIMARY KEY NOT NULL,
	`invoice` text NOT NULL,
	`customer` text NOT NULL,
	`advisor` text NOT NULL,
	`amount` integer NOT NULL,
	`commission` integer NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `one_sale_per_invoice` ON `ledger` (`invoice`);--> statement-breakpoint
CREATE TABLE `people` (
	`id` text PRIMARY KEY NOT NULL,
	`uid` text,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`manager` text NOT NULL,
	`permissions` text NOT NULL,
	`scope` text NOT NULL,
	`status` text NOT NULL,
	`advisor` text,
	`source` text,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `person_uid` ON `people` (`uid`);--> statement-breakpoint
CREATE UNIQUE INDEX `person_email` ON `people` (`email`);