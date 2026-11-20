CREATE TABLE IF NOT EXISTS `tenants` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`owner_email` text NOT NULL,
	`status` text NOT NULL DEFAULT 'active',
	`plan` text NOT NULL DEFAULT 'free',
	`domain` text,
	`db_driver` text NOT NULL,
	`db_url` text NOT NULL,
	`db_token` text,
	`lang` text NOT NULL DEFAULT 'tr',
	`country` text NOT NULL DEFAULT 'BR',
	`brand` text NOT NULL DEFAULT '{}',
	`created` integer NOT NULL,
	`updated` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `tenant_slug` ON `tenants` (`slug`);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `tenant_domain` ON `tenants` (`domain`) WHERE `domain` IS NOT NULL;
