// Services routes - service catalog manage karna
import { Router, type IRouter } from "express";
import { db, servicesTable, providersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../lib/auth";
import { UpdateServiceBody } from "@workspace/api-zod";

const router: IRouter = Router();

// Service object format karna response ke liye
function formatService(s: any, providerName?: string | null) {
  return {
    id: s.id,
    providerServiceId: s.providerServiceId,
    providerId: s.providerId,
    providerName: providerName ?? null,
    name: s.name,
    category: s.category,
    type: s.type,
    originalRate: parseFloat(s.originalRate),
    sellRate: parseFloat(s.sellRate),
    min: s.min,
    max: s.max,
    status: s.status,
    createdAt: s.createdAt,
  };
}

// GET /services/categories - unique categories list karna
// IMPORTANT: Yeh route /services/:id se pehle hona chahiye
router.get("/services/categories", async (req, res): Promise<void> => {
  const results = await db
    .selectDistinct({ category: servicesTable.category })
    .from(servicesTable)
    .where(eq(servicesTable.status, "active"))
    .orderBy(servicesTable.category);

  const categories = results.map((r) => r.category);
  res.json(categories);
});

// GET /services - saari active services list karna (optional ?category= filter ke saath)
router.get("/services", async (req, res): Promise<void> => {
  const category = req.query.category as string | undefined;

  // Services ke saath provider name bhi lao (JOIN)
  const results = await db
    .select({
      id: servicesTable.id,
      providerServiceId: servicesTable.providerServiceId,
      providerId: servicesTable.providerId,
      providerName: providersTable.name,
      name: servicesTable.name,
      category: servicesTable.category,
      type: servicesTable.type,
      originalRate: servicesTable.originalRate,
      sellRate: servicesTable.sellRate,
      min: servicesTable.min,
      max: servicesTable.max,
      status: servicesTable.status,
      createdAt: servicesTable.createdAt,
    })
    .from(servicesTable)
    .leftJoin(providersTable, eq(servicesTable.providerId, providersTable.id))
    .where(
      category
        ? and(eq(servicesTable.status, "active"), eq(servicesTable.category, category))
        : eq(servicesTable.status, "active")
    )
    .orderBy(servicesTable.category, servicesTable.name);

  const formatted = results.map((s) => formatService(s, s.providerName));
  res.json(formatted);
});

// GET /services/:id - ek service ka detail
router.get("/services/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid service ID" });
    return;
  }

  const [result] = await db
    .select({
      id: servicesTable.id,
      providerServiceId: servicesTable.providerServiceId,
      providerId: servicesTable.providerId,
      providerName: providersTable.name,
      name: servicesTable.name,
      category: servicesTable.category,
      type: servicesTable.type,
      originalRate: servicesTable.originalRate,
      sellRate: servicesTable.sellRate,
      min: servicesTable.min,
      max: servicesTable.max,
      status: servicesTable.status,
      createdAt: servicesTable.createdAt,
    })
    .from(servicesTable)
    .leftJoin(providersTable, eq(servicesTable.providerId, providersTable.id))
    .where(eq(servicesTable.id, id));

  if (!result) {
    res.status(404).json({ error: "Service not found" });
    return;
  }

  res.json(formatService(result, result.providerName));
});

// PATCH /services/:id - service update karna (Admin only)
router.patch("/services/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid service ID" });
    return;
  }

  const parsed = UpdateServiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, any> = {};
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.category !== undefined) updateData.category = parsed.data.category;
  if (parsed.data.sellRate !== undefined) updateData.sellRate = String(parsed.data.sellRate);
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;

  const [service] = await db
    .update(servicesTable)
    .set(updateData)
    .where(eq(servicesTable.id, id))
    .returning();

  if (!service) {
    res.status(404).json({ error: "Service not found" });
    return;
  }

  req.log.info({ serviceId: id }, "Service updated by admin");

  // Provider name bhi fetch karo
  const [withProvider] = await db
    .select({
      id: servicesTable.id,
      providerServiceId: servicesTable.providerServiceId,
      providerId: servicesTable.providerId,
      providerName: providersTable.name,
      name: servicesTable.name,
      category: servicesTable.category,
      type: servicesTable.type,
      originalRate: servicesTable.originalRate,
      sellRate: servicesTable.sellRate,
      min: servicesTable.min,
      max: servicesTable.max,
      status: servicesTable.status,
      createdAt: servicesTable.createdAt,
    })
    .from(servicesTable)
    .leftJoin(providersTable, eq(servicesTable.providerId, providersTable.id))
    .where(eq(servicesTable.id, id));

  res.json(formatService(withProvider, withProvider?.providerName));
});

export default router;
