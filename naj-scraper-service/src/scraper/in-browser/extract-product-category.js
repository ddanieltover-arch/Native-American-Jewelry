() => {
  var crumbs = [];
  var links = document.querySelectorAll(
    'nav[aria-label*="breadcrumb"] a, .breadcrumb a, [class*="breadcrumb"] a'
  );
  for (var i = 0; i < links.length; i++) {
    var t = (links[i].textContent || '').trim();
    if (t && !/home|shop|products?/i.test(t)) crumbs.push(t);
  }

  if (crumbs.length >= 1) {
    var last = crumbs[crumbs.length - 1];
    if (last && last.length > 1 && last.length < 80) return last;
  }

  var typeEl = document.querySelector('[class*="product-type"], .product__type');
  var typeText = typeEl && typeEl.textContent ? typeEl.textContent.trim() : '';
  if (typeText && typeText.length > 1) return typeText;

  return null;
}
