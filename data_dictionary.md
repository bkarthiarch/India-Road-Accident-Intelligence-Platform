# Data Dictionary - India Road Accident Intelligence Platform

**Source:** Ministry of Road Transport and Highways (MoRTH), Government of India.
*Road Accidents in India* annual reports 2019-2023 (PDF format). The 2023 edition
provides 5-year trend tables (2019-2023) for all key indicators and serves as the
master source for state-, city-, and theme-wise tables. Long-term trend (2005-2023)
is taken from Table 1.6 of the same report.

**Coverage:** All 28 states + 8 union territories of India + 50 million-plus cities.

**Extraction date:** 29 April 2026.

**Validation:** All extracted totals reconcile to the published all-India totals
(see `extract.py` console output).

---

## Files

### `national_yearly.csv` - 19 rows, 2005-2023
| field | type | notes |
|---|---|---|
| `year` | int | calendar year |
| `total_accidents` | int | all road accidents |
| `fatal_accidents` | int | accidents resulting in ≥ 1 death |
| `fatal_share_pct` | float | fatal_accidents / total_accidents × 100 |
| `persons_killed` | int | road accident fatalities |
| `persons_injured` | int | total injured |
| `severity` | float | persons killed per 100 accidents |

### `national_road_category.csv` - 15 rows
Road category breakdown (National Highways / State Highways / Other Roads) for 2019-2023.
Categories are mutually exclusive and sum to all-India total.

### `national_accident_type.csv` - 5 rows
Accidents by severity class (fatal / grievous / minor / non-injury) 2019-2023.

### `state_accidents.csv` - 37 rows (28 states + 9 UTs incl. Ladakh)
Wide format - `accidents_2019` … `accidents_2023`. NA cells indicate state did not
exist that year (e.g. Ladakh pre-2020; Daman & Diu merged into D&NH from 2020).

### `state_fatalities.csv` - 37 rows
Wide format - `killed_2019` … `killed_2023`.

### `state_long.csv` - 185 rows (37 × 5 years)
Long format with derived `fatality_rate_per_100` (= killed / accidents × 100).
**Use this file** for filtered queries and time-series charts.

### `cities_2022_2023.csv` - 50 rows
50 million-plus cities (2011 census) - accidents, killed, injured for 2022 and 2023
plus rank columns. Includes derived `fatality_rate_2022` and `fatality_rate_2023`.

### `cities_top10_accidents.csv` - 10 rows
Top-10 cities by 2023 accident count, with full 2019-2023 trend.

### `causes.csv` - 6 rows
Traffic-rule violation causes (over-speeding, drunken driving, wrong-side, jumping
red light, mobile phone use, others) for 2022 and 2023.

### `road_features.csv` - 8 rows
Accidents by road feature (straight, curved, bridge, culvert, potholes, steep grade,
road works, others) for 2022 and 2023.

### `neighborhood.csv` - 5 rows
Accidents by neighborhood type (residential, institutional, market/commercial, open
area, others) for 2022 and 2023.

---

## Known data quirks

1. **Ladakh** was carved out of J&K in October 2019; for 2019-2020 the J&K row
 includes Ladakh (marked `#` in source).
2. **Daman & Diu** merged into Dadra & Nagar Haveli on 26 January 2020. Rows are
 reported separately for 2019 and combined thereafter.
3. **City names** in the report use some non-standard spellings (e.g. *Vizaq*,
 *Vijaywada*, *Khozikode*, *Mallapuram*, *Allahabad (Prayagraj)*) - preserved
 verbatim from the source.
4. **Severity = persons killed per 100 accidents.** Note this is *not* a probability
 - it can exceed 100 if multiple deaths per accident.
5. **'Million-plus cities'** are defined per the 2011 Census as cities with ≥ 1M
 population. List is fixed at 50 cities and does not update across years.

---

## Recommended primary keys

- `national_yearly`: `year`
- `state_long`: (`state`, `year`)
- `cities_2022_2023`: `sl_no` or `city`
- `causes`: `cause`
- `road_features`: `road_feature`
- `neighborhood`: `area`
