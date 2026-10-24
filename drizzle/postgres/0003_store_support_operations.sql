CREATE TABLE "activity_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"actorId" integer NOT NULL,
	"action" varchar(80) NOT NULL,
	"target" varchar(180) NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"orderId" integer NOT NULL,
	"authorId" integer NOT NULL,
	"body" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(40) NOT NULL,
	"locale" varchar(8) NOT NULL,
	"content" jsonb NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_settings" (
	"id" integer PRIMARY KEY NOT NULL,
	"supportEmail" varchar(320) NOT NULL,
	"telegramUsername" varchar(32) NOT NULL,
	"supportHours" text DEFAULT '' NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticketId" integer NOT NULL,
	"authorId" integer NOT NULL,
	"audience" varchar(16) NOT NULL,
	"body" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"orderId" integer,
	"subject" varchar(180) NOT NULL,
	"status" varchar(16) DEFAULT 'open' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_actorId_users_id_fk" FOREIGN KEY ("actorId") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_notes" ADD CONSTRAINT "order_notes_orderId_orders_id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_notes" ADD CONSTRAINT "order_notes_authorId_users_id_fk" FOREIGN KEY ("authorId") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_ticketId_support_tickets_id_fk" FOREIGN KEY ("ticketId") REFERENCES "public"."support_tickets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_authorId_users_id_fk" FOREIGN KEY ("authorId") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_orderId_orders_id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_logs_created_idx" ON "activity_logs" USING btree ("createdAt","id");--> statement-breakpoint
CREATE INDEX "order_notes_order_idx" ON "order_notes" USING btree ("orderId","id");--> statement-breakpoint
CREATE UNIQUE INDEX "store_documents_key_locale_idx" ON "store_documents" USING btree ("key","locale");--> statement-breakpoint
CREATE INDEX "support_messages_ticket_idx" ON "support_messages" USING btree ("ticketId","id");--> statement-breakpoint
CREATE INDEX "support_tickets_owner_idx" ON "support_tickets" USING btree ("userId","updatedAt");--> statement-breakpoint
CREATE INDEX "support_tickets_status_idx" ON "support_tickets" USING btree ("status","updatedAt");