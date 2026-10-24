import {
  integer as int,
  serial,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  uniqueIndex,
  index,
  bigint,
  jsonb,
} from "drizzle-orm/pg-core";

export const marketplaceRole = pgEnum("marketplace_role", ["user", "admin"]);
export const productStatus = pgEnum("product_status", [
  "draft",
  "published",
  "archived",
]);
export const orderPaymentStatus = pgEnum("order_payment_status", [
  "pending",
  "approved",
  "rejected",
]);
export const orderStatus = pgEnum("order_status", [
  "payment_pending",
  "paid",
  "payment_rejected",
  "completed",
]);
export const paymentStatus = pgEnum("payment_status", [
  "pending",
  "approved",
  "rejected",
]);

// Better Auth identities are separate from the stable numeric marketplace IDs.
export const authUsers = pgTable("auth_users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("createdAt", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
export const authSessions = pgTable(
  "auth_sessions",
  {
    id: text("id").primaryKey(),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ipAddress"),
    userAgent: text("userAgent"),
    userId: text("userId")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
  },
  table => [index("auth_sessions_user_idx").on(table.userId)]
);
export const authAccounts = pgTable(
  "auth_accounts",
  {
    id: text("id").primaryKey(),
    accountId: text("accountId").notNull(),
    providerId: text("providerId").notNull(),
    userId: text("userId")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    accessToken: text("accessToken"),
    refreshToken: text("refreshToken"),
    idToken: text("idToken"),
    accessTokenExpiresAt: timestamp("accessTokenExpiresAt", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt", {
      withTimezone: true,
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  table => [
    uniqueIndex("auth_accounts_provider_account_idx").on(
      table.providerId,
      table.accountId
    ),
    index("auth_accounts_user_idx").on(table.userId),
  ]
);
export const authVerifications = pgTable(
  "auth_verifications",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  table => [index("auth_verifications_identifier_idx").on(table.identifier)]
);
export const authRateLimits = pgTable("auth_rate_limits", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: int("count").notNull(),
  lastRequest: bigint("lastRequest", { mode: "number" }).notNull(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  authUserId: text("authUserId")
    .unique()
    .references(() => authUsers.id, { onDelete: "restrict" }),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: marketplaceRole("role").default("user").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  lastSignedIn: timestamp("lastSignedIn", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull().unique(),
  slug: varchar("slug", { length: 140 }).notNull().unique(),
  description: text("description"),
  imageKey: varchar("imageKey", { length: 512 }),
  createdAt: timestamp("createdAt", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 220 }).notNull(),
  slug: varchar("slug", { length: 240 }).notNull().unique(),
  shortDescription: varchar("shortDescription", { length: 500 }),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  discountPrice: decimal("discountPrice", { precision: 10, scale: 2 }),
  categoryId: int("categoryId")
    .notNull()
    .references(() => categories.id, { onDelete: "restrict" }),
  thumbnailKey: varchar("thumbnailKey", { length: 512 }),
  digitalFileKey: varchar("digitalFileKey", { length: 512 }),
  fileType: varchar("fileType", { length: 40 }),
  fileSize: varchar("fileSize", { length: 40 }),
  version: varchar("version", { length: 40 }),
  license: varchar("license", { length: 180 }),
  tags: text("tags"),
  includes: text("includes"),
  status: productStatus("status").default("published").notNull(),
  featured: boolean("featured").default(false).notNull(),
  salesCount: int("salesCount").default(0).notNull(),
  rating: decimal("rating", { precision: 3, scale: 2 })
    .default("0.00")
    .notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: int("userId")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  customerName: varchar("customerName", { length: 160 }).notNull(),
  customerEmail: varchar("customerEmail", { length: 320 }).notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 10, scale: 2 })
    .default("0.00")
    .notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  paymentStatus: orderPaymentStatus("paymentStatus")
    .default("pending")
    .notNull(),
  orderStatus: orderStatus("orderStatus").default("payment_pending").notNull(),
  completedBy: int("completedBy").references(() => users.id, {
    onDelete: "restrict",
  }),
  completedAt: timestamp("completedAt", { withTimezone: true }),
  createdAt: timestamp("createdAt", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: int("orderId")
    .notNull()
    .references(() => orders.id, { onDelete: "restrict" }),
  productId: int("productId")
    .notNull()
    .references(() => products.id, { onDelete: "restrict" }),
  titleSnapshot: varchar("titleSnapshot", { length: 220 }).notNull(),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).notNull(),
  quantity: int("quantity").default(1).notNull(),
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  orderId: int("orderId")
    .notNull()
    .references(() => orders.id, { onDelete: "restrict" }),
  userId: int("userId")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  paymentMethod: varchar("paymentMethod", { length: 40 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  senderName: varchar("senderName", { length: 160 }).notNull(),
  senderPhone: varchar("senderPhone", { length: 60 }).notNull(),
  transactionReference: varchar("transactionReference", { length: 120 }),
  screenshotKey: varchar("screenshotKey", { length: 512 }).notNull(),
  status: paymentStatus("status").default("pending").notNull(),
  rejectionReason: text("rejectionReason"),
  verifiedBy: int("verifiedBy").references(() => users.id, {
    onDelete: "restrict",
  }),
  verifiedAt: timestamp("verifiedAt", { withTimezone: true }),
  createdAt: timestamp("createdAt", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const paymentMethods = pgTable("payment_methods", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 40 }).notNull().unique(),
  enabled: boolean("enabled").default(false).notNull(),
  accountName: varchar("accountName", { length: 160 }).notNull(),
  accountNumber: varchar("accountNumber", { length: 80 }).notNull(),
  instructions: text("instructions"),
  updatedAt: timestamp("updatedAt", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const downloads = pgTable("downloads", {
  id: serial("id").primaryKey(),
  userId: int("userId")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  productId: int("productId")
    .notNull()
    .references(() => products.id, { onDelete: "restrict" }),
  orderId: int("orderId")
    .notNull()
    .references(() => orders.id, { onDelete: "restrict" }),
  downloadCount: int("downloadCount").default(0).notNull(),
  lastDownloadedAt: timestamp("lastDownloadedAt", { withTimezone: true }),
});

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  userId: int("userId")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  productId: int("productId")
    .notNull()
    .references(() => products.id, { onDelete: "restrict" }),
  orderId: int("orderId")
    .notNull()
    .references(() => orders.id, { onDelete: "restrict" }),
  rating: int("rating").notNull(),
  body: text("body"),
  createdAt: timestamp("createdAt", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    title: varchar("title", { length: 180 }).notNull(),
    body: text("body").notNull(),
    kind: varchar("kind", { length: 40 }).notNull(),
    audience: varchar("audience", { length: 16 })
      .$type<"customer" | "admin">()
      .default("customer")
      .notNull(),
    eventKey: varchar("eventKey", { length: 160 }),
    orderId: int("orderId").references(() => orders.id, {
      onDelete: "restrict",
    }),
    paymentId: int("paymentId").references(() => payments.id, {
      onDelete: "restrict",
    }),
    data: jsonb("data").$type<Record<string, string | number>>(),
    read: boolean("read").default(false).notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  table => [
    uniqueIndex("notifications_recipient_event_idx").on(
      table.userId,
      table.audience,
      table.eventKey
    ),
    index("notifications_inbox_idx").on(
      table.userId,
      table.audience,
      table.createdAt,
      table.id
    ),
    index("notifications_unread_idx").on(
      table.userId,
      table.audience,
      table.read
    ),
  ]
);

export const notificationPreferences = pgTable(
  "notification_preferences",
  {
    id: serial("id").primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    audience: varchar("audience", { length: 16 })
      .$type<"customer" | "admin">()
      .notNull(),
    emailEnabled: boolean("emailEnabled").default(true).notNull(),
    locale: varchar("locale", { length: 8 }).default("en").notNull(),
  },
  table => [
    uniqueIndex("notification_preferences_user_site_idx").on(
      table.userId,
      table.audience
    ),
  ]
);

export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: serial("id").primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    audience: varchar("audience", { length: 16 })
      .$type<"customer" | "admin">()
      .notNull(),
    sessionId: text("sessionId")
      .notNull()
      .references(() => authSessions.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  table => [
    uniqueIndex("push_subscriptions_endpoint_idx").on(table.endpoint),
    index("push_subscriptions_user_site_idx").on(
      table.userId,
      table.audience,
      table.active
    ),
  ]
);

export const notificationDeliveries = pgTable(
  "notification_deliveries",
  {
    id: serial("id").primaryKey(),
    notificationId: int("notificationId")
      .notNull()
      .references(() => notifications.id, { onDelete: "cascade" }),
    channel: varchar("channel", { length: 8 })
      .$type<"email" | "push">()
      .notNull(),
    target: varchar("target", { length: 80 }).notNull(),
    subscriptionId: int("subscriptionId").references(
      () => pushSubscriptions.id,
      { onDelete: "set null" }
    ),
    locale: varchar("locale", { length: 8 }).default("en").notNull(),
    status: varchar("status", { length: 16 })
      .$type<
        "pending" | "processing" | "sent" | "failed" | "blocked" | "skipped"
      >()
      .default("pending")
      .notNull(),
    attempts: int("attempts").default(0).notNull(),
    nextAttemptAt: timestamp("nextAttemptAt", { withTimezone: true })
      .defaultNow()
      .notNull(),
    leaseToken: text("leaseToken"),
    leaseUntil: timestamp("leaseUntil", { withTimezone: true }),
    lastError: text("lastError"),
    sentAt: timestamp("sentAt", { withTimezone: true }),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  table => [
    uniqueIndex("notification_deliveries_target_idx").on(
      table.notificationId,
      table.channel,
      table.target
    ),
    index("notification_deliveries_queue_idx").on(
      table.status,
      table.nextAttemptAt
    ),
  ]
);

export const wishlists = pgTable(
  "wishlists",
  {
    id: serial("id").primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    productId: int("productId")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  table => ({
    uniqueUserProduct: uniqueIndex("wishlist_user_product_idx").on(
      table.userId,
      table.productId
    ),
  })
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Product = typeof products.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type Notification = typeof notifications.$inferSelect;

export const storeSettings = pgTable("store_settings", {
  id: int("id").primaryKey(),
  supportEmail: varchar("supportEmail", { length: 320 }).notNull(),
  telegramUsername: varchar("telegramUsername", { length: 32 }).notNull(),
  supportHours: text("supportHours").notNull().default(""),
  revision: int("revision").notNull().default(1),
  updatedAt: timestamp("updatedAt", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export const storeDocuments = pgTable(
  "store_documents",
  {
    id: serial("id").primaryKey(),
    key: varchar("key", { length: 40 }).notNull(),
    locale: varchar("locale", { length: 8 }).notNull(),
    content: jsonb("content")
      .$type<import("@marketplace/shared/store").StoreDocument>()
      .notNull(),
    revision: int("revision").notNull().default(1),
    updatedAt: timestamp("updatedAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  table => [
    uniqueIndex("store_documents_key_locale_idx").on(table.key, table.locale),
  ]
);
export const supportTickets = pgTable(
  "support_tickets",
  {
    id: serial("id").primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    orderId: int("orderId").references(() => orders.id, {
      onDelete: "restrict",
    }),
    subject: varchar("subject", { length: 180 }).notNull(),
    status: varchar("status", { length: 16 })
      .$type<"open" | "closed">()
      .notNull()
      .default("open"),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  table => [
    index("support_tickets_owner_idx").on(table.userId, table.updatedAt),
    index("support_tickets_status_idx").on(table.status, table.updatedAt),
  ]
);
export const supportMessages = pgTable(
  "support_messages",
  {
    id: serial("id").primaryKey(),
    ticketId: int("ticketId")
      .notNull()
      .references(() => supportTickets.id, { onDelete: "restrict" }),
    authorId: int("authorId")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    audience: varchar("audience", { length: 16 })
      .$type<"customer" | "admin">()
      .notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  table => [index("support_messages_ticket_idx").on(table.ticketId, table.id)]
);
export const activityLogs = pgTable(
  "activity_logs",
  {
    id: serial("id").primaryKey(),
    actorId: int("actorId")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    action: varchar("action", { length: 80 }).notNull(),
    target: varchar("target", { length: 180 }).notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  table => [index("activity_logs_created_idx").on(table.createdAt, table.id)]
);
export const orderNotes = pgTable(
  "order_notes",
  {
    id: serial("id").primaryKey(),
    orderId: int("orderId")
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    authorId: int("authorId")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    body: text("body").notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  table => [index("order_notes_order_idx").on(table.orderId, table.id)]
);
