import { Resend } from "resend";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { wishlistReminderHtml } from "../emails/wishlistReminder.js";

/**
 * App Proxy — /apps/wishlist
 *
 * Actions:
 *  GET  ?logged_in_customer_id=X   → returns customer's synced wishlist items
 *  POST { items, customerId }       → syncs localStorage → customer metafield
 *  POST { action:"email", email, items } → saves email reminder & sends confirmation
 */

const METAFIELD_NS = "wbify";
const METAFIELD_KEY = "wishlist";

function customerGid(id) {
  return `gid://shopify/Customer/${id}`;
}

function corsJson(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

/* ---- GET ---- */
export const loader = async ({ request }) => {
  const { admin } = await authenticate.public.appProxy(request);
  const url = new URL(request.url);
  const customerId = url.searchParams.get("logged_in_customer_id");

  if (!customerId) return corsJson({ items: [] });

  try {
    const res = await admin.graphql(
      `#graphql
        query GetWishlistMeta($id: ID!) {
          customer(id: $id) {
            metafield(namespace: "${METAFIELD_NS}", key: "${METAFIELD_KEY}") {
              value
            }
          }
        }`,
      { variables: { id: customerGid(customerId) } }
    );
    const { data } = await res.json();
    const raw = data?.customer?.metafield?.value;
    return corsJson({ items: raw ? JSON.parse(raw) : [] });
  } catch {
    return corsJson({ items: [] });
  }
};

/* ---- POST ---- */
export const action = async ({ request }) => {
  if (request.method === "OPTIONS") {
    return corsJson({}, 204);
  }
  if (request.method !== "POST") {
    return corsJson({ error: "Method not allowed" }, 405);
  }

  const { admin, session } = await authenticate.public.appProxy(request);

  let body;
  try {
    body = await request.json();
  } catch {
    return corsJson({ error: "Invalid JSON" }, 400);
  }

  /* ---- Email reminder registration ---- */
  if (body.action === "email") {
    const { email, items = [] } = body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return corsJson({ error: "Invalid email" }, 400);
    }

    // Upsert the reminder record
    await db.wishlistReminder.upsert({
      where: { shop_email: { shop: session.shop, email } },
      update: { items: JSON.stringify(items), sentAt: null },
      create: { shop: session.shop, email, items: JSON.stringify(items) },
    });

    // Send confirmation email via Resend
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey && items.length > 0) {
      try {
        // Fetch shop name for the email
        const shopRes = await admin.graphql(`#graphql
          query { shop { name primaryDomain { url } } }
        `);
        const shopData = await shopRes.json();
        const storeName = shopData?.data?.shop?.name || session.shop;
        const storeUrl = shopData?.data?.shop?.primaryDomain?.url || `https://${session.shop}`;

        // Load email settings for this shop
        const settings = await db.settings.findUnique({ where: { shop: session.shop } });
        const senderName = settings?.senderName || storeName;
        const subject = settings?.emailSubject || "You left something behind ♥";
        const replyTo = settings?.replyTo || undefined;

        const resend = new Resend(apiKey);
        await resend.emails.send({
          from: `${senderName} <onboarding@resend.dev>`,
          to: email,
          subject,
          ...(replyTo ? { reply_to: replyTo } : {}),
          html: wishlistReminderHtml({ storeName, storeUrl, items }),
        });
      } catch (err) {
        // Email failed — still return success (record was saved)
        console.error("Wishlist email send failed:", err);
      }
    }

    return corsJson({ success: true });
  }

  /* ---- Sync localStorage → customer metafield ---- */
  const { items, customerId } = body;
  if (!customerId || !Array.isArray(items)) {
    return corsJson({ error: "Missing customerId or items" }, 400);
  }

  try {
    const res = await admin.graphql(
      `#graphql
        mutation SyncWishlist($input: CustomerInput!) {
          customerUpdate(input: $input) {
            userErrors { field message }
          }
        }`,
      {
        variables: {
          input: {
            id: customerGid(customerId),
            metafields: [
              {
                namespace: METAFIELD_NS,
                key: METAFIELD_KEY,
                value: JSON.stringify(items),
                type: "json",
              },
            ],
          },
        },
      }
    );
    const { data } = await res.json();
    const errors = data?.customerUpdate?.userErrors ?? [];
    if (errors.length > 0) return corsJson({ error: errors[0].message }, 422);
  } catch {
    return corsJson({ error: "Sync failed" }, 500);
  }

  return corsJson({ success: true });
};
