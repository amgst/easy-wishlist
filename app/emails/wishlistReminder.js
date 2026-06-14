/**
 * Generates the HTML body for the wishlist reminder email.
 * Plain JS template — no extra dependencies needed.
 *
 * @param {Object} opts
 * @param {string} opts.storeName
 * @param {string} opts.storeUrl
 * @param {Array}  opts.items  — wishlist product snapshots
 * @returns {string} HTML string
 */
export function wishlistReminderHtml({ storeName, storeUrl, items = [] }) {
  const productRows = items
    .slice(0, 6) // cap at 6 items so the email stays concise
    .map((item) => {
      const price = formatMoney(item.price, 'USD');
      const compareAt =
        item.compare_at_price > item.price
          ? `<s style="color:#9ca3af;font-size:13px;">${formatMoney(item.compare_at_price, 'USD')}</s>`
          : '';
      const badge = !item.available
        ? `<span style="display:inline-block;background:#fee2e2;color:#991b1b;font-size:11px;font-weight:600;padding:2px 8px;border-radius:4px;text-transform:uppercase;margin-top:4px;">Sold out</span>`
        : '';
      const cta = item.available
        ? `<a href="${storeUrl}${item.url}" style="display:inline-block;margin-top:10px;padding:8px 16px;background:#111827;color:#fff;font-size:13px;font-weight:500;border-radius:4px;text-decoration:none;">View Product</a>`
        : '';

      return `
        <tr>
          <td style="padding:16px 0;border-bottom:1px solid #e5e7eb;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td width="80" valign="top" style="padding-right:16px;">
                  ${item.image
                    ? `<a href="${storeUrl}${item.url}"><img src="${item.image}" alt="${escHtml(item.title)}" width="80" height="80" style="border-radius:6px;object-fit:cover;display:block;" /></a>`
                    : `<div style="width:80px;height:80px;background:#f3f4f6;border-radius:6px;"></div>`}
                </td>
                <td valign="top">
                  <a href="${storeUrl}${item.url}" style="font-size:15px;font-weight:600;color:#111827;text-decoration:none;">${escHtml(item.title)}</a>
                  <br>
                  <span style="font-size:15px;font-weight:600;color:#111827;">${price}</span>
                  ${compareAt}
                  ${badge}
                  <br>${cta}
                </td>
              </tr>
            </table>
          </td>
        </tr>`;
    })
    .join('');

  const moreCount = items.length > 6 ? items.length - 6 : 0;
  const moreRow = moreCount > 0
    ? `<tr><td style="padding:12px 0;color:#6b7280;font-size:13px;">…and ${moreCount} more item${moreCount > 1 ? 's' : ''} in your wishlist.</td></tr>`
    : '';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Your Wishlist at ${escHtml(storeName)}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f3f4f6;padding:32px 16px;">
  <tr>
    <td align="center">
      <table cellpadding="0" cellspacing="0" border="0" width="560" style="background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">

        <!-- Header -->
        <tr>
          <td style="background:#111827;padding:28px 32px;text-align:center;">
            <span style="font-size:22px;font-weight:700;color:#fff;letter-spacing:-0.5px;">
              ♥ ${escHtml(storeName)}
            </span>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px 32px 8px;">
            <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">
              Don't forget your Wishlist!
            </h1>
            <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.5;">
              You saved some great products. They're still waiting for you.
            </p>

            <!-- Products -->
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              ${productRows}
              ${moreRow}
            </table>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:24px 32px 32px;text-align:center;">
            <a href="${storeUrl}/pages/wishlist"
               style="display:inline-block;padding:14px 32px;background:#ef4444;color:#fff;font-size:15px;font-weight:600;border-radius:6px;text-decoration:none;letter-spacing:0.2px;">
              View My Wishlist →
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #e5e7eb;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5;">
              You received this because you saved a wishlist at
              <a href="${storeUrl}" style="color:#6b7280;">${escHtml(storeName)}</a>.<br>
              Prices and availability may have changed since you saved these items.
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`.trim();
}

function formatMoney(cents, currency = 'USD') {
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency }).format((cents || 0) / 100);
  } catch {
    return '$' + ((cents || 0) / 100).toFixed(2);
  }
}

function escHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
