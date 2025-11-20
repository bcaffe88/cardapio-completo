import { COOKIE_NAME } from "./shared/const.ts";
import { getSessionCookieOptions } from "./core/cookies.ts";
import { systemRouter } from "./core/systemRouter.ts";
import { publicProcedure, router, protectedProcedure } from "./core/trpc.ts";
import { z } from "zod";
import * as db from "./database.ts";

// Register webhooks (must be done in server/_core/index.ts)

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Restaurant public info
  restaurant: router({
    getActive: publicProcedure.query(async () => {
      const [restaurant] = await db.query('SELECT * FROM restaurant_clients WHERE isActive = true LIMIT 1');
      if (!restaurant) {
        throw new Error("No active restaurant found");
      }
      const [settings] = await db.query('SELECT * FROM restaurant_settings WHERE restaurantId = ? LIMIT 1', [restaurant.id]);
      return {
        ...restaurant,
        settings,
      };
    }),

    getSettings: protectedProcedure.query(async ({ ctx }) => {
      const [restaurant] = await db.query('SELECT * FROM restaurant_clients WHERE isActive = true LIMIT 1');
      if (!restaurant) {
        throw new Error("Restaurant not found");
      }
      const [settings] = await db.query('SELECT * FROM restaurant_settings WHERE restaurantId = ? LIMIT 1', [restaurant.id]);
      return settings;
    }),

    updateSettings: protectedProcedure
      .input(
        z.object({
          stripePublishableKey: z.string().optional(),
          stripeSecretKey: z.string().optional(),
          businessName: z.string().optional(),
          phone: z.string().optional(),
          address: z.string().optional(),
          deliveryFee: z.number().optional(),
          minimumOrder: z.number().optional(),
          estimatedDeliveryTime: z.string().optional(),
          useOwnDrivers: z.boolean().optional(),
          usePlatformDrivers: z.boolean().optional(),
          allowPickup: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const [restaurant] = await db.query('SELECT * FROM restaurant_clients WHERE isActive = true LIMIT 1');
        if (!restaurant) {
          throw new Error("Restaurant not found");
        }

        const fields = Object.keys(input);
        const values = Object.values(input);
        const setClause = fields.map(field => `${field} = ?`).join(', ');

        await db.query(`UPDATE restaurant_settings SET ${setClause} WHERE restaurantId = ?`, [...values, restaurant.id]);
        
        return { success: true };
      }),
  }),

  // Categories
  categories: router({
    list: publicProcedure
      .input(z.object({ restaurantId: z.number() }))
      .query(async ({ input }) => {
        return await db.query('SELECT * FROM categories WHERE restaurantId = ? AND isActive = true ORDER BY displayOrder', [input.restaurantId]);
      }),
  }),

  // Products
  products: router({
    list: publicProcedure
      .input(
        z.object({
          restaurantId: z.number(),
          categoryId: z.number().optional(),
        })
      )
      .query(async ({ input }) => {
        let sql = 'SELECT * FROM products WHERE restaurantId = ?';
        const params = [input.restaurantId];
        if (input.categoryId) {
          sql += ' AND categoryId = ?';
          params.push(input.categoryId);
        }
        sql += ' ORDER BY displayOrder';
        return await db.query(sql, params);
      }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const [product] = await db.query('SELECT * FROM products WHERE id = ?', [input.id]);
        if (!product) {
          throw new Error("Product not found");
        }

        const options = await db.query('SELECT * FROM product_options WHERE productId = ? ORDER BY displayOrder', [input.id]);
        const optionsWithValues = await Promise.all(
          options.map(async (option) => {
            const values = await db.query('SELECT * FROM product_option_values WHERE optionId = ? ORDER BY displayOrder', [option.id]);
            return {
              ...option,
              values,
            };
          })
        );

        return {
          ...product,
          options: optionsWithValues,
        };
      }),

    create: protectedProcedure
      .input(
        z.object({
          restaurantId: z.number(),
          categoryId: z.number(),
          name: z.string(),
          description: z.string().optional(),
          price: z.number(),
          imageUrl: z.string().optional(),
          isAvailable: z.boolean().default(true),
        })
      )
      .mutation(async ({ input }) => {
        const { restaurantId, categoryId, name, description, price, imageUrl, isAvailable } = input;
        const result = await db.query(
          'INSERT INTO products (restaurantId, categoryId, name, description, price, imageUrl, isAvailable) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [restaurantId, categoryId, name, description, price, imageUrl, isAvailable]
        );
        return { id: result.insertId };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          restaurantId: z.number(),
          categoryId: z.number(),
          name: z.string(),
          description: z.string().optional(),
          price: z.number(),
          imageUrl: z.string().optional(),
          isAvailable: z.boolean(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        const fields = Object.keys(data);
        const values = Object.values(data);
        const setClause = fields.map(field => `${field} = ?`).join(', ');

        await db.query(`UPDATE products SET ${setClause} WHERE id = ?`, [...values, id]);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.query('DELETE FROM products WHERE id = ?', [input.id]);
        return { success: true };
      }),
  }),

  // Orders
  orders: router({
    create: publicProcedure
      .input(
        z.object({
          restaurantId: z.number(),
          customerName: z.string(),
          customerPhone: z.string(),
          customerEmail: z.string().optional(),
          deliveryType: z.enum(["delivery", "pickup"]).default("delivery"),
          deliveryAddress: z.string(),
          deliveryLatitude: z.string().optional(),
          deliveryLongitude: z.string().optional(),
          addressReference: z.string().optional(),
          orderNotes: z.string().optional(),
          paymentMethod: z.enum(["cash", "card", "pix", "online"]),
          items: z.array(
            z.object({
              productId: z.number(),
              productName: z.string(),
              quantity: z.number(),
              unitPrice: z.number(),
              totalPrice: z.number(),
              customizations: z.string().optional(),
              specialInstructions: z.string().optional(),
            })
          ),
        })
      )
      .mutation(async ({ input }) => {
        const subtotal = input.items.reduce((sum, item) => sum + item.totalPrice, 0);
        
        const [restaurant] = await db.query('SELECT * FROM restaurant_clients WHERE id = ? LIMIT 1', [input.restaurantId]);
        if (!restaurant) {
          throw new Error("Restaurant not found");
        }
        
        const [settings] = await db.query('SELECT * FROM restaurant_settings WHERE restaurantId = ? LIMIT 1', [input.restaurantId]);
        const deliveryFee = settings?.deliveryFee || 0;
        const total = subtotal + parseFloat(deliveryFee);

        const orderNumber = `ORD${Date.now().toString().slice(-8)}`;

        const connection = await db.pool.getConnection();
        await connection.beginTransaction();

        try {
          const orderResult = await connection.query(
            'INSERT INTO orders (restaurantId, orderNumber, customerName, customerPhone, customerEmail, deliveryType, deliveryAddress, deliveryLatitude, deliveryLongitude, addressReference, orderNotes, subtotal, deliveryFee, total, paymentMethod, paymentStatus, orderStatus) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [input.restaurantId, orderNumber, input.customerName, input.customerPhone, input.customerEmail, input.deliveryType, input.deliveryAddress, input.deliveryLatitude, input.deliveryLongitude, input.addressReference, input.orderNotes, subtotal, deliveryFee, total, input.paymentMethod, 'pending', 'pending']
          );

          const orderId = orderResult[0].insertId;

          for (const item of input.items) {
            await connection.query(
              'INSERT INTO order_items (orderId, productId, productName, quantity, unitPrice, totalPrice, customizations, specialInstructions) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
              [orderId, item.productId, item.productName, item.quantity, item.unitPrice, item.totalPrice, item.customizations, item.specialInstructions]
            );
          }

          await connection.commit();

          return {
            orderId,
            orderNumber,
            total,
          };
        } catch (error) {
          await connection.rollback();
          throw new Error("Failed to create order");
        } finally {
          connection.release();
        }
      }),

    list: protectedProcedure
      .input(z.object({ restaurantId: z.number() }))
      .query(async ({ input }) => {
        return await db.query('SELECT * FROM orders WHERE restaurantId = ? ORDER BY createdAt DESC', [input.restaurantId]);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const [order] = await db.query('SELECT * FROM orders WHERE id = ?', [input.id]);
        if (!order) {
          throw new Error("Order not found");
        }
        const items = await db.query('SELECT * FROM order_items WHERE orderId = ?', [input.id]);
        return {
          ...order,
          items,
        };
      }),

    updateStatus: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          status: z.enum([
            "pending",
            "confirmed",
            "preparing",
            "ready",
            "out_for_delivery",
            "delivered",
            "cancelled",
          ]),
        })
      )
      .mutation(async ({ input }) => {
        await db.query('UPDATE orders SET status = ? WHERE id = ?', [input.status, input.id]);
        return { success: true };
      }),
  }),

  delivery: router({
    register: publicProcedure
      .input(
        z.object({
          name: z.string(),
          phone: z.string(),
          cpf: z.string(),
          vehicle: z.string(),
          licensePlate: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        const { name, phone, cpf, vehicle, licensePlate } = input;
        const result = await db.query(
          'INSERT INTO delivery_drivers (fullName, phone, vehicleType, vehiclePlate, isActive, isAvailable) VALUES (?, ?, ?, ?, ?, ?)',
          [name, phone, vehicle, licensePlate, true, true]
        );
        return { id: result.insertId };
      }),

    getProfile: protectedProcedure.query(async ({ ctx }) => {
      const [profile] = await db.query('SELECT * FROM delivery_drivers WHERE userId = ?', [ctx.user?.id || 0]);
      return profile;
    }),

    getAvailableOrders: protectedProcedure.query(async () => {
      return await db.query('SELECT * FROM orders WHERE status = ? ORDER BY createdAt DESC', ['ready']);
    }),

    getActiveDeliveries: protectedProcedure.query(async ({ ctx }) => {
      return await db.query('SELECT * FROM orders WHERE driverId = ? AND status = ? ORDER BY createdAt DESC', [ctx.user?.id || 0, 'out_for_delivery']);
    }),

    acceptOrder: protectedProcedure
      .input(z.object({ orderId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await db.query('UPDATE orders SET driverId = ?, status = ? WHERE id = ?', [ctx.user?.id || 0, 'out_for_delivery', input.orderId]);
        return { success: true };
      }),

    completeDelivery: protectedProcedure
      .input(z.object({ deliveryId: z.number() }))
      .mutation(async ({ input }) => {
        await db.query('UPDATE orders SET status = ? WHERE id = ?', ['delivered', input.deliveryId]);
        return { success: true };
      }),
  }),

  developer: router({
    getClients: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new Error("Unauthorized");
      }
      return await db.query('SELECT * FROM restaurant_clients');
    }),

    getCommissionStats: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new Error("Unauthorized");
      }
      
      const [revenueResult] = await db.query('SELECT SUM(total) as totalRevenue, COUNT(*) as totalOrders FROM orders');
      const [commissionResult] = await db.query('SELECT SUM(amount) as totalCommissions FROM commissions WHERE isPaid = false');

      return {
        totalRevenue: revenueResult.totalRevenue || 0,
        totalOrders: revenueResult.totalOrders || 0,
        totalCommissions: commissionResult.totalCommissions || 0,
      };
    }),

    createClient: protectedProcedure
      .input(
        z.object({
          businessName: z.string(),
          ownerName: z.string(),
          email: z.string().email(),
          phone: z.string(),
          commissionPercentage: z.number().min(0).max(100),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user?.role !== "admin") {
          throw new Error("Unauthorized");
        }
        const { businessName, ownerName, email, phone, commissionPercentage } = input;
        const result = await db.query(
          'INSERT INTO restaurant_clients (businessName, ownerName, email, phone, commissionRate, isActive) VALUES (?, ?, ?, ?, ?, ?)',
          [businessName, ownerName, email, phone, commissionPercentage * 100, true]
        );
        return { id: result.insertId };
      }),

    updateCommission: protectedProcedure
      .input(
        z.object({
          clientId: z.number(),
          percentage: z.number().min(0).max(100),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user?.role !== "admin") {
          throw new Error("Unauthorized");
        }
        await db.query('UPDATE restaurant_clients SET commissionRate = ? WHERE id = ?', [input.percentage * 100, input.clientId]);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
