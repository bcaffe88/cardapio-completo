import { pgTable, serial, varchar, timestamp, pgEnum, text, decimal, boolean, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const roleEnum = pgEnum('role', ['admin', 'staff', 'delivery', 'client']);
export const deliveryTypeEnum = pgEnum('deliveryType', ['delivery', 'pickup']);
export const paymentMethodEnum = pgEnum('paymentMethod', ['cash', 'card', 'pix', 'online']);
export const paymentStatusEnum = pgEnum("paymentStatus", ["pending", "paid", "failed", "refunded"]);
export const orderStatusEnum = pgEnum("status", ["pending", "confirmed", "kitchen_accepted", "preparing", "ready", "out_for_delivery", "delivered", "cancelled"]);
export const vehicleTypeEnum = pgEnum('vehicleType', ['motorcycle', 'car', 'bicycle']);

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  openId: varchar('openId', { length: 255 }).unique(),
  name: varchar('name', { length: 255 }),
  email: varchar('email', { length: 255 }),
  loginMethod: varchar('loginMethod', { length: 50 }),
  lastSignedIn: timestamp('lastSignedIn'),
  role: roleEnum('role').default('client'),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt'),
});

export const restaurantClients = pgTable('restaurant_clients', {
  id: serial('id').primaryKey(),
  userId: integer('userId').references(() => users.id),
  businessName: varchar('businessName', { length: 255 }),
  ownerName: varchar('ownerName', { length: 255 }),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  commissionRate: integer('commissionRate').default(0), // in basis points (e.g., 500 = 5%)
  isActive: boolean('isActive').default(true),
});

export const restaurantSettings = pgTable('restaurant_settings', {
  id: serial('id').primaryKey(),
  restaurantId: integer('restaurantId').references(() => restaurantClients.id),
  stripePublishableKey: varchar('stripePublishableKey', { length: 255 }),
  stripeSecretKey: varchar('stripeSecretKey', { length: 255 }),
  businessName: varchar('businessName', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  address: varchar('address', { length: 512 }),
  deliveryFee: decimal('deliveryFee', { precision: 10, scale: 2 }).default('0.00'),
  minimumOrder: decimal('minimumOrder', { precision: 10, scale: 2 }).default('0.00'),
  estimatedDeliveryTime: varchar('estimatedDeliveryTime', { length: 50 }),
  useOwnDrivers: boolean('useOwnDrivers').default(true),
  usePlatformDrivers: boolean('usePlatformDrivers').default(false),
  allowPickup: boolean('allowPickup').default(true),
});

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  restaurantId: integer('restaurantId').references(() => restaurantClients.id),
  name: varchar('name', { length: 255 }),
  displayOrder: integer('displayOrder').default(0),
  isActive: boolean('isActive').default(true),
});

export const products = pgTable('products', {
    id: serial('id').primaryKey(),
    restaurantId: integer('restaurantId').references(() => restaurantClients.id),
    categoryId: integer('categoryId').references(() => categories.id),
    name: varchar('name', { length: 255 }),
    description: text('description'),
    price: decimal('price', { precision: 10, scale: 2 }),
    imageUrl: varchar('imageUrl', { length: 1024 }),
    isAvailable: boolean('isAvailable').default(true),
    displayOrder: integer('displayOrder').default(0),
});

export const productOptions = pgTable('product_options', {
    id: serial('id').primaryKey(),
    productId: integer('productId').references(() => products.id),
    name: varchar('name', { length: 255 }),
    isRequired: boolean('isRequired').default(false),
    minSelection: integer('minSelection').default(1),
    maxSelection: integer('maxSelection').default(1),
    displayOrder: integer('displayOrder').default(0),
});

export const productOptionValues = pgTable('product_option_values', {
    id: serial('id').primaryKey(),
    optionId: integer('optionId').references(() => productOptions.id),
    value: varchar('value', { length: 255 }),
    priceAdjustment: decimal('priceAdjustment', { precision: 10, scale: 2 }).default('0.00'),
    displayOrder: integer('displayOrder').default(0),
});

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  restaurantId: integer('restaurantId').references(() => restaurantClients.id),
  orderNumber: varchar('orderNumber', { length: 50 }).unique(),
  customerName: varchar('customerName', { length: 255 }),
  customerPhone: varchar('customerPhone', { length: 50 }),
  customerEmail: varchar('customerEmail', { length: 255 }),
  deliveryType: pgEnum('deliveryType', ['delivery', 'pickup'])('deliveryType'),
  deliveryAddress: text('deliveryAddress'),
  deliveryLatitude: varchar('deliveryLatitude', { length: 50 }),
  deliveryLongitude: varchar('deliveryLongitude', { length: 50 }),
  addressReference: text('addressReference'),
  orderNotes: text('orderNotes'),
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }),
  deliveryFee: decimal('deliveryFee', { precision: 10, scale: 2 }),
  total: decimal('total', { precision: 10, scale: 2 }),
  paymentMethod: pgEnum('paymentMethod', ['cash', 'card', 'pix', 'online'])('paymentMethod'),
  paymentStatus: pgEnum("paymentStatus", ["pending", "paid", "failed", "refunded"])("paymentStatus").default("pending").notNull(),
  status: pgEnum("status", ["pending", "confirmed", "kitchen_accepted", "preparing", "ready", "out_for_delivery", "delivered", "cancelled"])("status").default("pending").notNull(),
  source: varchar("source", { length: 50 }).default("website").notNull(),
  externalOrderId: varchar("externalOrderId", { length: 255 }),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  stripePixQrCode: text("stripePixQrCode"),
  stripePixCopyPaste: text("stripePixCopyPaste"),
  driverId: integer("driverId").references(() => users.id),
  assignedAt: timestamp("assignedAt"),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt'),
});

export const orderItems = pgTable('order_items', {
    id: serial('id').primaryKey(),
    orderId: integer('orderId').references(() => orders.id),
    productId: integer('productId').references(() => products.id),
    productName: varchar('productName', { length: 255 }),
    quantity: integer('quantity'),
    unitPrice: decimal('unitPrice', { precision: 10, scale: 2 }),
    totalPrice: decimal('totalPrice', { precision: 10, scale: 2 }),
    customizations: text('customizations'),
    specialInstructions: text('specialInstructions'),
});

export const deliveryDrivers = pgTable('delivery_drivers', {
    id: serial('id').primaryKey(),
    userId: integer('userId').references(() => users.id),
    fullName: varchar('fullName', { length: 255 }),
    phone: varchar('phone', { length: 50 }),
    vehicleType: pgEnum('vehicleType', ['motorcycle', 'car', 'bicycle'])('vehicleType'),
    vehiclePlate: varchar('vehiclePlate', { length: 20 }),
    isActive: boolean('isActive').default(true),
    isAvailable: boolean('isAvailable').default(true),
    currentLatitude: varchar('currentLatitude', { length: 50 }),
    currentLongitude: varchar('currentLongitude', { length: 50 }),
    lastLocationUpdate: timestamp('lastLocationUpdate'),
});

export const deliveryNotifications = pgTable('delivery_notifications', {
    id: serial('id').primaryKey(),
    driverId: integer('driverId').references(() => deliveryDrivers.id),
    orderId: integer('orderId').references(() => orders.id),
    message: text('message'),
    isRead: boolean('isRead').default(false),
    createdAt: timestamp('createdAt').defaultNow(),
});

export const commissions = pgTable('commissions', {
    id: serial('id').primaryKey(),
    orderId: integer('orderId').references(() => orders.id),
    restaurantId: integer('restaurantId').references(() => restaurantClients.id),
    amount: decimal('amount', { precision: 10, scale: 2 }),
    isPaid: boolean('isPaid').default(false),
    paidAt: timestamp('paidAt'),
    createdAt: timestamp('createdAt').defaultNow(),
});

// Define relationships
export const usersRelations = relations(users, ({ one }) => ({
  restaurantClient: one(restaurantClients, {
    fields: [users.id],
    references: [restaurantClients.userId],
  }),
  deliveryDriver: one(deliveryDrivers, {
    fields: [users.id],
    references: [deliveryDrivers.userId],
  }),
}));

export const restaurantClientsRelations = relations(restaurantClients, ({ one, many }) => ({
  user: one(users, {
    fields: [restaurantClients.userId],
    references: [users.id],
  }),
  settings: one(restaurantSettings, {
    fields: [restaurantClients.id],
    references: [restaurantSettings.restaurantId],
  }),
  categories: many(categories),
  products: many(products),
  orders: many(orders),
  commissions: many(commissions),
}));

export type InsertUser = typeof users.$inferInsert;