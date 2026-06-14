(function () {
  'use strict';

  /* ================================================================
     1. STORAGE
  ================================================================ */
  var STORAGE_KEY = 'wbify_wishlist';

  function getItems() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch (e) { return []; }
  }

  function saveItems(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  function isWishlisted(productId) {
    var id = String(productId);
    return getItems().some(function (i) { return String(i.id) === id; });
  }

  function addItem(data) {
    var id = String(data.id);
    var items = getItems().filter(function (i) { return String(i.id) !== id; });
    items.push(Object.assign({}, data, { id: id, addedAt: Date.now() }));
    saveItems(items);
  }

  function removeItem(productId) {
    var id = String(productId);
    saveItems(getItems().filter(function (i) { return String(i.id) !== id; }));
  }

  function toggleItem(data) {
    if (isWishlisted(data.id)) { removeItem(data.id); return false; }
    addItem(data); return true;
  }

  function getCount() { return getItems().length; }

  /* ================================================================
     2. COUNT BADGES
  ================================================================ */
  function updateCountBadges() {
    var count = getCount();
    document.querySelectorAll('[data-wishlist-count]').forEach(function (el) {
      el.textContent = count;
      el.style.display = count > 0 ? '' : 'none';
    });
  }

  /* ================================================================
     3. BUTTON STATE
  ================================================================ */
  function updateButtonState(btn, wishlisted) {
    btn.setAttribute('aria-pressed', wishlisted ? 'true' : 'false');
    btn.classList.toggle('wbify-wishlisted', wishlisted);
    var icon = btn.querySelector('[data-wishlist-icon]');
    if (icon) icon.classList.toggle('wbify-wishlisted', wishlisted);
    var label = btn.querySelector('[data-wishlist-label]');
    if (label) {
      label.textContent = wishlisted
        ? (btn.dataset.removeText || 'Remove from Wishlist')
        : (btn.dataset.addText || 'Add to Wishlist');
    }
    btn.setAttribute('aria-label', wishlisted
      ? (btn.dataset.removeText || 'Remove from Wishlist')
      : (btn.dataset.addText || 'Add to Wishlist'));
  }

  function getProductDataFromBtn(btn) {
    return {
      id: btn.dataset.productId,
      handle: btn.dataset.productHandle || '',
      title: btn.dataset.productTitle || '',
      price: parseInt(btn.dataset.productPrice || '0', 10),
      compare_at_price: parseInt(btn.dataset.productCompare || '0', 10),
      image: btn.dataset.productImage || '',
      available: btn.dataset.productAvailable === 'true',
      url: btn.dataset.productUrl || ('/products/' + btn.dataset.productHandle),
      variantId: btn.dataset.productVariantId || '',
    };
  }

  function initButtons() {
    document.querySelectorAll('[data-wishlist-btn]').forEach(function (btn) {
      var id = btn.dataset.productId;
      if (!id || btn._wbifyInit) return;
      btn._wbifyInit = true;
      updateButtonState(btn, isWishlisted(id));
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var added = toggleItem(getProductDataFromBtn(btn));
        updateButtonState(btn, added);
        updateCountBadges();
        document.querySelectorAll('[data-wishlist-btn][data-product-id="' + id + '"]').forEach(function (b) {
          if (b !== btn) updateButtonState(b, added);
        });
        document.dispatchEvent(new CustomEvent('wbify:changed', {
          bubbles: true,
          detail: { productId: id, added: added, count: getCount() },
        }));
      });
    });
  }

  /* ================================================================
     4. HELPERS
  ================================================================ */
  function escapeHtml(s) {
    var d = document.createElement('div');
    d.textContent = String(s == null ? '' : s);
    return d.innerHTML;
  }

  function formatMoney(cents) {
    var amount = (cents || 0) / 100;
    var locale = document.documentElement.lang || 'en';
    var currency = (window.Shopify && window.Shopify.currency && window.Shopify.currency.active) || 'USD';
    try { return new Intl.NumberFormat(locale, { style: 'currency', currency: currency }).format(amount); }
    catch (e) { return '$' + amount.toFixed(2); }
  }

  var HEART_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';

  var CHECK_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><polyline points="20 6 9 17 4 12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>';

  var SPINNER_SVG = '<svg class="wbify-spin" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/></svg>';

  /* ================================================================
     5. CART OPERATIONS
  ================================================================ */
  function addToCart(variantId, btnEl) {
    if (!variantId) return Promise.resolve();
    var origHTML = btnEl.innerHTML;
    btnEl.disabled = true;
    btnEl.innerHTML = SPINNER_SVG;

    return fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: parseInt(variantId, 10), quantity: 1 }),
    }).then(function (res) {
      if (!res.ok) throw new Error('cart-add failed');
      btnEl.innerHTML = CHECK_SVG + ' Added!';
      btnEl.classList.add('wbify-btn--added');
      // Let the theme update its cart count
      document.dispatchEvent(new CustomEvent('cart:refresh', { bubbles: true }));
      document.dispatchEvent(new CustomEvent('cartUpdate', { bubbles: true }));
      setTimeout(function () {
        btnEl.innerHTML = origHTML;
        btnEl.classList.remove('wbify-btn--added');
        btnEl.disabled = false;
      }, 2200);
    }).catch(function () {
      btnEl.innerHTML = origHTML;
      btnEl.disabled = false;
    });
  }

  function addAllToCart(btn) {
    var items = getItems().filter(function (i) { return i.available && i.variantId; });
    if (!items.length) return;
    var origText = btn.dataset.origText || btn.textContent;
    btn.dataset.origText = origText;
    btn.disabled = true;
    btn.innerHTML = SPINNER_SVG + ' Adding…';

    var payload = items.map(function (i) { return { id: parseInt(i.variantId, 10), quantity: 1 }; });
    fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: payload }),
    }).then(function (res) {
      if (!res.ok) throw new Error('failed');
      btn.innerHTML = CHECK_SVG + ' All Added!';
      btn.classList.add('wbify-btn--added');
      document.dispatchEvent(new CustomEvent('cart:refresh', { bubbles: true }));
      document.dispatchEvent(new CustomEvent('cartUpdate', { bubbles: true }));
      setTimeout(function () {
        btn.innerHTML = origText;
        btn.classList.remove('wbify-btn--added');
        btn.disabled = false;
      }, 2500);
    }).catch(function () {
      btn.innerHTML = origText;
      btn.disabled = false;
    });
  }

  /* ================================================================
     6. SHARE WISHLIST
  ================================================================ */
  function getShareUrl() {
    var handles = getItems().map(function (i) { return i.handle; }).filter(Boolean);
    if (!handles.length) return window.location.href;
    return (
      window.location.origin +
      window.location.pathname +
      '?share=' + encodeURIComponent(handles.join(','))
    );
  }

  function openShareWindow(url) {
    window.open(url, '_blank', 'width=620,height=440,noopener,noreferrer');
  }

  function buildShareSection(container, shareTitle, shareText) {
    var url = getShareUrl();
    var text = shareText || 'Check out my wishlist!';

    var section = document.createElement('div');
    section.className = 'wbify-share';
    section.innerHTML = (
      '<p class="wbify-share__title">' + escapeHtml(shareTitle || 'Share your Wishlist') + '</p>' +
      '<div class="wbify-share__buttons">' +
        '<button class="wbify-share-btn wbify-share-btn--facebook" data-share="facebook">' +
          '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>' +
          'Facebook' +
        '</button>' +
        '<button class="wbify-share-btn wbify-share-btn--whatsapp" data-share="whatsapp">' +
          '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zm-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884z"/></svg>' +
          'WhatsApp' +
        '</button>' +
        '<button class="wbify-share-btn wbify-share-btn--twitter" data-share="twitter">' +
          '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>' +
          'X / Twitter' +
        '</button>' +
        '<button class="wbify-share-btn wbify-share-btn--copy" data-share="copy">' +
          '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>' +
          'Copy Link' +
        '</button>' +
      '</div>' +
      '<div class="wbify-share__url-row">' +
        '<input class="wbify-share__url-input" type="text" readonly value="' + escapeHtml(url) + '" data-share-url aria-label="Shareable wishlist link">' +
      '</div>'
    );

    container.appendChild(section);

    section.querySelector('[data-share="facebook"]').addEventListener('click', function () {
      openShareWindow('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url));
    });
    section.querySelector('[data-share="whatsapp"]').addEventListener('click', function () {
      openShareWindow('https://wa.me/?text=' + encodeURIComponent(text + '\n' + url));
    });
    section.querySelector('[data-share="twitter"]').addEventListener('click', function () {
      openShareWindow('https://twitter.com/intent/tweet?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(text));
    });
    var copyBtn = section.querySelector('[data-share="copy"]');
    copyBtn.addEventListener('click', function () {
      var input = section.querySelector('[data-share-url]');
      navigator.clipboard.writeText(url).then(function () {
        copyBtn.innerHTML = CHECK_SVG + ' Copied!';
        copyBtn.classList.add('wbify-share-btn--copied');
        setTimeout(function () {
          copyBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy Link';
          copyBtn.classList.remove('wbify-share-btn--copied');
        }, 2000);
      }).catch(function () {
        if (input) { input.select(); document.execCommand('copy'); }
      });
    });
  }

  /* ================================================================
     7. SHARED WISHLIST (read-only view for someone else's share link)
  ================================================================ */
  function getShareParam() {
    try {
      var val = new URLSearchParams(window.location.search).get('share');
      return val ? decodeURIComponent(val).split(',').filter(Boolean) : null;
    } catch (e) { return null; }
  }

  function loadSharedItems(handles) {
    return Promise.all(handles.map(function (h) {
      return fetch('/products/' + encodeURIComponent(h) + '.js')
        .then(function (r) { return r.ok ? r.json() : null; })
        .catch(function () { return null; });
    }));
  }

  function renderSharedWishlist(container, rawProducts) {
    var products = rawProducts.filter(Boolean);
    container.innerHTML = '';

    var header = document.createElement('div');
    header.className = 'wbify-page__header';
    header.innerHTML = (
      '<h2 class="wbify-page__heading">Shared Wishlist</h2>' +
      '<a href="' + window.location.pathname + '" class="wbify-btn wbify-btn--ghost" style="width:auto">My Wishlist →</a>'
    );
    container.appendChild(header);

    if (!products.length) {
      var empty = document.createElement('p');
      empty.className = 'wbify-empty';
      empty.textContent = 'This shared wishlist is empty.';
      container.appendChild(empty);
      return;
    }

    var grid = document.createElement('div');
    grid.className = 'wbify-grid';

    products.forEach(function (p) {
      var variants = p.variants || [];
      var variant = variants.find(function (v) { return v.available; }) || variants[0] || {};
      var images = p.images || [];
      var imgSrc = images[0] ? (typeof images[0] === 'string' ? images[0] : images[0].src) : '';
      var priceCents = p.price_min || 0;
      var compareCents = p.compare_at_price_min || 0;
      var productUrl = p.url || ('/products/' + p.handle);

      var card = document.createElement('div');
      card.className = 'wbify-card';
      card.innerHTML = (
        '<div class="wbify-card__image">' +
          (imgSrc ? '<a href="' + escapeHtml(productUrl) + '" tabindex="-1"><img src="' + escapeHtml(imgSrc) + '" alt="' + escapeHtml(p.title) + '" loading="lazy"></a>' : '<div class="wbify-card__no-image"></div>') +
        '</div>' +
        '<div class="wbify-card__info">' +
          '<h3 class="wbify-card__title"><a href="' + escapeHtml(productUrl) + '">' + escapeHtml(p.title) + '</a></h3>' +
          '<div class="wbify-card__pricing">' +
            '<span class="wbify-card__price">' + formatMoney(priceCents) + '</span>' +
            (compareCents > priceCents ? '<s class="wbify-card__compare">' + formatMoney(compareCents) + '</s>' : '') +
          '</div>' +
          (!p.available ? '<span class="wbify-card__badge wbify-card__badge--sold-out">Sold out</span>' : '') +
        '</div>' +
        '<div class="wbify-card__actions">' +
          (p.available && variant.id ? '<button class="wbify-btn wbify-btn--cart" data-cart-add data-variant-id="' + variant.id + '">Add to Cart</button>' : '') +
          '<button class="wbify-btn wbify-btn--outline"' +
            ' data-wishlist-btn' +
            ' data-product-id="' + escapeHtml(String(p.id)) + '"' +
            ' data-product-handle="' + escapeHtml(p.handle) + '"' +
            ' data-product-title="' + escapeHtml(p.title) + '"' +
            ' data-product-price="' + priceCents + '"' +
            ' data-product-compare="' + compareCents + '"' +
            ' data-product-image="' + escapeHtml(imgSrc) + '"' +
            ' data-product-available="' + p.available + '"' +
            ' data-product-url="' + escapeHtml(productUrl) + '"' +
            ' data-product-variant-id="' + (variant.id || '') + '"' +
            ' data-add-text="Save to My Wishlist"' +
            ' data-remove-text="Saved ✓"' +
          '>Save to My Wishlist</button>' +
        '</div>'
      );
      grid.appendChild(card);
    });

    container.appendChild(grid);

    grid.querySelectorAll('[data-cart-add]').forEach(function (btn) {
      btn.addEventListener('click', function () { addToCart(btn.dataset.variantId, btn); });
    });

    initButtons();
    updateCountBadges();
  }

  /* ================================================================
     8. EMAIL REMINDER
  ================================================================ */
  function buildEmailSection(container, settings) {
    var section = document.createElement('div');
    section.className = 'wbify-email-reminder';
    section.innerHTML = (
      '<div class="wbify-email-reminder__inner">' +
        '<div class="wbify-email-reminder__icon" aria-hidden="true">✉️</div>' +
        '<div class="wbify-email-reminder__body">' +
          '<p class="wbify-email-reminder__heading">' + escapeHtml(settings.emailHeading || 'Never lose your Wishlist') + '</p>' +
          '<p class="wbify-email-reminder__desc">We\'ll email you a link to your wishlist so you can come back anytime.</p>' +
          '<form class="wbify-email-form" novalidate>' +
            '<input class="wbify-email-input" type="email" placeholder="' + escapeHtml(settings.emailPlaceholder || 'Enter your email') + '" required autocomplete="email">' +
            '<button class="wbify-btn wbify-btn--primary wbify-email-submit" type="submit">' + escapeHtml(settings.emailSubmit || 'Send me a reminder') + '</button>' +
          '</form>' +
          '<p class="wbify-email-success" role="status" style="display:none">' + CHECK_SVG + ' ' + escapeHtml(settings.emailSuccess || "Done! We'll remind you about your wishlist.") + '</p>' +
          '<p class="wbify-email-error" role="alert" style="display:none">Something went wrong. Please try again.</p>' +
        '</div>' +
      '</div>'
    );

    container.appendChild(section);

    var form = section.querySelector('.wbify-email-form');
    var input = section.querySelector('.wbify-email-input');
    var submitBtn = section.querySelector('.wbify-email-submit');
    var successMsg = section.querySelector('.wbify-email-success');
    var errorMsg = section.querySelector('.wbify-email-error');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = input.value.trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        input.focus();
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = SPINNER_SVG + ' Sending…';
      errorMsg.style.display = 'none';

      fetch(settings.proxyUrl || '/apps/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'email', email: email, items: getItems() }),
      }).then(function (res) {
        if (!res.ok) throw new Error('server error');
        form.style.display = 'none';
        successMsg.style.display = '';
      }).catch(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = settings.emailSubmit || 'Send me a reminder';
        errorMsg.style.display = '';
      });
    });
  }

  /* ================================================================
     9. CARD HTML BUILDER
  ================================================================ */
  function buildCardHTML(item) {
    var compareHtml = (item.compare_at_price > item.price)
      ? '<s class="wbify-card__compare">' + formatMoney(item.compare_at_price) + '</s>'
      : '';
    var imageHtml = item.image
      ? '<a href="' + escapeHtml(item.url) + '" tabindex="-1"><img src="' + escapeHtml(item.image) + '" alt="' + escapeHtml(item.title) + '" loading="lazy"></a>'
      : '<div class="wbify-card__no-image"></div>';
    var cartBtn = (item.available && item.variantId)
      ? '<button class="wbify-btn wbify-btn--cart" data-cart-add data-variant-id="' + escapeHtml(item.variantId) + '">Add to Cart</button>'
      : (item.available ? '<a href="' + escapeHtml(item.url) + '" class="wbify-btn wbify-btn--primary">View Product</a>' : '');

    return (
      '<div class="wbify-card__image">' + imageHtml + '</div>' +
      '<div class="wbify-card__info">' +
        '<h3 class="wbify-card__title"><a href="' + escapeHtml(item.url) + '">' + escapeHtml(item.title) + '</a></h3>' +
        '<div class="wbify-card__pricing">' +
          '<span class="wbify-card__price">' + formatMoney(item.price) + '</span>' +
          compareHtml +
        '</div>' +
        (!item.available ? '<span class="wbify-card__badge wbify-card__badge--sold-out">Sold out</span>' : '') +
      '</div>' +
      '<div class="wbify-card__actions">' +
        cartBtn +
        '<button' +
          ' class="wbify-btn wbify-btn--remove"' +
          ' data-wishlist-btn' +
          ' data-product-id="' + escapeHtml(item.id) + '"' +
          ' data-product-handle="' + escapeHtml(item.handle) + '"' +
          ' data-product-title="' + escapeHtml(item.title) + '"' +
          ' data-product-price="' + item.price + '"' +
          ' data-product-compare="' + item.compare_at_price + '"' +
          ' data-product-image="' + escapeHtml(item.image) + '"' +
          ' data-product-available="' + item.available + '"' +
          ' data-product-url="' + escapeHtml(item.url) + '"' +
          ' data-product-variant-id="' + escapeHtml(item.variantId || '') + '"' +
          ' data-add-text="Add to Wishlist"' +
          ' data-remove-text="Remove"' +
          ' aria-label="Remove from wishlist"' +
        '>' +
          '<span data-wishlist-icon class="wbify-heart wbify-wishlisted">' + HEART_SVG + '</span>' +
          '<span data-wishlist-label>Remove</span>' +
        '</button>' +
      '</div>'
    );
  }

  /* ================================================================
     10. WISHLIST PAGE RENDERER
  ================================================================ */
  function renderWishlistPage(container) {
    var items = getItems();
    var s = {
      heading:          container.dataset.heading          || 'My Wishlist',
      emptyText:        container.dataset.emptyText        || 'Your wishlist is empty.',
      clearText:        container.dataset.clearText        || 'Clear Wishlist',
      addAllText:       container.dataset.addAllText       || 'Add All to Cart',
      shareTitle:       container.dataset.shareTitle       || 'Share your Wishlist',
      shareText:        container.dataset.shareText        || 'Check out my wishlist!',
      emailEnabled:     container.dataset.emailEnabled     !== 'false',
      emailHeading:     container.dataset.emailHeading     || 'Never lose your Wishlist',
      emailPlaceholder: container.dataset.emailPlaceholder || 'Enter your email address',
      emailSubmit:      container.dataset.emailSubmit      || 'Send me a reminder',
      emailSuccess:     container.dataset.emailSuccess     || "Done! We'll remind you.",
      proxyUrl:         container.dataset.proxyUrl         || '/apps/wishlist',
    };

    container.innerHTML = '';

    /* Header */
    var header = document.createElement('div');
    header.className = 'wbify-page__header';
    var hasCartItems = items.some(function (i) { return i.available && i.variantId; });
    header.innerHTML = (
      '<h2 class="wbify-page__heading">' + escapeHtml(s.heading) + '</h2>' +
      (items.length > 0
        ? '<div class="wbify-page__actions">' +
            (hasCartItems ? '<button class="wbify-btn wbify-btn--primary" data-add-all>' + escapeHtml(s.addAllText) + '</button>' : '') +
            '<button class="wbify-btn wbify-btn--ghost" data-wishlist-clear>' + escapeHtml(s.clearText) + '</button>' +
          '</div>'
        : '')
    );
    container.appendChild(header);

    /* Empty state */
    if (items.length === 0) {
      var empty = document.createElement('p');
      empty.className = 'wbify-empty';
      empty.textContent = s.emptyText;
      container.appendChild(empty);
      if (s.emailEnabled) buildEmailSection(container, s);
      return;
    }

    /* Product grid */
    var grid = document.createElement('div');
    grid.className = 'wbify-grid';
    items.forEach(function (item) {
      var card = document.createElement('div');
      card.className = 'wbify-card';
      card.dataset.productId = item.id;
      card.innerHTML = buildCardHTML(item);
      grid.appendChild(card);
    });
    container.appendChild(grid);

    /* Cart buttons */
    grid.querySelectorAll('[data-cart-add]').forEach(function (btn) {
      btn.addEventListener('click', function () { addToCart(btn.dataset.variantId, btn); });
    });

    /* Add All to Cart */
    var addAllBtn = header.querySelector('[data-add-all]');
    if (addAllBtn) {
      addAllBtn.addEventListener('click', function () { addAllToCart(addAllBtn); });
    }

    /* Clear wishlist */
    var clearBtn = header.querySelector('[data-wishlist-clear]');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        saveItems([]);
        updateCountBadges();
        renderWishlistPage(container);
        document.dispatchEvent(new CustomEvent('wbify:changed', { bubbles: true, detail: { count: 0 } }));
      });
    }

    /* Remove cards on wishlist change */
    var removeListener = function (e) {
      if (!e.detail || !e.detail.productId || e.detail.added !== false) return;
      var card = grid.querySelector('.wbify-card[data-product-id="' + e.detail.productId + '"]');
      if (!card) return;
      card.remove();
      updateCountBadges();
      if (grid.children.length === 0) {
        document.removeEventListener('wbify:changed', removeListener);
        renderWishlistPage(container);
      }
    };
    document.addEventListener('wbify:changed', removeListener);

    /* Share section */
    buildShareSection(container, s.shareTitle, s.shareText);

    /* Email reminder */
    if (s.emailEnabled) buildEmailSection(container, s);

    initButtons();
  }

  /* ================================================================
     11. SERVER SYNC (localStorage → customer metafield when logged in)
  ================================================================ */
  var syncTimer = null;

  function syncToServer() {
    var cid = window.Shopify && window.Shopify.customerId ? String(window.Shopify.customerId) : null;
    if (!cid) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(function () {
      fetch('/apps/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: getItems(), customerId: cid }),
      }).catch(function () {});
    }, 1000);
  }

  document.addEventListener('wbify:changed', syncToServer);

  /* ================================================================
     12. CROSS-TAB SYNC
  ================================================================ */
  window.addEventListener('storage', function (e) {
    if (e.key !== STORAGE_KEY) return;
    updateCountBadges();
    var pc = document.querySelector('[data-wishlist-page]');
    if (pc && !getShareParam()) renderWishlistPage(pc);
    document.querySelectorAll('[data-wishlist-btn]').forEach(function (btn) {
      var id = btn.dataset.productId;
      if (id) updateButtonState(btn, isWishlisted(id));
    });
  });

  /* ================================================================
     13. INIT
  ================================================================ */
  function init() {
    var pageContainer = document.querySelector('[data-wishlist-page]');
    var shareHandles = getShareParam();

    if (pageContainer && shareHandles) {
      pageContainer.innerHTML = '<p class="wbify-loading-state">Loading shared wishlist…</p>';
      loadSharedItems(shareHandles).then(function (products) {
        renderSharedWishlist(pageContainer, products);
      });
    } else if (pageContainer) {
      renderWishlistPage(pageContainer);
    }

    initButtons();
    updateCountBadges();
    syncToServer();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ================================================================
     14. PUBLIC API
  ================================================================ */
  window.WbifyWishlist = {
    getItems: getItems,
    getCount: getCount,
    isWishlisted: isWishlisted,
    addItem: addItem,
    removeItem: removeItem,
    getShareUrl: getShareUrl,
    refresh: function () { initButtons(); updateCountBadges(); },
  };
})();
