CREATE TABLE "notification_deliveries" (
	"id" serial PRIMARY KEY NOT NULL,
	"notificationId" integer NOT NULL,
	"channel" varchar(8) NOT NULL,
	"target" varchar(80) NOT NULL,
	"subscriptionId" integer,
	"locale" varchar(8) DEFAULT 'en' NOT NULL,
	"status" varchar(16) DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"nextAttemptAt" timestamp with time zone DEFAULT now() NOT NULL,
	"leaseToken" text,
	"leaseUntil" timestamp with time zone,
	"lastError" text,
	"sentAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"audience" varchar(16) NOT NULL,
	"emailEnabled" boolean DEFAULT true NOT NULL,
	"locale" varchar(8) DEFAULT 'en' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"audience" varchar(16) NOT NULL,
	"sessionId" text NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "audience" varchar(16) DEFAULT 'customer' NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "eventKey" varchar(160);--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "orderId" integer;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "paymentId" integer;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "data" jsonb;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "completedBy" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "completedAt" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_notificationId_notifications_id_fk" FOREIGN KEY ("notificationId") REFERENCES "public"."notifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_subscriptionId_push_subscriptions_id_fk" FOREIGN KEY ("subscriptionId") REFERENCES "public"."push_subscriptions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_sessionId_auth_sessions_id_fk" FOREIGN KEY ("sessionId") REFERENCES "public"."auth_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "notification_deliveries_target_idx" ON "notification_deliveries" USING btree ("notificationId","channel","target");--> statement-breakpoint
CREATE INDEX "notification_deliveries_queue_idx" ON "notification_deliveries" USING btree ("status","nextAttemptAt");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_preferences_user_site_idx" ON "notification_preferences" USING btree ("userId","audience");--> statement-breakpoint
CREATE UNIQUE INDEX "push_subscriptions_endpoint_idx" ON "push_subscriptions" USING btree ("endpoint");--> statement-breakpoint
CREATE INDEX "push_subscriptions_user_site_idx" ON "push_subscriptions" USING btree ("userId","audience","active");--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_orderId_orders_id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_paymentId_payments_id_fk" FOREIGN KEY ("paymentId") REFERENCES "public"."payments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_completedBy_users_id_fk" FOREIGN KEY ("completedBy") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_recipient_event_idx" ON "notifications" USING btree ("userId","audience","eventKey");--> statement-breakpoint
CREATE INDEX "notifications_inbox_idx" ON "notifications" USING btree ("userId","audience","createdAt","id");--> statement-breakpoint
CREATE INDEX "notifications_unread_idx" ON "notifications" USING btree ("userId","audience","read");--> statement-breakpoint
-- The legacy evidence event was the only notification sent to administrators.
-- Preserve IDs, text, and read state, without generating any delivery jobs.
UPDATE "notifications" SET "audience" = 'admin'
WHERE "kind" = 'payment_submitted' AND "title" = 'New payment evidence';
