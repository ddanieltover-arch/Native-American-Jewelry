import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { config } from '../config';
import { logger } from '../utils/logger';

// ─── User-agent pool ──────────────────────────────────────
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
];

// ─── Viewport pool ────────────────────────────────────────
const VIEWPORTS = [
  { width: 1280, height: 800  },
  { width: 1440, height: 900  },
  { width: 1920, height: 1080 },
  { width: 1366, height: 768  },
];

function randomUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function randomViewport() {
  return VIEWPORTS[Math.floor(Math.random() * VIEWPORTS.length)];
}

// ─── Browser singleton ────────────────────────────────────
let _browser: Browser | null = null;

export async function getBrowser(): Promise<Browser> {
  if (_browser?.isConnected()) return _browser;

  const launchOptions: Parameters<typeof chromium.launch>[0] = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--window-size=1280,800',
    ],
  };

  // Attach proxy if configured
  if (config.PROXY_SERVER) {
    launchOptions.proxy = {
      server:   config.PROXY_SERVER,
      username: config.PROXY_USERNAME,
      password: config.PROXY_PASSWORD,
    };
    logger.info('Proxy configured', { server: config.PROXY_SERVER });
  }

  _browser = await chromium.launch(launchOptions);
  logger.info('Browser launched');
  return _browser;
}

// ─── Create a new stealth context ─────────────────────────
export async function createStealthContext(): Promise<BrowserContext> {
  const browser = await getBrowser();
  const viewport = randomViewport();
  const userAgent = randomUA();

  const context = await browser.newContext({
    userAgent,
    viewport,
    locale:         'en-US',
    timezoneId:     'America/New_York',
    geolocation:    { latitude: 40.7128, longitude: -74.006 },
    permissions:    ['geolocation'],
    javaScriptEnabled: true,
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT':             '1',
      'Upgrade-Insecure-Requests': '1',
    },
  });

  // ── Stealth patches ──────────────────────────────────────
  await context.addInitScript(() => {
    // Override navigator.webdriver
    Object.defineProperty(navigator, 'webdriver', { get: () => false });

    // Override plugins
    Object.defineProperty(navigator, 'plugins', {
      get: () => [{ name: 'Chrome PDF Plugin' }, { name: 'Chrome PDF Viewer' }],
    });

    // Override languages
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en'],
    });

    // Add chrome runtime
    (window as any).chrome = {
      runtime: {},
      loadTimes: () => {},
      csi: () => {},
    };

    // Canvas fingerprint noise
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type: any, ...args: any[]) {
      const ctx = originalGetContext.apply(this, [type, ...args]);
      if (type === '2d' && ctx) {
        const origFill = (ctx as CanvasRenderingContext2D).fillText.bind(ctx);
        (ctx as CanvasRenderingContext2D).fillText = (...fArgs: any[]) => {
          (ctx as CanvasRenderingContext2D).shadowBlur = Math.random() * 0.1;
          return (origFill as any)(...fArgs);
        };
      }
      return ctx;
    };
  });

  return context;
}

// ─── Create a page with standard error handling ───────────
export async function createPage(context: BrowserContext): Promise<Page> {
  const page = await context.newPage();

  // Block unnecessary resources to speed up scraping
  await page.route('**/*', (route) => {
    const resourceType = route.request().resourceType();
    const blockedTypes = ['font', 'media', 'websocket'];
    const blockedDomains = [
      'google-analytics.com', 'googletagmanager.com', 'facebook.com',
      'doubleclick.net', 'analytics', 'hotjar.com', 'intercom.io',
    ];
    const url = route.request().url();

    if (
      blockedTypes.includes(resourceType) ||
      blockedDomains.some((d) => url.includes(d))
    ) {
      route.abort();
    } else {
      route.continue();
    }
  });

  // Set default timeout
  page.setDefaultTimeout(config.PAGE_TIMEOUT_MS);
  page.setDefaultNavigationTimeout(config.PAGE_TIMEOUT_MS);

  return page;
}

// ─── Safe navigation with retry ──────────────────────────
export async function safeGoto(
  page: Page,
  url:  string,
  retries = 2
): Promise<boolean> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout:   config.PAGE_TIMEOUT_MS,
      });

      if (response && response.status() >= 400) {
        logger.warn(`HTTP ${response.status()} for ${url}`, { attempt });
        return false;
      }

      return true;
    } catch (err) {
      if (attempt === retries) {
        logger.error(`Navigation failed after ${retries + 1} attempts: ${url}`, { err });
        return false;
      }
      logger.warn(`Navigation retry ${attempt + 1} for ${url}`);
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
    }
  }
  return false;
}

// ─── Handle infinite scroll ───────────────────────────────
export async function scrollToBottom(page: Page, maxScrolls = 20): Promise<void> {
  let prevHeight = 0;
  let unchanged = 0;

  for (let i = 0; i < maxScrolls; i++) {
    const height: number = await page.evaluate(() => document.body.scrollHeight);

    if (height === prevHeight) {
      unchanged++;
      if (unchanged >= 2) break; // two unchanged passes = fully scrolled
    } else {
      unchanged = 0;
    }

    prevHeight = height;
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1200 + Math.random() * 800);
  }
}

// ─── Close browser cleanly ────────────────────────────────
export async function closeBrowser(): Promise<void> {
  if (_browser) {
    await _browser.close();
    _browser = null;
    logger.info('Browser closed');
  }
}
