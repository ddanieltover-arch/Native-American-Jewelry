() => {
  function getMeta(property) {
    var el =
      document.querySelector('meta[property="' + property + '"]') ||
      document.querySelector('meta[name="' + property + '"]');
    return el ? el.getAttribute('content') : null;
  }

  function getAll(property) {
    var nodes = document.querySelectorAll('meta[property="' + property + '"]');
    var out = [];
    for (var i = 0; i < nodes.length; i++) {
      var c = nodes[i].getAttribute('content');
      if (c) out.push(c);
    }
    return out;
  }

  var priceEl =
    document.querySelector('[class*="price"]:not([class*="compare"]):not([class*="original"])') ||
    document.querySelector('.product-price') ||
    document.querySelector('[data-price]') ||
    document.querySelector('.price');

  var titleEl =
    document.querySelector('h1.product-title') ||
    document.querySelector('h1[class*="product"]') ||
    document.querySelector('h1');

  var descEl =
    document.querySelector('[class*="product-description"]') ||
    document.querySelector('[class*="description"]') ||
    document.querySelector('.product-body');

  return {
    ogTitle: getMeta('og:title'),
    ogDesc: getMeta('og:description'),
    ogImage: getMeta('og:image'),
    ogImages: getAll('og:image'),
    ogPrice: getMeta('product:price:amount') || getMeta('og:price:amount'),
    domTitle: titleEl && titleEl.textContent ? titleEl.textContent.trim() : null,
    domDesc: descEl && descEl.textContent ? descEl.textContent.trim() : null,
    domPrice:
      (priceEl && priceEl.textContent ? priceEl.textContent.trim() : null) ||
      (priceEl ? priceEl.getAttribute('data-price') : null),
    inStock: !document.querySelector('.sold-out, .out-of-stock, [class*="unavailable"]'),
  };
}
