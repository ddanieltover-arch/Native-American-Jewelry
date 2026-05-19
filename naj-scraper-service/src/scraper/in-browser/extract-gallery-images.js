() => {
  var selectors = [
    'media-gallery img',
    '.product__media-item img',
    '.product__media img',
    '.product-media img',
    '.product-media-container img',
    '[data-product-media] img',
    '.product-gallery img',
    '.product-single__photo img',
    '.product__modal-opener img',
    '.thumbnail-list img',
    '.product__thumbs img',
    'slideshow-component img',
    '.product-image-main img',
  ];

  var found = [];
  function push(src) {
    if (!src) return;
    var url = src;
    if (url.indexOf('//') === 0) url = 'https:' + url;
    if (url.indexOf('http') !== 0) return;
    if (/logo|icon|sprite|badge/i.test(url)) return;
    var size = url.match(/_(\d+)x(\d+)/i);
    if (size && parseInt(size[1], 10) < 80) return;
    if (found.indexOf(url) === -1) found.push(url);
  }

  for (var s = 0; s < selectors.length; s++) {
    var imgs = document.querySelectorAll(selectors[s]);
    for (var i = 0; i < imgs.length; i++) {
      var img = imgs[i];
      push(
        img.getAttribute('data-src') ||
          (img.getAttribute('data-srcset') || '').split(/\s+/)[0] ||
          img.currentSrc ||
          img.src
      );
    }
  }

  var links = document.querySelectorAll('a[href*="/cdn/shop/products/"]');
  for (var a = 0; a < links.length; a++) push(links[a].href);

  return found;
}
