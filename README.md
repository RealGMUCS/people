# CS Faculty Directory

Searchable directory for the George Mason University Computer Science department. Browse faculty by name, rank, track, or research interest.

Data sourced from [cs.gmu.edu](https://cs.gmu.edu/people/faculty/).

## Features

- **Search** by name, email, research area, PhD school, or office
- **#tag search** — type `#associate`, `#tenure`, `#AI`, etc.
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

## Updating Faculty Data

**Data Source:** [`public/faculty.csv`](public/faculty.csv) in this repo is the database.

To update the directory:
1. Edit the CSV — directly on GitHub via [this edit link](https://github.com/RealGMUCS/people/edit/main/public/faculty.csv), or locally.
2. Commit to `main`. The push triggers the GitHub Pages workflow and the site updates in about a minute.

### CSV Columns

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
| Achievements | NSF CAREER 2023, IEEE TSE Most Influential Paper 2025 |

Lists (Research interests, Achievements) are comma-separated. If an item itself
contains a comma (e.g. `Best Paper, ICSE 2020`), separate the items with `;`
instead — a cell containing any semicolon is split on semicolons only.

## Deploying

Automatic: every push to `main` builds and deploys to
[GitHub Pages](https://realgmucs.github.io/people/) via
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). There is nothing to run manually.

## License

MIT
