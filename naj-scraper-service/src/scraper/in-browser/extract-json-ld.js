() => {
  var scripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (var i = 0; i < scripts.length; i++) {
    try {
      var data = JSON.parse(scripts[i].textContent || '');
      var items = Array.isArray(data['@graph']) ? data['@graph'] : [data];
      for (var j = 0; j < items.length; j++) {
        if (items[j]['@type'] === 'Product') return items[j];
      }
    } catch (e) {}
  }
  return null;
}
