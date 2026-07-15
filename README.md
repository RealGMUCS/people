# CS Faculty Directory

Searchable directory for the George Mason University Computer Science department. Browse faculty by name, rank, track, or research interest.

Data sourced from [cs.gmu.edu](https://cs.gmu.edu/people/faculty/).

## Features

- **Search** by name, email, research area, PhD school, or office
- **#tag search** — type `#associate`, `#tenure`, `#AI`, etc.
- **`#awards`** — the faculty awards page, grouped by category (Fellows, NSF CAREER, …)
- **Filter** by track (Tenure-Track / Teaching) and rank
- **Click a research interest** to see all faculty in that area

## Getting Started

```bash
npm install
npm run dev
```

### Local preview
```
npm run build && npm run preview
```

## Updating the Data

The database is two CSVs in this repo. Edit either directly on GitHub (or
locally) and commit to `main`; the push redeploys the site in about a minute.

### `public/faculty.csv` — the people ([edit](https://github.com/RealGMUCS/people/edit/main/public/faculty.csv))

One row per person. There is no achievements column — a person's achievements
are joined from `awards.csv` by their full name (`First Last`).

| Column | Example |
|--------|---------|
| First Name | ThanhVu |
| Last Name | Nguyen |
| gmu email/userid | tvn@gmu.edu |
| Picture | https://cs.gmu.edu/sites/default/files/.../Thanhvu.Nguyen-1x1-profile.jpg |
| Tenure-Track/Teaching/Staff | Tenured |
| Rank | Associate Professor |
| Dept Role | MS SWE Director |
| Website | roars.dev |
| Research interests | Software Engineering (SE), Formal Methods |
| Office (building and room #) | Engineering 4430 |
| Year started at GMU | 2021 |
| PhD from | University of New Mexico (2014) |
| Postdoc from | University of Maryland (2016) |

Research interests are comma-separated.

### `public/awards.csv` — the awards ([edit](https://github.com/RealGMUCS/people/edit/main/public/awards.csv))

One row per award. Drives both the `#awards` page and each faculty card's
achievements list.

| Column | Example | Notes |
|--------|---------|-------|
| Name | ThanhVu (Vu) Nguyen | Must match `First Last` in faculty.csv to link to a card |
| Category | NSF CAREER Awards | Groups awards on the `#awards` page; category order follows first appearance in the file |
| Award | Amazon Research Award (Automated Reasoning) | Award text **without** the year |
| Year | 2023 | Shown separately; used for sorting |
| Former | yes | `yes` if the person has left GMU (shown but not clickable); blank otherwise |

A `Name` that doesn't match anyone in faculty.csv is treated as a former member
automatically, so `Former` is only needed to force that flag.

## Deploying

Automatic: every push to `main` builds and deploys to
[GitHub Pages](https://realgmucs.github.io/people/) via
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). There is nothing to run manually.

## License

MIT
