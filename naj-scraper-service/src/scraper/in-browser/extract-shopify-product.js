() => {
  var win = window;
  var activeCurrency =
    (win.Shopify && win.Shopify.currency && win.Shopify.currency.active) ||
    (win.Shopify && win.Shopify.Checkout && win.Shopify.Checkout.currency) ||
    (document.querySelector('meta[property="og:price:currency"]') &&
      document.querySelector('meta[property="og:price:currency"]').getAttribute('content')) ||
    null;

  var scriptEl = document.querySelector(
    'script[type="application/json"][data-product-json], #ProductJson-product-template, script[id*="ProductJson"]'
  );

  var data = null;
  if (scriptEl && scriptEl.textContent) {
    try {
      data = JSON.parse(scriptEl.textContent);
    } catch (e) {}
  }

  if (!data && win.meta && win.meta.product) {
    data = win.meta.product;
  }

  if (!data) return null;

  var variants = data.variants || [];
  var v0 = null;
  for (var i = 0; i < variants.length; i++) {
    if (variants[i].available !== false) {
      v0 = variants[i];
      break;
    }
  }
  if (!v0) v0 = variants[0];
  if (!v0 || (v0.price !== 0 && !v0.price)) return null;

  var cents =
    typeof v0.price === 'string' ? parseInt(v0.price, 10) : v0.price;
  var priceUsd = cents / 100;

  var compareCents = v0.compare_at_price
    ? typeof v0.compare_at_price === 'string'
      ? parseInt(v0.compare_at_price, 10)
      : v0.compare_at_price
    : null;

  var images = [];
  function pushImg(src) {
    if (!src || typeof src !== 'string') return;
    var full = src.indexOf('//') === 0 ? 'https:' + src : src;
    if (full.indexOf('http') === 0 && images.indexOf(full) === -1) images.push(full);
  }

  if (Array.isArray(data.media)) {
    for (var m = 0; m < data.media.length; m++) {
      var item = data.media[m];
      pushImg(
        (item && item.preview_image && item.preview_image.src) ||
          (item && item.src) ||
          (item && item.preview && item.preview.image && item.preview.image.src)
      );
    }
  }
  if (Array.isArray(data.images)) {
    for (var j = 0; j < data.images.length; j++) pushImg(data.images[j]);
  }
  pushImg(data.featured_image);
  if (data.featured_media && data.featured_media.preview && data.featured_media.preview.image) {
    pushImg(data.featured_media.preview.image.src);
  }

  var options = data.options || [];
  var baseCents = cents;
  var variantList = [];
  for (var k = 0; k < variants.length && k < 20; k++) {
    var v = variants[k];
    var vc = typeof v.price === 'string' ? parseInt(v.price, 10) : v.price;
    variantList.push({
      name: options[0] || 'Option',
      value: v.option1 || v.title || 'Default',
      price: vc ? vc / 100 - baseCents / 100 : 0,
    });
  }

  var descHtml = data.description || data.body_html || null;
  var description = descHtml
    ? String(descHtml)
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 3000)
    : null;

  var tagsRaw = data.tags || '';
  var tags = [];
  if (typeof tagsRaw === 'string') {
    tags = tagsRaw.split(',').map(function (t) {
      return t.trim();
    }).filter(Boolean);
  } else if (Array.isArray(tagsRaw)) {
    tags = tagsRaw.map(String);
  }

  var title = data.title || (v0 && v0.name) || null;

  return {
    name: title,
    description: description,
    priceUsd: priceUsd,
    compareAtUsd: compareCents ? compareCents / 100 : null,
    currency: String(activeCurrency || 'USD').toUpperCase(),
    sku: v0.sku || (data.id != null ? String(data.id) : null),
    productType: data.type ? String(data.type).trim() : null,
    tags: tags,
    images: images,
    variants: variantList,
    inStock: v0.available !== false,
  };
}
