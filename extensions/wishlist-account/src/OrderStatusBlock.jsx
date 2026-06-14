import '@shopify/ui-extensions/preact';
import { render } from 'preact';
import { useState, useEffect } from 'preact/hooks';

const GET_WISHLIST_COUNT = `#graphql
  query GetWishlistCount {
    customer {
      metafield(namespace: "wbify", key: "wishlist") {
        value
      }
    }
  }
`;

export default async () => {
  render(<OrderStatusBlock />, document.body);
};

function OrderStatusBlock() {
  const [count, setCount] = useState(null);

  useEffect(() => {
    async function loadCount() {
      try {
        const { data } = await shopify.query(GET_WISHLIST_COUNT);
        const raw = data?.customer?.metafield?.value;
        const items = raw ? JSON.parse(raw) : [];
        setCount(items.length);
      } catch {
        setCount(0);
      }
    }
    loadCount();
  }, []);

  // Don't render anything if wishlist is empty or still loading
  if (!count) return null;

  return (
    <s-banner>
      <s-inline-stack gap="base" block-align="center">
        <s-text>
          {shopify.i18n.translate('wishlist.order_status_prompt')}
        </s-text>
        <s-link to="/account/wishlist">
          {shopify.i18n.translate('wishlist.order_status_cta')}
        </s-link>
      </s-inline-stack>
    </s-banner>
  );
}
