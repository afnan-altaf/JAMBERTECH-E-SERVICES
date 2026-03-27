// Orders routes - order placement aur tracking
import { Router, type IRouter } from "express";
import { db, ordersTable, servicesTable, providersTable, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { placeOrderOnProvider } from "../lib/serviceSync";
import { CreateOrderBody } from "@workspace/api-zod";

const router: IRouter = Router();

// Order object format karna response ke liye
function formatOrder(o: any, serviceName?: string | null) {
  return {
    id: o.id,
    userId: o.userId,
    serviceId: o.serviceId,
    serviceName: serviceName ?? null,
    providerOrderId: o.providerOrderId ?? null,
    link: o.link,
    quantity: o.quantity,
    charge: parseFloat(o.charge),
    status: o.status,
    createdAt: o.createdAt,
  };
}

// GET /orders - orders list karna (user apne orders dekhega, admin sab)
router.get("/orders", requireAuth, async (req, res): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const isAdmin = req.user.role === "admin";

  const baseQuery = db
    .select({
      id: ordersTable.id,
      userId: ordersTable.userId,
      serviceId: ordersTable.serviceId,
      serviceName: servicesTable.name,
      providerOrderId: ordersTable.providerOrderId,
      link: ordersTable.link,
      quantity: ordersTable.quantity,
      charge: ordersTable.charge,
      status: ordersTable.status,
      createdAt: ordersTable.createdAt,
    })
    .from(ordersTable)
    .leftJoin(servicesTable, eq(ordersTable.serviceId, servicesTable.id));

  // Admin sab orders dekhta hai, user sirf apne
  const results = isAdmin
    ? await baseQuery.orderBy(sql`${ordersTable.createdAt} DESC`)
    : await baseQuery.where(eq(ordersTable.userId, req.user.id)).orderBy(sql`${ordersTable.createdAt} DESC`);

  const formatted = results.map((o) => formatOrder(o, o.serviceName));
  res.json(formatted);
});

// POST /orders - naya order place karna
router.post("/orders", requireAuth, async (req, res): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { serviceId, link, quantity } = parsed.data;

  // Service aur provider ka data laao
  const [serviceData] = await db
    .select({
      id: servicesTable.id,
      providerServiceId: servicesTable.providerServiceId,
      providerId: servicesTable.providerId,
      name: servicesTable.name,
      sellRate: servicesTable.sellRate,
      min: servicesTable.min,
      max: servicesTable.max,
      status: servicesTable.status,
    })
    .from(servicesTable)
    .where(eq(servicesTable.id, serviceId));

  if (!serviceData) {
    res.status(404).json({ error: "Service not found" });
    return;
  }

  if (serviceData.status !== "active") {
    res.status(400).json({ error: "Service is not active" });
    return;
  }

  // Quantity validate karo
  if (quantity < serviceData.min || quantity > serviceData.max) {
    res.status(400).json({
      error: `Quantity must be between ${serviceData.min} and ${serviceData.max}`,
    });
    return;
  }

  // Charge calculate karo - (sellRate per 1000) * quantity
  const sellRate = parseFloat(serviceData.sellRate);
  const charge = parseFloat(((sellRate / 1000) * quantity).toFixed(4));

  // User ka fresh balance lao
  const [freshUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.user.id));

  if (!freshUser) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const userBalance = parseFloat(freshUser.balance);

  // Yahan user ka balance check kar rahe hain
  if (userBalance < charge) {
    res.status(400).json({
      error: `Insufficient balance. Required: $${charge.toFixed(4)}, Available: $${userBalance.toFixed(4)}`,
    });
    return;
  }

  // Provider ka data laao
  const [provider] = await db
    .select()
    .from(providersTable)
    .where(eq(providersTable.id, serviceData.providerId));

  if (!provider || provider.status !== "active") {
    res.status(400).json({ error: "Service provider is not available" });
    return;
  }

  // Pehle user ka balance deduct karo (optimistic deduction)
  await db
    .update(usersTable)
    .set({
      balance: sql`${usersTable.balance} - ${charge}`,
    })
    .where(eq(usersTable.id, req.user.id));

  let providerOrderId: string | undefined;

  try {
    // Provider pe order place karo
    const providerResult = await placeOrderOnProvider(
      provider,
      serviceData.providerServiceId,
      link,
      quantity
    );
    providerOrderId = providerResult.orderId;
  } catch (err) {
    // Provider se error aaya - balance refund karo
    req.log.error({ err, serviceId, userId: req.user.id }, "Provider order failed, refunding balance");

    await db
      .update(usersTable)
      .set({
        balance: sql`${usersTable.balance} + ${charge}`,
      })
      .where(eq(usersTable.id, req.user.id));

    const errMsg = err instanceof Error ? err.message : "Provider error";
    res.status(400).json({ error: `Order failed: ${errMsg}` });
    return;
  }

  // Order DB mein save karo
  const [order] = await db
    .insert(ordersTable)
    .values({
      userId: req.user.id,
      serviceId,
      providerOrderId: providerOrderId || null,
      link,
      quantity,
      charge: String(charge),
      status: "pending",
    })
    .returning();

  req.log.info(
    { orderId: order.id, userId: req.user.id, charge, providerOrderId },
    "Order placed successfully"
  );

  res.status(201).json(formatOrder(order, serviceData.name));
});

// GET /orders/:id - ek order ka detail
router.get("/orders/:id", requireAuth, async (req, res): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid order ID" });
    return;
  }

  const [result] = await db
    .select({
      id: ordersTable.id,
      userId: ordersTable.userId,
      serviceId: ordersTable.serviceId,
      serviceName: servicesTable.name,
      providerOrderId: ordersTable.providerOrderId,
      link: ordersTable.link,
      quantity: ordersTable.quantity,
      charge: ordersTable.charge,
      status: ordersTable.status,
      createdAt: ordersTable.createdAt,
    })
    .from(ordersTable)
    .leftJoin(servicesTable, eq(ordersTable.serviceId, servicesTable.id))
    .where(eq(ordersTable.id, id));

  if (!result) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  // User sirf apna order dekh sakta hai (admin ko koi restriction nahi)
  if (req.user.role !== "admin" && result.userId !== req.user.id) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  res.json(formatOrder(result, result.serviceName));
});

export default router;
