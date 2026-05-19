import 'dotenv/config';
import { createStealthContext, createPage, safeGoto } from '../src/scraper/browser';
import { withUsdCurrency, normalizeShopifyProductUrl } from '../src/scraper/shopify';
import { extractProductData } from '../src/scraper/extractor';
import { closeBrowser } from '../src/scraper/browser';

const url = process.argv[2] ?? 'https://hippiecowgirlcouture.com/products/cotton-candy-concho-earrings';

(async () => {
  const ctx = await createStealthContext();
  const page = await createPage(ctx);
  const target = withUsdCurrency(url);
  const ok = await safeGoto(page, target);
  console.log('goto', ok, 'url', page.url());

  const canon = normalizeShopifyProductUrl(url)!;
  const steps = [
    async () => {
      const { extractShopifyProduct } = await import('../src/scraper/shopify');
      return extractShopifyProduct(page);
    },
    async () => extractProductData(page, canon, 'Earrings'),
  ];

  for (const step of steps) {
    try {
      const r = await step();
      console.log('OK', typeof r === 'object' && r && 'name' in r
        ? { name: (r as { name: string }).name, price: (r as { price: number }).price }
        : r);
    } catch (e) {
      console.error('FAIL', e);
      if (e instanceof Error) {
        console.error('message', e.message);
        console.error('stack', e.stack);
      }
    }
  }

  await page.close();
  await ctx.close();
  await closeBrowser();
})();
