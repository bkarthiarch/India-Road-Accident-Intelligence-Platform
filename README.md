# India Road Accident Intelligence Platform

Interactive dashboard of road accident statistics across India (2019-2023) at the
national, state and city level. Source: Ministry of Road Transport & Highways
(MoRTH) annual reports, extracted into clean datasets.

## What's in this folder

| File | What it is |
|---|---|
| `index.html` | Self-contained dashboard (open it in a browser - no server required). |
| `data/` | All cleaned CSVs + JSON used by the dashboard. |
| `road_accidents_india_all_data.xlsx` | All datasets in one Excel workbook (11 sheets). |
| `data_dictionary.md` | Field-level documentation for every CSV. |
| `phase3_architecture.md` | Production stack design (Next.js + FastAPI + PostgreSQL + ETL). |
| `extract.py` | Python script that extracts all CSVs from MoRTH PDFs (rerun for new years). |

## Quick start

1. **View the dashboard locally** - just double-click `index.html` (works offline once
 the Chart.js CDN script has loaded once, or you can swap the CDN script for a
 local copy).
2. **Or serve it** (recommended for cleanest experience):
 ```
 cd "Road Crashes Dashboard"
 python -m http.server 8000
 ```
 Then open http://localhost:8000

## Deploying to a real domain (Vercel + GoDaddy)

1. Push this folder to a new GitHub repo (drag-and-drop into vercel.com works too).
2. Vercel auto-detects it as a static site. Click Deploy.
3. Buy a domain on GoDaddy (e.g. `crashinsights.in`).
4. In Vercel → Project → Domains, add the domain. Vercel will tell you which DNS
 records to set.
5. In GoDaddy DNS Management, add the A record (`@` → `76.76.21.21`) and CNAME
 (`www` → `cname.vercel-dns.com`).
6. Wait 30-60 minutes. SSL is automatic.

(Alternative free hosts: Firebase Hosting, Netlify, Cloudflare Pages - all support
the same drag-and-drop static deploy.)

## What this build covers vs the original brief

Done in this Phase 1 + 2 build:
- Data extraction from 2019-2023 PDFs (state, city, national, causes, road
 features, neighbourhood, road category - all reconciled to published totals).
- National / state / city dashboards with KPIs, trends, rankings.
- Search-as-you-type (any state or city).
- Comparison tool (up to 4 states or cities, side-by-side).
- Insight engine (auto-generated narratives per state/city).
- Dark + light mode.
- CSV and PNG export.
- Mobile responsive layout.

Designed but not built (Phase 3, see `phase3_architecture.md`):
- Next.js + FastAPI + PostgreSQL stack.
- District-level granularity.
- Live PDF upload + automated ingest.
- Choropleth map (requires hosting GeoJSON; current build uses bar charts).
- Multi-language support.

## Data caveats

- **2015-2018** data is *not* in this build (the brief asked for 2015-2023 but only
 2019-2023 PDFs were uploaded). The 2023 report's Table 1.6 does include
 long-term annual totals back to 2005, which the National Overview already shows.
- **Cities = 50 million-plus cities only.** District-level data is not in the MoRTH
 reports.
- All numbers in the dashboard are sourced from the MoRTH PDFs verbatim. Where
 cells in the source were `NA` (e.g. Ladakh pre-2020) the dashboard shows them as
 blank rather than zero.
