import { authenticate } from "../shopify.server";
import db from "../db.server";

/**
 * GDPR: shop/redact
 * Shopify calls this 48 hours after a shop uninstalls the app.
 * Delete all data associated with that shop from our database.
 */
export const action = async ({ request }) => {
  const { shop, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  await Promise.all([
    db.wishlistReminder.deleteMany({ where: { shop } }),
    db.settings.deleteMany({ where: { shop } }),
    db.session.deleteMany({ where: { shop } }),
  ]);

  console.log(`[GDPR shop/redact] Deleted all data for shop ${shop}`);

  return new Response();
};
