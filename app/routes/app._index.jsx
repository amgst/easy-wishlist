import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const reminders = await db.wishlistReminder.findMany({
    where: { shop },
    orderBy: { createdAt: "desc" },
  });

  // Stats
  const totalSignups = reminders.length;
  const totalSent = reminders.filter((r) => r.sentAt).length;
  const totalPending = totalSignups - totalSent;

  // Product frequency from items JSON
  const productCounts = {};
  for (const r of reminders) {
    try {
      const items = JSON.parse(r.items || "[]");
      for (const item of items) {
        const key = item.title || item.handle || "Unknown";
        if (!productCounts[key]) {
          productCounts[key] = { title: key, image: item.image || null, count: 0 };
        }
        productCounts[key].count += 1;
      }
    } catch {}
  }

  const topProducts = Object.values(productCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Recent signups
  const recent = reminders.slice(0, 10).map((r) => {
    let items = [];
    try { items = JSON.parse(r.items || "[]"); } catch {}
    return {
      email: r.email,
      itemCount: items.length,
      items: items.slice(0, 3).map((i) => i.title || "Product"),
      sent: !!r.sentAt,
      createdAt: r.createdAt.toISOString(),
    };
  });

  return { totalSignups, totalSent, totalPending, topProducts, recent };
};

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

export default function Index() {
  const { totalSignups, totalSent, totalPending, topProducts, recent } = useLoaderData();
  const hasData = totalSignups > 0;

  return (
    <s-page heading="Easy Wishlist">

      {/* Stats row */}
      <s-section>
        <s-columns>
          <s-column>
            <s-box padding="base" border-width="base" border-radius="base" background="subdued">
              <s-stack direction="block" gap="tight">
                <s-text variant="subdued">Total Wishlist Signups</s-text>
                <s-heading>{totalSignups}</s-heading>
                <s-text variant="subdued">customers saved their email</s-text>
              </s-stack>
            </s-box>
          </s-column>
          <s-column>
            <s-box padding="base" border-width="base" border-radius="base" background="subdued">
              <s-stack direction="block" gap="tight">
                <s-text variant="subdued">Reminders Sent</s-text>
                <s-heading>{totalSent}</s-heading>
                <s-text variant="subdued">follow-up emails delivered</s-text>
              </s-stack>
            </s-box>
          </s-column>
          <s-column>
            <s-box padding="base" border-width="base" border-radius="base" background="subdued">
              <s-stack direction="block" gap="tight">
                <s-text variant="subdued">Pending Reminders</s-text>
                <s-heading>{totalPending}</s-heading>
                <s-text variant="subdued">scheduled to send</s-text>
              </s-stack>
            </s-box>
          </s-column>
        </s-columns>
      </s-section>

      {/* Most wishlisted products */}
      <s-section heading="Most Wishlisted Products">
        {topProducts.length === 0 ? (
          <s-paragraph>No wishlist data yet. Products will appear here once customers start saving items and submitting their email.</s-paragraph>
        ) : (
          <s-stack direction="block" gap="base">
            {topProducts.map((p, i) => (
              <s-stack key={i} direction="inline" gap="base" align="center">
                <s-badge>{p.count}</s-badge>
                <s-text>{p.title}</s-text>
              </s-stack>
            ))}
          </s-stack>
        )}
      </s-section>

      {/* Recent signups */}
      <s-section heading="Recent Wishlist Signups">
        {recent.length === 0 ? (
          <s-paragraph>No signups yet. When customers enter their email on the wishlist page, they will appear here.</s-paragraph>
        ) : (
          <s-stack direction="block" gap="base">
            {recent.map((r, i) => (
              <s-box key={i} padding="base" border-width="base" border-radius="base">
                <s-stack direction="block" gap="tight">
                  <s-stack direction="inline" gap="base">
                    <s-text><strong>{r.email}</strong></s-text>
                    {r.sent
                      ? <s-badge tone="success">Reminder sent</s-badge>
                      : <s-badge tone="attention">Pending</s-badge>
                    }
                  </s-stack>
                  <s-text variant="subdued">
                    {r.itemCount} item{r.itemCount !== 1 ? "s" : ""} — {r.items.join(", ")}{r.itemCount > 3 ? "…" : ""}
                  </s-text>
                  <s-text variant="subdued">{formatDate(r.createdAt)}</s-text>
                </s-stack>
              </s-box>
            ))}
          </s-stack>
        )}
      </s-section>

      {/* Setup guide in aside */}
      <s-section slot="aside" heading="Setup Guide">
        <s-stack direction="block" gap="base">
          <s-stack direction="block" gap="tight">
            <s-text><strong>1. Enable App Embed</strong></s-text>
            <s-paragraph>Theme editor → App Embeds → enable Wishlist</s-paragraph>
            <s-link href="/admin/themes/current/editor?context=apps" target="_blank">Open Theme Editor →</s-link>
          </s-stack>
          <s-stack direction="block" gap="tight">
            <s-text><strong>2. Add Wishlist Button</strong></s-text>
            <s-paragraph>Product page template → Add block → Wishlist Button</s-paragraph>
          </s-stack>
          <s-stack direction="block" gap="tight">
            <s-text><strong>3. Create Wishlist Page</strong></s-text>
            <s-paragraph>Create a page with handle <strong>wishlist</strong>, add the Wishlist Page block</s-paragraph>
            <s-link href="/admin/pages/new" target="_blank">Create Page →</s-link>
          </s-stack>
        </s-stack>
      </s-section>

      <s-section slot="aside" heading="Settings">
        <s-paragraph>Configure email reminder timing and branding.</s-paragraph>
        <s-link href="/app/settings">Go to Settings →</s-link>
      </s-section>

    </s-page>
  );
}

export const headers = (headersArgs) => boundary.headers(headersArgs);
