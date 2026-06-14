import '@shopify/ui-extensions/preact';
import { render } from 'preact';
import { useState, useEffect, useCallback } from 'preact/hooks';

const WISHLIST_NS = 'wbify';
const WISHLIST_KEY = 'wishlist';

/**
 * Reads the customer's saved wishlist from a customer metafield.
 * The metafield value is a JSON array of product snapshots:
 * [{ id, handle, title, price, compare_at_price, image, available, url }]
 *
 * Requires the metafield definition to have customerAccount: "read_write" access.
 * Create it once via Admin API or shopify.app.toml.
 */
const GET_WISHLIST = `#graphql
  query GetCustomerWishlist {
    customer {
      metafield(namespace: "${WISHLIST_NS}", key: "${WISHLIST_KEY}") {
        value
      }
    }
  }
`;

const SET_WISHLIST = `#graphql
  mutation SetCustomerWishlist($value: String!) {
    customerMetafieldsSet(metafields: [{
      namespace: "${WISHLIST_NS}",
      key: "${WISHLIST_KEY}",
      value: $value,
      type: "json"
    }]) {
      metafields {
        value
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export default async () => {
  render(<WishlistPage />, document.body);
};

function WishlistPage() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [removing, setRemoving] = useState(null);

  useEffect(() => {
    async function loadWishlist() {
      try {
        const { data, errors } = await shopify.query(GET_WISHLIST);
        if (errors && errors.length > 0) throw new Error(errors[0].message);
        const raw = data?.customer?.metafield?.value;
        setItems(raw ? JSON.parse(raw) : []);
      } catch {
        setItems([]);
      }
    }
    loadWishlist();
  }, []);

  const removeItem = useCallback(
    async (productId) => {
      setRemoving(productId);
      setError(null);
      const nextItems = items.filter((i) => String(i.id) !== String(productId));
      try {
        const { data, errors } = await shopify.query(SET_WISHLIST, {
          variables: { value: JSON.stringify(nextItems) },
        });
        const userErrors = data?.customerMetafieldsSet?.userErrors;
        if ((errors && errors.length > 0) || (userErrors && userErrors.length > 0)) {
          throw new Error('Mutation failed');
        }
        setItems(nextItems);
      } catch {
        setError(shopify.i18n.translate('wishlist.save_error'));
      } finally {
        setRemoving(null);
      }
    },
    [items]
  );

  if (items === null) {
    return <LoadingState />;
  }

  return (
    <s-block-stack gap="base">
      <s-text size="large" emphasis="bold">
        {shopify.i18n.translate('wishlist.heading')}
      </s-text>

      {error && (
        <s-banner tone="critical">
          <s-text>{error}</s-text>
        </s-banner>
      )}

      {items.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <s-text color="subdued">
            {shopify.i18n.translate(
              items.length === 1 ? 'wishlist.count_one' : 'wishlist.count_other',
              { count: items.length }
            )}
          </s-text>
          <s-block-stack gap="base">
            {items.map((item) => (
              <WishlistCard
                key={item.id}
                item={item}
                isRemoving={removing === item.id}
                onRemove={removeItem}
              />
            ))}
          </s-block-stack>
        </>
      )}
    </s-block-stack>
  );
}

function WishlistCard({ item, isRemoving, onRemove }) {
  const price = formatMoney(item.price);
  const compareAt = item.compare_at_price > item.price
    ? formatMoney(item.compare_at_price)
    : null;

  return (
    <s-card>
      <s-inline-stack gap="base" block-align="start">
        {item.image && (
          <s-image
            source={item.image}
            alt={item.title}
            aspect-ratio="1"
            style={{ width: '80px', height: '80px', flexShrink: '0' }}
          />
        )}

        <s-block-stack gap="tight" style={{ flex: '1', minWidth: '0' }}>
          <s-link to={item.url}>
            <s-text emphasis="bold">{item.title}</s-text>
          </s-link>

          <s-inline-stack gap="tight" alignment="center">
            <s-text>{price}</s-text>
            {compareAt && (
              <s-text color="subdued" text-decoration="line-through">
                {compareAt}
              </s-text>
            )}
          </s-inline-stack>

          {!item.available && (
            <s-badge tone="critical">
              {shopify.i18n.translate('wishlist.sold_out')}
            </s-badge>
          )}
        </s-block-stack>

        <s-block-stack gap="tight" alignment="end">
          {item.available && (
            <s-button kind="secondary" to={item.url}>
              {shopify.i18n.translate('wishlist.view_product')}
            </s-button>
          )}
          <s-button
            kind="plain"
            tone="critical"
            loading={isRemoving ? 'true' : undefined}
            onPress={() => onRemove(item.id)}
          >
            {shopify.i18n.translate('wishlist.remove')}
          </s-button>
        </s-block-stack>
      </s-inline-stack>
    </s-card>
  );
}

function EmptyState() {
  return (
    <s-block-stack gap="base" alignment="center">
      <s-text>{shopify.i18n.translate('wishlist.empty')}</s-text>
      <s-button kind="secondary" to="/products">
        {shopify.i18n.translate('wishlist.browse')}
      </s-button>
    </s-block-stack>
  );
}

function LoadingState() {
  return (
    <s-block-stack gap="base">
      <s-skeleton-text lines="1" />
      <s-skeleton-text lines="1" />
      <s-skeleton-text lines="1" />
    </s-block-stack>
  );
}

function formatMoney(cents) {
  if (!cents) return '';
  const locale =
    (shopify.i18n && shopify.i18n.locale) ||
    document.documentElement.lang ||
    'en';
  const currency =
    (shopify.i18n && shopify.i18n.currencyCode) || 'USD';
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
    }).format(cents / 100);
  } catch {
    return '$' + (cents / 100).toFixed(2);
  }
}
