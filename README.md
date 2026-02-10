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

## Updating Faculty Data

**Data Source:** The directory reads live from [this Google Sheet](https://docs.google.com/spreadsheets/d/1Cei8Dqc_i1MXVBEKy_H6LIG5R6HmFEEwfrk9WmlruXM/edit?usp=sharing).

To update the directory:
1. Edit the Google Sheet directly.
2. Changes will appear on the website immediately after a page refresh.

(A backup snapshot exists in `public/faculty.csv`, used only if the live fetch fails.)


### CSV Columns

| Column | Example |
|--------|---------|
| First Name | ThanhVu |
| Last Name | Nguyen |
| gmu email/userid | tvn@gmu.edu |
| Tenure-Track/Teaching/Staff | Tenure-Track |
| Rank | Associate Professor |
| Website | roars.dev |
| Research interests | Software Engineering, Formal Methods |
| Office (building and room #) | Engineering 5343 |
| Year started at GMU | 2019 |
| PhD from | University of New Mexico |

## Deploying

```bash
npm run build   
npm run preview
```

## License

MIT
