# Deploy scraper to Render

You need **two Render services** (API + worker) and **one Redis** (Upstash recommended).

After deploy, your scraper host URL is:

```text
https://naj-scraper-api.onrender.com
```

Set that as `SCRAPER_SERVICE_URL` in Vercel (admin dashboard env vars).

---

## Step 1 — Redis (Upstash, free tier)

1. Go to [upstash.com](https://upstash.com) → Create database → **Redis**
2. Region: pick one close to **Oregon (US West)** if using Render Oregon
3. Copy the **Redis URL** (starts with `rediss://`)

You will paste this as `REDIS_URL` on both Render services.

---

## Step 2 — Deploy on Render (Blueprint)

1. [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**
2. Connect repo: `ddanieltover-arch/Native-American-Jewelry`
3. Render reads [`render.yaml`](../render.yaml) at repo root
4. Creates `naj-scraper-api` (web) and `naj-scraper-worker` (background worker)

First deploy takes **10–15 minutes** (Docker + Playwright Chromium).

---

## Step 3 — Environment variables (both services)

Add the **same** variables to **naj-scraper-api** and **naj-scraper-worker**:

| Key | Value |
|-----|--------|
| `SUPABASE_URL` | `https://juddflbuwnymmwyyekrw.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | *(your service role key)* |
| `SUPABASE_STORAGE_BUCKET` | `product-images` |
| `REDIS_URL` | *(Upstash URL from step 1)* |
| `TARGET_URL` | `https://hippiecowgirlcouture.com` |
| `MIN_PRICE_FILTER` | `150` |
| `DISCOUNT_RATE` | `0.05` |
| `SCRAPER_API_KEY` | *(long random string — see below)* |
| `RESEND_API_KEY` | *(your Resend key)* |
| `FROM_EMAIL` | `orders@nativeamericanjewelry.com` |
| `ADMIN_EMAIL` | `daniellenavajojewelry@gmail.com` |

Generate API key (PowerShell):

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
```

Use the **same** `SCRAPER_API_KEY` in:

- Render → both scraper services
- Vercel → admin project (as `SCRAPER_API_KEY`)

---

## Step 4 — Your scraper URL

When **naj-scraper-api** is live, Render shows a URL like:

```text
https://naj-scraper-api.onrender.com
```

Test:

```bash
curl https://naj-scraper-api.onrender.com/health
```

Trigger scrape (replace key):

```bash
curl -X POST https://naj-scraper-api.onrender.com/scrape/trigger \
  -H "x-api-key: YOUR_SCRAPER_API_KEY"
```

---

## Step 5 — Wire admin (Vercel)

In **naj-admin-dashboard** on Vercel → Environment Variables:

```env
SCRAPER_SERVICE_URL=https://naj-scraper-api.onrender.com
SCRAPER_API_KEY=<same key as Render>
```

Redeploy admin after saving.

---

## Manual deploy (without Blueprint)

If Blueprint fails, create two services manually:

| Setting | naj-scraper-api | naj-scraper-worker |
|---------|-----------------|---------------------|
| Type | **Web Service** | **Background Worker** |
| Root directory | `naj-scraper-service` | `naj-scraper-service` |
| Runtime | Docker | Docker |
| Docker command | `node dist/index.js` | `node dist/worker.js` |
| Health check | `/health` | — |

---

## Notes

- **Starter plan** ($7/mo per service) avoids cold starts; free web tier sleeps after 15 min idle.
- Playwright needs Docker — do not use Render “Node” runtime without Docker.
- Worker must stay running for queue jobs and scheduled scrapes.
- Legal: scraping for resale may violate source site terms — review before production use.
