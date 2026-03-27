// Providers routes - admin ke liye provider management aur service sync
import { Router, type IRouter } from "express";
import { db, providersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../lib/auth";
import { syncServicesFromAllProviders } from "../lib/serviceSync";
import {
  CreateProviderBody,
  UpdateProviderBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

// GET /providers - saare providers list karna (Admin only)
router.get("/providers", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const providers = await db
    .select()
    .from(providersTable)
    .orderBy(providersTable.createdAt);

  const formatted = providers.map((p) => ({
    id: p.id,
    name: p.name,
    apiUrl: p.apiUrl,
    apiKey: p.apiKey,
    status: p.status,
    createdAt: p.createdAt,
  }));

  res.json(formatted);
});

// POST /providers - naya provider banana (Admin only)
router.post("/providers", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateProviderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [provider] = await db
    .insert(providersTable)
    .values({
      name: parsed.data.name,
      apiUrl: parsed.data.apiUrl,
      apiKey: parsed.data.apiKey,
      status: parsed.data.status || "active",
    })
    .returning();

  req.log.info({ providerId: provider.id }, "Provider created");

  res.status(201).json({
    id: provider.id,
    name: provider.name,
    apiUrl: provider.apiUrl,
    apiKey: provider.apiKey,
    status: provider.status,
    createdAt: provider.createdAt,
  });
});

// POST /providers/sync - manually services sync trigger karna (Admin only)
// IMPORTANT: Yeh route /providers/:id se pehle hona chahiye, nahi to conflict hoga
router.post("/providers/sync", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  req.log.info("Manual service sync triggered by admin");

  const result = await syncServicesFromAllProviders();

  res.json({
    added: result.added,
    updated: result.updated,
    deactivated: result.deactivated,
    errors: result.errors,
  });
});

// PATCH /providers/:id - provider update karna (Admin only)
router.patch("/providers/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid provider ID" });
    return;
  }

  const parsed = UpdateProviderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, any> = {};
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.apiUrl !== undefined) updateData.apiUrl = parsed.data.apiUrl;
  if (parsed.data.apiKey !== undefined) updateData.apiKey = parsed.data.apiKey;
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;

  const [provider] = await db
    .update(providersTable)
    .set(updateData)
    .where(eq(providersTable.id, id))
    .returning();

  if (!provider) {
    res.status(404).json({ error: "Provider not found" });
    return;
  }

  req.log.info({ providerId: id }, "Provider updated");

  res.json({
    id: provider.id,
    name: provider.name,
    apiUrl: provider.apiUrl,
    apiKey: provider.apiKey,
    status: provider.status,
    createdAt: provider.createdAt,
  });
});

// DELETE /providers/:id - provider delete karna (Admin only)
router.delete("/providers/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid provider ID" });
    return;
  }

  const [provider] = await db
    .delete(providersTable)
    .where(eq(providersTable.id, id))
    .returning();

  if (!provider) {
    res.status(404).json({ error: "Provider not found" });
    return;
  }

  req.log.info({ providerId: id }, "Provider deleted");

  res.sendStatus(204);
});

export default router;
