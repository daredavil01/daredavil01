# Adivasi Survey Dashboard — Nandurbar

An interactive data visualization dashboard for a household survey conducted among the Adivasi Pawra community in Nandurbar District, Maharashtra.

## Overview

This dashboard visualizes socioeconomic survey data collected from **281 households** across **7 villages** in the Nandurbar region. It is designed to help field workers, researchers, and community organizations understand the living conditions, access to government schemes, education levels, income patterns, and health status of the Pawra tribal community.

## Villages Covered

| Marathi | Romanized |
|---|---|
| उडद्या | Uddadya |
| खापरमाळ | Khaparmal |
| सादरी | Sadri |
| निवसा पाडा | Nivsa Pada |
| नवाड्या पाडा | Navadya Pada |
| पाटील पाडा | Patil Pada |
| मानसिंग पाडा | Mansing Pada |

## Features

- **Bilingual toggle** — Switch between Marathi (मर) and English (EN) for all labels, chart titles, stat cards, filters, and tab names
- **Hero KPI cards** — 10 at-a-glance statistics: total households, school attendance, Aadhaar coverage, bank accounts, average income, migration rate, kutcha houses, sanitation, women's SHGs, and education gaps
- **Village filter** — Multi-select dropdown to filter data by one or more villages
- **Age range filter** — Filter households by household head's age
- **8 thematic tabs** with 28 charts total

## Dashboard Tabs

| Tab | Charts |
|---|---|
| Overview | Households by village (pie), household size distribution, households per village (bar) |
| Demographics | Age distribution of heads, education of heads, main occupation |
| Documents & Schemes | Documents/schemes coverage (%), govt. scheme by village, MNREGA participation |
| Agriculture | Land distribution, livestock ownership, Mahua trees, Tendu leaf & forest land |
| Income & Labour | Annual income distribution, labour destination, drinking water sources, loans, labour type |
| Education | School attendance by village, top schools, education of household members |
| Housing & Assets | House type, toilet usage, mobile phone type, assets ownership |
| Women & Health | Women's SHG by village, vegetables in daily diet, reported illnesses, birth certificates |

## Data

- **Source:** Primary household survey, Adivasi Pawra community, Nandurbar District, Maharashtra
- **Format:** CSV (`yung_data.csv`) with 51 columns per household record
- **Records:** 281 household entries
- **Privacy:** Names and mobile numbers are excluded from the parsed data

## Tech Stack

- Vanilla HTML/CSS/JavaScript (no build step required)
- [Chart.js 4.4](https://www.chartjs.org/) for all charts
- Custom CSV parser (`parse.js`) handling multi-line quoted fields and Devanagari numeral normalization
- Served via any static file server (e.g. `npx serve`)

## Running Locally

```bash
npx serve yung-data -l 3000
# then open http://localhost:3000
```
