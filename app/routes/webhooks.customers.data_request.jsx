import { authenticate } from "../shopify.server";
import db from "../db.server";

/**
 * GDPR: customers/data_request
 * Shopify calls this when a customer requests a copy of their data.
 * We store only: email + wishlist item snapshots in WishlistReminder.
 * Customer metafield data lives in Shopify's systems, not ours.
 * Respond 200 within 5 seconds to acknowledge receipt; fulfil within 30 days.
 */
export const action = async ({ request }) => {
  const { shop, topic, payload } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  const email = payload?.customer?.email;
  if (!email) return new Response();

  // Find any data we hold for this customer
  const reminder = await db.wishlistReminder.findUnique({
    where: { shop_email: { shop, email } },
  });

  if (reminder) {
    // Log the data we hold so the merchant/developer can respond within 30 days.
    // In a production app you would email this report to the store owner.
    console.log(
      `[GDPR data_request] shop=${shop} email=${email} ` +
        `items=${reminder.items} createdAt=${reminder.createdAt}`
    );
  }

  return new Response();
};
