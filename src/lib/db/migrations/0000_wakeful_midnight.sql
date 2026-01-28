CREATE TABLE `analyses` (
	`id` text PRIMARY KEY NOT NULL,
	`prospect_id` text NOT NULL,
	`https_valid` integer NOT NULL,
	`has_viewport` integer NOT NULL,
	`ttfb_ms` integer NOT NULL,
	`technologies` text NOT NULL,
	`obsolete_tech` text NOT NULL,
	`design_score` integer,
	`design_issues` text,
	`design_summary` text,
	`score` integer NOT NULL,
	`raw_data` text NOT NULL,
	`analyzed_at` integer NOT NULL,
	FOREIGN KEY (`prospect_id`) REFERENCES `prospects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `daily_limits` (
	`date` text PRIMARY KEY NOT NULL,
	`count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `email_drafts` (
	`id` text PRIMARY KEY NOT NULL,
	`prospect_id` text NOT NULL,
	`subject` text NOT NULL,
	`body` text NOT NULL,
	`generated_at` integer NOT NULL,
	FOREIGN KEY (`prospect_id`) REFERENCES `prospects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `email_queue` (
	`id` text PRIMARY KEY NOT NULL,
	`prospect_id` text NOT NULL,
	`draft_id` text NOT NULL,
	`scheduled_at` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`sent_at` integer,
	`error` text,
	FOREIGN KEY (`prospect_id`) REFERENCES `prospects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`draft_id`) REFERENCES `email_drafts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `prospects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`url` text,
	`city` text,
	`phone` text,
	`source` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL
);
