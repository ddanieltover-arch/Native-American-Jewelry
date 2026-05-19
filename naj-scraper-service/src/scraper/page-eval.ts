import type { Page } from 'playwright';

/**
 * Run browser-side logic without passing a TS-compiled function into Playwright.
 * tsx/esbuild injects `__name()` into serialized callbacks, which breaks page.evaluate.
 */
export function runInPage<T>(page: Page, fnBody: string): Promise<T> {
  const script = fnBody.trim();
  // Playwright accepts a stringified arrow function and invokes it in the page context.
  return page.evaluate(script) as Promise<T>;
}
