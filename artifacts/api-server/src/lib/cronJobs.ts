// Cron jobs - scheduled tasks jo automatically chalayi jaati hain
import cron from "node-cron";
import { syncServicesFromAllProviders } from "./serviceSync";
import { logger } from "./logger";

// Service sync cron job setup karna
export function setupCronJobs(): void {
  // Har 24 ghante mein ek baar services sync karo (raat 2 baje)
  // Cron format: second minute hour day month weekday
  cron.schedule("0 2 * * *", async () => {
    logger.info("Cron job started: Syncing services from all providers");
    try {
      const result = await syncServicesFromAllProviders();
      logger.info(result, "Cron job completed: Service sync done");
    } catch (err) {
      logger.error({ err }, "Cron job failed: Service sync error");
    }
  });

  logger.info("Cron jobs initialized - Service sync scheduled at 2 AM daily");
}
