# Phase 3 - Production Architecture

This document describes how to evolve the static prototype (`index.html`) into a
scalable production platform per the original brief: **Next.js + FastAPI +
PostgreSQL + Python ETL**.

---

## 1. Repository layout

```
road-accident-platform/
├── apps/
│ ├── web/ # Next.js 14 (App Router)
│ │ ├── app/
│ │ │ ├── page.tsx # National landing
│ │ │ ├── states/[slug]/page.tsx # /states/tamil-nadu (SEO)
│ │ │ ├── cities/[slug]/page.tsx # /cities/chennai (SEO)
│ │ │ ├── compare/page.tsx
│ │ │ ├── analytics/page.tsx
│ │ │ └── api/og/route.ts # OG image generation
│ │ ├── components/
│ │ │ ├── KpiCard.tsx
│ │ │ ├── TrendChart.tsx # Recharts
│ │ │ ├── ChoroplethMap.tsx # react-india-states-map
│ │ │ ├── SearchBar.tsx
│ │ │ └── InsightBanner.tsx
│ │ ├── lib/
│ │ │ ├── api.ts # typed fetch wrapper
│ │ │ ├── insights.ts # auto-generation rules
│ │ │ └── format.ts
│ │ ├── public/
│ │ │ └── india.geo.json # state boundaries
│ │ └── next.config.js
│ └── api/ # FastAPI
│ ├── main.py
│ ├── routers/
│ │ ├── national.py
│ │ ├── states.py
│ │ ├── cities.py
│ │ ├── compare.py
│ │ └── insights.py
│ ├── db.py # SQLAlchemy session
│ ├── models.py # SQLAlchemy ORM
│ ├── schemas.py # Pydantic
│ └── services/
│ ├── insight_engine.py
│ └── ranking.py
├── etl/
│ ├── extract.py # this session's PDF extractor
│ ├── transform.py # cleaning + name normalization
│ ├── load.py # writes to Postgres
│ └── pipelines/
│ └── ingest_year.py # CLI: `python ingest_year.py 2024 RA_2024.pdf`
├── db/
│ ├── migrations/ # Alembic
│ │ └── 001_initial.sql
│ └── seed/
│ └── states.csv
├── infra/
│ ├── docker-compose.yml # local dev (postgres + api + web)
│ ├── Dockerfile.api
│ ├── Dockerfile.web
│ └── vercel.json
└── docs/
 ├── data_dictionary.md
 └── deployment.md
```

---

## 2. Database schema (PostgreSQL DDL)

```sql
CREATE TABLE state (
 id SERIAL PRIMARY KEY,
 name TEXT UNIQUE NOT NULL,
 slug TEXT UNIQUE NOT NULL, -- 'tamil-nadu'
 iso_code CHAR(2), -- 'TN'
 region TEXT, -- 'South', 'North-East'…
 is_ut BOOLEAN DEFAULT FALSE,
 population BIGINT
);

CREATE TABLE city (
 id SERIAL PRIMARY KEY,
 name TEXT NOT NULL,
 slug TEXT UNIQUE NOT NULL, -- 'chennai'
 state_id INT REFERENCES state(id),
 lat NUMERIC(8,5),
 lon NUMERIC(8,5),
 population BIGINT,
 is_million_plus BOOLEAN DEFAULT TRUE
);

-- Master fact table: one row per (entity, year)
CREATE TABLE accident_yearly (
 id BIGSERIAL PRIMARY KEY,
 scope TEXT NOT NULL, -- 'national' | 'state' | 'city'
 entity_id INT, -- FK to state.id or city.id; NULL for national
 year SMALLINT NOT NULL,
 accidents INT,
 fatal_accidents INT,
 persons_killed INT,
 persons_injured INT,
 severity NUMERIC(5,2),
 UNIQUE (scope, entity_id, year)
);
CREATE INDEX idx_ay_scope_year ON accident_yearly (scope, year);
CREATE INDEX idx_ay_entity ON accident_yearly (entity_id);

-- Dimensional breakdowns (one fact table per dimension keeps queries fast)
CREATE TABLE accidents_by_road_category (
 id BIGSERIAL PRIMARY KEY,
 scope TEXT NOT NULL,
 entity_id INT,
 year SMALLINT NOT NULL,
 category TEXT NOT NULL, -- 'NH' | 'SH' | 'Other'
 accidents INT, killed INT, injured INT,
 UNIQUE (scope, entity_id, year, category)
);

CREATE TABLE accidents_by_cause (
 id BIGSERIAL PRIMARY KEY,
 scope TEXT, entity_id INT, year SMALLINT,
 cause TEXT,
 accidents INT, killed INT, injured INT,
 UNIQUE (scope, entity_id, year, cause)
);

CREATE TABLE accidents_by_road_feature (
 id BIGSERIAL PRIMARY KEY,
 scope TEXT, entity_id INT, year SMALLINT,
 road_feature TEXT,
 accidents INT, killed INT, injured INT
);

CREATE TABLE accidents_by_vehicle (...); -- same shape
CREATE TABLE accidents_by_neighborhood (...);
CREATE TABLE accidents_by_weather (...);

-- Pre-computed insights cache (refreshed nightly)
CREATE TABLE insight_cache (
 scope TEXT, entity_id INT, year SMALLINT,
 insights JSONB, -- { headline, kpis, narratives[] }
 PRIMARY KEY (scope, entity_id, year)
);

-- Source PDFs registry (auditability)
CREATE TABLE source_document (
 id SERIAL PRIMARY KEY,
 year SMALLINT, pdf_url TEXT,
 sha256 CHAR(64), ingested_at TIMESTAMPTZ DEFAULT NOW(),
 notes TEXT
);
```

---

## 3. FastAPI endpoints

```
GET /api/v1/national/{year} → KPI bundle + 5-yr trend
GET /api/v1/national/timeseries?from=2005&to=2023
GET /api/v1/national/causes/{year}
GET /api/v1/national/road-categories/{year}

GET /api/v1/states → list (id, name, slug, latest_kpis)
GET /api/v1/states/{slug} → full profile + insights
GET /api/v1/states/{slug}/timeseries
GET /api/v1/states/ranking?year=2023&metric=accidents

GET /api/v1/cities → 50 million-plus cities
GET /api/v1/cities/{slug}
GET /api/v1/cities/ranking?year=2023&metric=fatality_rate

POST /api/v1/compare → body: {scope, entities:[…], metrics:[…]}
GET /api/v1/insights/{scope}/{slug}/{year}

GET /api/v1/search?q=chen → unified state+city search
GET /api/v1/export?scope=state&slug=tn&format=csv
```

All endpoints respond with cache-control headers (`s-maxage=86400`) - data refreshes
once per day after ETL runs.

---

## 4. ETL pipeline

```
PDF file (S3)
 │
 ▼
extract.py ← pdfplumber: tables + reconciliation rules
 │
 ▼
transform.py ← name normalization, NA handling, severity computation
 │
 ▼
load.py ← bulk INSERT … ON CONFLICT DO UPDATE
 │
 ▼
refresh_insights ← stored procedure populates insight_cache
 │
 ▼
purge CDN cache ← Vercel revalidate-tag
```

CLI: `python etl/pipelines/ingest_year.py 2024 s3://morth-reports/RA_2024.pdf`
which runs all four steps idempotently.

Schedule (production): GitHub Actions cron, runs annually when MoRTH publishes a
new report; or on-demand via an admin UI button that calls a `/admin/ingest` route.

---

## 5. Insight engine rules

Compiled into `insight_cache.insights` as JSONB. Run by a Python service
(`services/insight_engine.py`) over the materialised time-series. Examples:

```python
def state_insights(state, year):
 cur, prev, base5 = get_yearly(state, [year, year-1, year-5])
 out = []
 if pct_change(cur.accidents, prev.accidents) > 5:
 out.append({
 "tone": "warn",
 "text": f"Accidents in {state.name} rose by "
 f"{pct_change(cur.accidents, prev.accidents):.1f}% in {year} over {year-1}."
 })
 if cur.severity > national_severity(year) + 5:
 out.append({
 "tone": "danger",
 "text": f"{state.name} has higher fatality rate "
 f"({cur.severity}) than national average ({national_severity(year)})."
 })
 return out
```

Templates are translated client-side via i18n keys so the same backend can serve
English, Hindi, Tamil, etc.

---

## 6. Search architecture

For 50 cities + 37 states a simple in-memory trie is enough. For scale (district
or police-station level later), use Postgres FTS:

```sql
CREATE INDEX idx_state_fts ON state USING GIN (to_tsvector('english', name));
CREATE INDEX idx_city_fts ON city USING GIN (to_tsvector('english', name));
```

The `/api/v1/search` endpoint unions both with rank scoring.

---

## 7. SEO / city pages

Each state and city gets its own URL (`/states/tamil-nadu`, `/cities/chennai`)
served as **statically generated** Next.js pages with ISR (`revalidate: 86400`).

```ts
// app/cities/[slug]/page.tsx
export async function generateStaticParams() {
 return (await api.get("/cities")).map(c => ({ slug: c.slug }));
}

export async function generateMetadata({ params }) {
 const c = await api.get(`/cities/${params.slug}`);
 return {
 title: `${c.name} Road Accidents 2023 - Stats & Trends`,
 description: c.insights.headline,
 openGraph: { images: [`/api/og?city=${c.slug}`] }
 };
}
```

---

## 8. Deployment

### Frontend (Next.js)
- Push to GitHub → Vercel auto-deploys.
- Environment vars: `NEXT_PUBLIC_API_URL=https://api.crashinsights.in`
- Bandwidth & functions free tier sufficient for first ~100 K visits/mo.

### Backend (FastAPI)
- Containerise with `infra/Dockerfile.api`.
- Deploy to:
 - **Render** (easiest, $7/mo) - managed Postgres included.
 - **AWS Fargate + RDS** (production-grade, $40-80/mo).
 - **Fly.io** (global edge, ~$10/mo).

### Database
- Postgres 16 - managed (Render, Supabase, or AWS RDS).
- Daily logical backups via `pg_dump` to S3.

### PDF storage
- S3 bucket `morth-reports/RA_{year}.pdf`, lifecycle: glacier after 90 days.

### Domain & DNS (GoDaddy)
1. Buy `crashinsights.in` (or similar) on GoDaddy.
2. In Vercel → Project → Domains → Add `crashinsights.in`. Vercel returns:
 - A record pointing to `76.76.21.21`
 - CNAME for `www` to `cname.vercel-dns.com`
3. In GoDaddy → DNS Management:
 - Edit / add A record: Host `@`, Value `76.76.21.21`, TTL `1 hour`
 - Edit / add CNAME: Host `www`, Value `cname.vercel-dns.com`
4. Wait 30-60 min for propagation. Vercel auto-issues Let's Encrypt SSL.
5. For the API subdomain, point CNAME `api` → your Render/Fly host.

### Analytics (optional)
- Plausible (privacy-first, $9/mo) or Google Analytics 4.
- Drop the snippet in `app/layout.tsx`.

---

## 9. Migration path from prototype

The static dashboard in `index.html` reads two JSON files. To migrate:

1. Stand up Postgres + run `db/migrations/001_initial.sql`.
2. Run `etl/pipelines/ingest_year.py 2019 RA_2019.pdf` … through `2023`.
3. Stand up FastAPI with the routers above.
4. Replace `fetch("data/dashboard_data.json")` calls in JS with
 `fetch("/api/v1/national/2023")` etc.
5. Migrate UI components piece-by-piece into Next.js (KPI cards, charts, tables).

The data extraction logic is already proven in `extract.py` from this build - that
file becomes `etl/extract.py` with minimal changes.
