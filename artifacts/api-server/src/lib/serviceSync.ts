// Service sync logic - providers se services fetch karna aur DB sync karna
import axios from "axios";
import { db, providersTable, servicesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "./logger";

// 3.5% margin add karne ka formula
// Formula: sell_rate = original_rate + (original_rate * 0.035)
function calculateSellRate(originalRate: number): number {
  return parseFloat((originalRate + originalRate * 0.035).toFixed(4));
}

// Ek provider se services fetch karna
async function fetchServicesFromProvider(provider: {
  id: number;
  name: string;
  apiUrl: string;
  apiKey: string;
}): Promise<any[]> {
  try {
    // Provider API se POST request - action=services
    const response = await axios.post(
      provider.apiUrl,
      new URLSearchParams({
        key: provider.apiKey,
        action: "services",
      }),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 30000, // 30 second timeout
      }
    );

    const data = response.data;

    // Response array hona chahiye
    if (!Array.isArray(data)) {
      logger.warn({ providerId: provider.id, response: data }, "Provider returned non-array response");
      return [];
    }

    return data;
  } catch (err) {
    logger.error({ err, providerId: provider.id, providerName: provider.name }, "Failed to fetch services from provider");
    return [];
  }
}

// Saare active providers se services sync karna
export async function syncServicesFromAllProviders(): Promise<{
  added: number;
  updated: number;
  deactivated: number;
  errors: string[];
}> {
  const result = { added: 0, updated: 0, deactivated: 0, errors: [] as string[] };

  logger.info("Starting service sync from all providers");

  // Saare active providers laao
  const providers = await db
    .select()
    .from(providersTable)
    .where(eq(providersTable.status, "active"));

  if (providers.length === 0) {
    logger.warn("No active providers found for sync");
    return result;
  }

  for (const provider of providers) {
    try {
      logger.info({ providerId: provider.id, providerName: provider.name }, "Syncing services from provider");

      // Provider se services fetch karo
      const providerServices = await fetchServicesFromProvider(provider);

      if (providerServices.length === 0) {
        result.errors.push(`Provider ${provider.name}: No services returned`);
        continue;
      }

      // Provider ke service IDs ka set banao (quick lookup ke liye)
      const providerServiceIds = new Set(
        providerServices.map((s: any) => String(s.service))
      );

      // Hamari DB mein is provider ki saari services laao
      const existingServices = await db
        .select()
        .from(servicesTable)
        .where(eq(servicesTable.providerId, provider.id));

      // Existing services ka map banao (providerServiceId -> DB record)
      const existingMap = new Map(
        existingServices.map((s) => [s.providerServiceId, s])
      );

      // Har provider service ke liye process karo
      for (const svc of providerServices) {
        const providerServiceId = String(svc.service);
        const originalRate = parseFloat(svc.rate || "0");
        const sellRate = calculateSellRate(originalRate);
        const min = parseInt(svc.min || "10", 10);
        const max = parseInt(svc.max || "10000", 10);

        const existing = existingMap.get(providerServiceId);

        if (!existing) {
          // Nayi service hai - add karo
          await db.insert(servicesTable).values({
            providerServiceId,
            providerId: provider.id,
            name: svc.name || "Unknown Service",
            category: svc.category || "General",
            type: svc.type || "Default",
            originalRate: String(originalRate),
            sellRate: String(sellRate),
            min,
            max,
            status: "active",
          });
          result.added++;
        } else {
          // Service exist karti hai - rate check karo
          const existingOriginalRate = parseFloat(existing.originalRate);
          if (Math.abs(existingOriginalRate - originalRate) > 0.0001) {
            // Provider ne rate change kiya - hamara rate bhi update karo
            await db
              .update(servicesTable)
              .set({
                originalRate: String(originalRate),
                sellRate: String(sellRate),
                name: svc.name || existing.name,
                category: svc.category || existing.category,
                min,
                max,
                status: "active", // Agar pehle inactive thi to active karo
              })
              .where(eq(servicesTable.id, existing.id));
            result.updated++;
          }
        }
      }

      // Jo services provider ne nahi di, unhe inactive karo (delete nahi)
      for (const existingService of existingServices) {
        if (!providerServiceIds.has(existingService.providerServiceId)) {
          if (existingService.status === "active") {
            await db
              .update(servicesTable)
              .set({ status: "inactive" })
              .where(eq(servicesTable.id, existingService.id));
            result.deactivated++;
          }
        }
      }

      logger.info(
        { providerId: provider.id, providerName: provider.name, servicesCount: providerServices.length },
        "Provider sync completed"
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      result.errors.push(`Provider ${provider.name}: ${msg}`);
      logger.error({ err, providerId: provider.id }, "Error syncing provider");
    }
  }

  logger.info(result, "Service sync completed");
  return result;
}

// Provider pe order place karna - dynamic routing
export async function placeOrderOnProvider(
  provider: { apiUrl: string; apiKey: string; name: string },
  providerServiceId: string,
  link: string,
  quantity: number
): Promise<{ orderId: string }> {
  // Provider 2 (MK SMM Panel) 'url' use karta hai, Provider 1 'link' use karta hai
  // Hum provider name se detect karte hain
  const isMkSmm = provider.apiUrl.includes("mksmmpanel");
  
  const params: Record<string, string> = {
    key: provider.apiKey,
    action: "add",
    service: providerServiceId,
    quantity: String(quantity),
  };

  // MK SMM Panel 'url' field use karta hai, baaki 'link' use karte hain
  if (isMkSmm) {
    params.url = link;
  } else {
    params.link = link;
  }

  logger.info(
    { providerName: provider.name, service: providerServiceId, quantity },
    "Placing order on provider"
  );

  const response = await axios.post(
    provider.apiUrl,
    new URLSearchParams(params),
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 30000,
    }
  );

  const data = response.data;

  // Provider response check karna
  if (data.error) {
    throw new Error(`Provider error: ${data.error}`);
  }

  if (!data.order) {
    throw new Error("Provider did not return an order ID");
  }

  return { orderId: String(data.order) };
}
