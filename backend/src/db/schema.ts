import {
  pgTable,
  text,
  integer,
  timestamp,
  uuid,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export type OrderStatus = "pending" | "paid" | "failed";
export type UserRole = "customer" | "support" | "admin";
export type CheckoutSessionLine = {
  productId: string;
  quantity: number;
  unitPriceCents: number;
};

export const users = pgTable("users", {
  id: uuid().defaultRandom().primaryKey(),
  clerkUserId: text().notNull().unique(),
  email: text().notNull().unique(),
  displayName: text().notNull(),
  role: text().$type<UserRole>().notNull().default("customer"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const products = pgTable("products", {
  id: uuid().defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  category: text("category").notNull().default("General"),
  description: text("description").notNull().default(""),
  priceCents: integer("price_cents").notNull(),
  currency: text("currency").notNull().default("usd"),
  imageUrl: text("image_url"),
  // ImageKit fileId for deletes
  imageKitFileId: text("image_kit_file_id"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// cascade = “delete children when parent is deleted”; restrict = “don’t delete the parent if any child still points at it.”

export const checkoutSessions = pgTable("checkout_sessions", {
  id: uuid().defaultRandom().primaryKey(),
  userId: uuid()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  polarCheckoutId: text("polar_checkout_id").unique(),
  lines: jsonb("lines").$type<CheckoutSessionLine[]>().notNull(),
  totalCents: integer("total_cents").notNull(),
  currency: text("currency").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const orders = pgTable("orders", {
  id: uuid().defaultRandom().primaryKey(),
  userId: uuid()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: text("status").$type<OrderStatus>().notNull().default("pending"),
  polarCheckoutId: text("polar_checkout_id").unique(),
  polarOrderId: text("polar_order_id").unique(),
  totalCents: integer("total_cents").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const orderItems = pgTable("order_items", {
  id: uuid().defaultRandom().primaryKey(),
  orderId: uuid()
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: uuid()
    .notNull()
    .references(() => products.id, { onDelete: "restrict" }),
  quantity: integer("quantity").notNull(),
  unitPriceCents: integer("unit_price_cents").notNull(),
});

// Relations
// a user can have many orders
export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
}));

// a product can show up (have) on many order lines (items)
export const productsRelations = relations(products, ({ many }) => ({
  orderItems: many(orderItems),
}));

// an order belongs to a user only
export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  items: many(orderItems),
}));

// each order (line) item belongs to one order and one product
export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));
