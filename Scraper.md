You are a senior full-stack engineer, data scraper architect, and AI automation expert.

Your task is to DESIGN and BUILD a production-ready modular “skill” that integrates into an existing ecommerce system. The system must be scalable, fault-tolerant, and compliant with European data and commerce standards (GDPR-aware, rate-limited scraping, structured logging).

Use the reference website provided as the primary data source.

--------------------------------------------------
🎯 CORE OBJECTIVE
--------------------------------------------------

Build a skill that can:

1. Extract (scrape) ecommerce product data from a reference website
2. Normalize and transform the data
3. Store it in a structured database
4. Automatically or manually create/update products in our system
5. Enrich missing data using intelligent fallback scraping
6. Enhance frontend UX (mobile navigation + live sales notifications)

--------------------------------------------------
📦 DATA EXTRACTION REQUIREMENTS
--------------------------------------------------

The skill must scrape and capture:

- Product Categories
- Category Descriptions
- Product Names
- Product Descriptions
- Product Prices (including discount prices)
- Product Variations (size, color, etc. with respective prices)
- Thumbnail Images
- Gallery Images (multiple images per product)

Technical Requirements:
- Use headless browser (Playwright or Puppeteer)
- Handle lazy loading, pagination, infinite scroll
- Detect structured data (JSON-LD, microdata) if available
- Fallback to DOM parsing if structured data is unavailable

--------------------------------------------------
💾 DATA PROCESSING & STORAGE
--------------------------------------------------

Before inserting into database:

- Normalize product names (remove duplicates, trim noise)
- Standardize category hierarchy
- Validate price formats
- Deduplicate images
- Convert all currencies to EUR (€) using real-time or cached FX rates

Database Design (must include):
- Products Table
- Categories Table
- Product Variants Table
- Images Table
- Source Tracking Table (reference URL + scrape timestamp)

Use relational DB (PostgreSQL preferred)

--------------------------------------------------
🔄 PRODUCT CREATION (MANUAL + AUTOMATED)
--------------------------------------------------

The skill must support:

A. Manual Upload:
- Accept CSV or Excel input
- Parse fields: product name, category, price, variants, description
- Validate schema before import
- Provide error logs for failed rows

B. Automated Creation:
- Map scraped data directly into product schema
- Auto-create missing categories
- Assign images properly (thumbnail + gallery)
- Handle variant mapping correctly

--------------------------------------------------
🌐 INTELLIGENT FALLBACK SCRAPING
--------------------------------------------------

If a product is NOT found on the reference website:

- Automatically search for similar products across other ecommerce sites
- Use keyword-based and semantic search
- Extract:
  - Product Name
  - Description
  - Images
  - Price / Variant Prices

- Rank sources by relevance and trust
- Avoid duplicate or low-quality sources

--------------------------------------------------
📱 FRONTEND UI ENHANCEMENTS
--------------------------------------------------

1. Mobile Bottom Navigation Bar:
- Sticky bottom navigation
- Includes: Home, Categories, Cart, Account
- Optimized for all screen sizes
- Smooth transitions and responsive design

2. Sales Notification System:
- Display real-time/random purchase notifications

Desktop:
- Bottom-left corner

Mobile:
- Bottom-center

Notification Content:
- “Someone in [European Country] just purchased [Product Name]”

Requirements:
- Randomized intervals
- European geolocation dataset
- Smooth animation (fade/slide)
- Non-intrusive UX

--------------------------------------------------
⚙️ SYSTEM ARCHITECTURE
--------------------------------------------------

- Backend: Node.js (preferred) or Python (FastAPI)
- Scraper Service: Isolated microservice
- Queue System: (BullMQ / RabbitMQ) for scraping jobs
- Database: PostgreSQL
- Storage: Cloud (AWS S3 or equivalent for images)
- API Layer: REST or GraphQL

--------------------------------------------------
🛡️ COMPLIANCE & SAFETY
--------------------------------------------------

- Respect robots.txt where applicable
- Implement request throttling and retry logic
- Log all scraping activities
- GDPR-conscious: no personal data scraping

--------------------------------------------------
📊 OUTPUT REQUIREMENTS
--------------------------------------------------

Provide:

1. Full System Architecture Diagram (text-based)
2. Database Schema (SQL)
3. Scraper Module Code
4. API Endpoints
5. CSV Import Parser
6. Currency Conversion Module
7. Frontend Components (navigation + notifications)
8. Deployment Guide (Docker + environment variables)

--------------------------------------------------
🎯 OPTIMIZATION GOALS
--------------------------------------------------

- High accuracy scraping
- Minimal duplication
- Scalable to 100,000+ products
- Clean, maintainable code
- Modular design for reuse

--------------------------------------------------
📌 FINAL INSTRUCTION
--------------------------------------------------

Do NOT provide vague explanations.

Generate production-level code, clear structure, and implementation-ready output.
If assumptions are made, state them clearly.