ALTER TABLE "order_items" ADD COLUMN "payableUnitPrice" numeric(20, 2);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "currency" varchar(3) DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "exchangeRate" numeric(20, 8) DEFAULT '1' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payableTotal" numeric(20, 2);--> statement-breakpoint
ALTER TABLE "payment_methods" ADD COLUMN "currency" varchar(3) DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "currency" varchar(3) DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "payableAmount" numeric(20, 2);--> statement-breakpoint
ALTER TABLE "store_settings" ADD COLUMN "usdRate" numeric(20, 8);--> statement-breakpoint
ALTER TABLE "store_settings" ADD COLUMN "sgdRate" numeric(20, 8);--> statement-breakpoint
ALTER TABLE "store_settings" ADD COLUMN "mmkRate" numeric(20, 8);