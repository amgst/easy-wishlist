import { authenticate } from "../shopify.server";
import db from "../db.server";

/**
 * GDPR: customers/redact
 * Shopify calls this when a customer requests deletion of their data.
 * Delete all records we hold that are identifiable to this customer.
 */
export const action = async ({ request }) => {
  const { shop, topic, payload } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  const email = payload?.customer?.email;
  if (!email) return new Response();

  await db.wishlistReminder.deleteMany({ where: { shop, email } });

  console.log(`[GDPR customers/redact] Deleted wishlist data for ${email} at ${shop}`);

  return new Response();
};
