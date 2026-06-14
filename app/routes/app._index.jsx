import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

export default function Index() {
  return (
    <s-page heading="Wbify Wishlist">
      <s-section heading="Welcome to Wbify Wishlist">
        <s-paragraph>
          Let customers save their favourite products with a single tap — no account needed. Everything is stored in the browser so setup takes minutes.
        </s-paragraph>
      </s-section>

      <s-section heading="Setup Guide">
        <s-stack direction="block" gap="base">
          <s-box padding="base" border-width="base" border-radius="base" background="subdued">
            <s-stack direction="block" gap="tight">
              <s-stack direction="inline" gap="tight" align="center">
                <s-badge tone="success">Step 1</s-badge>
                <s-heading>Enable the App Embed</s-heading>
              </s-stack>
              <s-paragraph>
                Go to your theme customiser → <strong>App Embeds</strong> → enable <strong>Wishlist</strong>. This loads the wishlist script on every page and shows the floating heart button.
              </s-paragraph>
              <s-link
                href="/admin/themes/current/editor?context=apps"
                target="_blank"
              >
                Open Theme Editor →
              </s-link>
            </s-stack>
          </s-box>

          <s-box padding="base" border-width="base" border-radius="base" background="subdued">
            <s-stack direction="block" gap="tight">
              <s-stack direction="inline" gap="tight" align="center">
                <s-badge>Step 2</s-badge>
                <s-heading>Add the Wishlist Button to Product Pages</s-heading>
              </s-stack>
              <s-paragraph>
                In the theme editor open any product page → click <strong>Add block</strong> inside the product section → choose <strong>Wishlist Button</strong>.
              </s-paragraph>
            </s-stack>
          </s-box>

          <s-box padding="base" border-width="base" border-radius="base" background="subdued">
            <s-stack direction="block" gap="tight">
              <s-stack direction="inline" gap="tight" align="center">
                <s-badge>Step 3</s-badge>
                <s-heading>Create a Wishlist Page</s-heading>
              </s-stack>
              <s-paragraph>
                Create a new page in Shopify with the handle <strong>wishlist</strong> (e.g. "My Wishlist"). Then open that page in the theme editor, add a <strong>Wishlist Page</strong> block, and save.
              </s-paragraph>
              <s-link href="/admin/pages/new" target="_blank">
                Create a Page →
              </s-link>
            </s-stack>
          </s-box>
        </s-stack>
      </s-section>

      <s-section slot="aside" heading="What customers get">
        <s-unordered-list>
          <s-list-item>Heart button on every product page</s-list-item>
          <s-list-item>Floating wishlist icon with item count</s-list-item>
          <s-list-item>Dedicated wishlist page showing saved products</s-list-item>
          <s-list-item>Instant add/remove — no page reload</s-list-item>
          <s-list-item>Works without a customer account</s-list-item>
          <s-list-item>Syncs across tabs automatically</s-list-item>
        </s-unordered-list>
      </s-section>

      <s-section slot="aside" heading="Tips">
        <s-paragraph>
          Point the floating button to <strong>/pages/wishlist</strong> in the App Embed settings so customers can easily view their saved items.
        </s-paragraph>
        <s-paragraph>
          The Wishlist Button works on any Online Store 2.0 theme that supports app blocks in product sections.
        </s-paragraph>
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
