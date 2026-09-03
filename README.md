# GMU CS Directory

Two directories for the George Mason University Computer Science department:
**People** (`index.html`, faculty/staff) and **Students/Alumni**
(`students.html`, grad students and alumni). They're separate pages but share
all their UI code (`src/common.js`, `src/style.css`) and data loading
(`src/data.js`).

Faculty data is sourced from [cs.gmu.edu](https://cs.gmu.edu/people/faculty/);
students/alumni data was researched from each advisor's lab site and public
profiles (LinkedIn, Google Scholar, personal pages) — see
`public/students.csv` for coverage, which is best-effort and not exhaustive.

## Features

- **People** (`index.html`): search by name, research area, PhD school, rank,
  or honors; filter by track and rank; `?view=awards` for the faculty awards
  page grouped by category.
- **Students/Alumni** (`students.html`): search by name, advisor, topic, job,
  internship, or honors; filter by degree (PhD/MS/Undergrad) and current vs.
  alumni status; `?view=insights` for auto-computed stats (top advisors,
  employers, and research topics).
- **Keyword search** on both pages — type a prefix like `advisor:`, `honors:`,
  `phd:`, `topic:`, `job:` to search one field directly (click the "i" icon
  next to the search box for the full list); `#tag` shortcuts also work.
- **Submit / Update** (`submit.html`): a plain-text form for adding or
  correcting an entry in either directory, with a name-autocomplete that
  pre-fills the existing record. Submits via email or a pre-filled GitHub
  issue.
- Website/LinkedIn/Google Scholar render as icons; clicking a research
  interest or topic tag filters to everyone who shares it.

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

The database is three CSVs in this repo. Edit any directly on GitHub (or
locally) and commit to `main`; the push redeploys the site in about a minute.
The `submit.html` form is the non-technical path to the same edit links.

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
| LinkedIn | https://www.linkedin.com/in/... |
| Google Scholar | https://scholar.google.com/citations?user=... |
| Research interests | Software Engineering (SE), Formal Methods |
| Office (building and room #) | Engineering 4430 |
| Year started at GMU | 2021 |
| PhD from | University of New Mexico (2014) |
| Postdoc from | University of Maryland (2016) |

Research interests are comma-separated.

### `public/students.csv` — students/alumni ([edit](https://github.com/RealGMUCS/people/edit/main/public/students.csv))

One row per student. `Advisor` must match `First Last` in faculty.csv to link
to that faculty member's card; a co-advised student gets one row per advisor.

| Column | Example |
|--------|---------|
| First Name | Jane |
| Last Name | Nguyen |
| Advisor | Jan Allbeck |
| Degree | PhD '26 |
| Current Job | Software Engineer at Google |
| First Job | SWE Intern at Meta |
| Internships | Research Intern, NVIDIA (Summer 2023) |
| Honors & Awards | NSF Graduate Research Fellowship (2022) |
| Topics | AI, Robotics |
| Picture | (optional image URL) |
| Website | (optional personal/lab site) |
| LinkedIn | https://www.linkedin.com/in/... |
| Google Scholar | https://scholar.google.com/citations?user=... |

`Internships` and `Honors & Awards` are semicolon-separated if there are
multiple; `Topics` is comma-separated. The Students/Alumni page infers
current-vs-alumni status from a `'YY` year in `Degree` (falling back to
whether `Current Job` is filled in) — there's no separate status column.

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
