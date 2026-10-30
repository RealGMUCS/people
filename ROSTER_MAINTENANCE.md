# GMU CS Directory — Roster Maintenance & Verification Guide

This document is for maintainers and automated agents. It contains the detailed research, verification, and data-entry rules for the George Mason University Computer Science Department directory (Faculty, Staff, Graduate Students, and Alumni).

---

## 1. Inclusion Standards

### Faculty & Staff
Include individuals with active appointments in the GMU Department of Computer Science or College of Computing & Engineering:
* **Tenure-Track / Tenured**: Assistant Professor, Associate Professor, Full Professor, University Professor, Distinguished Professor.
* **Teaching Faculty**: Assistant Teaching Professor, Associate Teaching Professor, Teaching Professor, Instructor, Professor of Practice.
* **Research Faculty**: Research Assistant Professor, Research Associate Professor, Research Professor.
* **Emeritus**: Emeriti faculty members who retired from GMU CS.
* **Staff & Affiliated**: Department leadership, administrative staff, and courtesy joint appointments (labeled with appropriate track/role).

### Former Faculty
Include people who held a tenure-line, teaching, or research **faculty** appointment in GMU Computer Science and have left: moved to another institution or company, or retired without an emeritus title. They are marked `Former: Yes` and stay in `public/faculty.json`, so their students' `Advisor` links, their awards, and their profile pages keep working; the directory hides them until a search or the **Former** filter.
* **The test is the official pages.** Someone is former when they are no longer listed on any `cs.gmu.edu` people page: [faculty](https://cs.gmu.edu/people/faculty) (paginated, `?page=0` to `?page=8`), [affiliate faculty](https://cs.gmu.edu/people/faculty/affiliate-faculty) (`?page=0` and `?page=1`), [emeriti](https://cs.gmu.edu/people/faculty/emeriti-faculty), and [staff](https://cs.gmu.edu/people/staff). Someone who left but is still listed as affiliate faculty is a current `Affiliate` record; someone listed as emeritus is `Emeritus`.
* **Not included:** visiting faculty, adjuncts, postdocs, departed staff, and people whose only GMU appointment was in another department (ISE, CYSE, ECE, IST), even if they advised CS students.
* **Keep** `Tenure-Track/Teaching/Staff`, `Rank`, and `Dept Role` as held at GMU when they left (e.g. `Tenured`, `Associate Professor`). Clear the GMU email and office, which no longer reach them.
* **Never delete** a departed faculty record: convert it to former instead.

### Graduate Students & Alumni
Include current graduate students and alumni who earned or are pursuing degrees from GMU Computer Science:
* **PhD Candidates & Alumni**: Tracked with degree format (e.g., `PhD '23` or `PhD`), primary advisor, co-advisor (where applicable), dissertation title, first job, current job, and current location.
  * **Advised by CS faculty counts.** A GMU doctorate in another program (e.g. the former Information Technology PhD, or Computational Sciences) is included when the dissertation advisor is CS faculty; MARS labels several such alumni (James Rogers, Hesham Altaleb, Susan Farley, Guodong Shao, Khalid Alodhaibi, Mohammad Karami, Uday Kamath) as Information Technology. MARS's discipline field is not reliable on its own: it labels some CS PhDs "Computational Science".
  * **Finding graduates.** GMU commencement programs list each CS PhD with title and advisors. MARS (`digitalcollections.gmu.edu`) blocks automated access, but every MARS dissertation has a DataCite DOI (`api.datacite.org/dois?query=prefix:10.13021 AND types.resourceType:Dissertation`) giving author, advisor, and year, and each DOI's `gmu.tind.io/record/<id>/export/xm` record gives the degree discipline (MARC 502 `$g`). Fetch those one at a time, slowly.
* **M.S. Students & Alumni (Thesis & Non-Thesis)**:
  * **Thesis M.S.**: Include thesis advisor and thesis title.
  * **Coursework / Non-Thesis M.S.**: Include degree (`MS '24`), current placement/location, and set `Advisor` to `None`.

### Undergraduate Researchers
Include current undergraduate researchers affiliated with GMU Computer Science research labs or faculty projects:
* Track degree as `BS` or `BS 'YY` when the expected or completed year is known.
* Include the supervising faculty member in `Advisor`, research topics, current location, and public website or profile links when available.
* Use the same verification and maintenance timestamp requirements as graduate-student records.

---

## 2. Mandatory Verification & Maintenance Metadata

Every entry in `public/faculty.json` and `public/students.json` MUST contain the following maintenance timestamps:

| Field Name | Format | Description |
| :--- | :--- | :--- |
| `Last Modified` | `YYYY-MM-DD` | Timestamp of the most recent change to any field in the record. |
| `Last Verified` | `YYYY-MM-DD` | Timestamp when the record was last verified against an authoritative live source. |
| `Verified` | `Yes` or blank | See below. Distinct from `Last Verified` — this marks *how* the record was confirmed, not *when*. |

### Verification Rules
* Whenever a maintainer or automated process modifies an entry (e.g., job change, location update, degree completion), set `Last Modified` to the current date (`YYYY-MM-DD`).
* Whenever a record is audited against live sources and confirmed accurate (even if no data changes), update `Last Verified` to the current date (`YYYY-MM-DD`).
* Never leave `Last Modified` or `Last Verified` blank.

### `Verified` — direct-confirmation marker (mirrors vietprofs' `confirmed`/`directFields` concept)
Set `Verified` to `Yes` when a record (or the specific edit just made) was confirmed via **direct correspondence** with the subject or their advisor/department — e.g. a faculty email reply, an attached CV/screenshot, a explicit written correction — rather than solely inferred from automated web scraping of public pages. Leave it blank for records whose only support is a scraped public source (GMU directory page, personal website, Google Scholar, etc.) with no direct human confirmation.

* `Verified: Yes` records render a green **✓ Verified** badge on the card (see `.tag-verified` in `src/style.css`), the inverse of vietprofs' amber **Unconfirmed** badge (`.tag-unconfirmed`) — vietprofs defaults to confirmed-unless-flagged, this roster defaults to unflagged-unless-directly-confirmed, since most of this roster originates from scraping rather than institutional submission.
* Only `Yes` or blank are valid values (validated in `scripts/validate-data.ts`, same pattern as `awards.json`'s `Former` column).
* When in doubt whether a source counts as "direct," prefer leaving it blank — a false `Verified` badge is worse than a missing one.

---

## 3. Authoritative Data Sources

When verifying or updating entries, consult sources in the following priority order:

1. **Official GMU Pages**:
   * GMU CS people pages: `cs.gmu.edu/people/faculty` (paginated, `?page=0` to `?page=8`), `/people/faculty/affiliate-faculty` (`?page=0` and `?page=1`), `/people/faculty/emeriti-faculty`, `/people/staff`
   * CCE Directory: `computing.gmu.edu/directory`
   * Individual GMU Profiles: `cs.gmu.edu/profiles/[netid]`
   * Faculty homepages on `people.cs.gmu.edu/~[netid]` (this host serves an incomplete TLS certificate chain and is sometimes down; retry, or read it through a search engine's cached result, rather than treating a failure as a dead link)
2. **GMU Archival & Thesis Repository**:
   * **MARS (Mason Archival Repository Service)** for official M.S. theses and Ph.D. dissertations. `mars.gmu.edu` now redirects to `digitalcollections.gmu.edu`, which refuses automated fetches (403); find deposits through a web search (`site:digitalcollections.gmu.edu` or the title) and the advisor's CV instead.
3. **Former faculty (years at GMU)**: their CV, an official bio or news item at GMU or the new employer, and Wayback Machine snapshots of the CS faculty listing (`web.archive.org/web/*/cs.gmu.edu/people/faculty*`), whose first and last appearance bound the years. Use a snapshot-derived year only when no CV or announcement states it, and say so in the evidence.
4. **Academic Bibliographic Databases**:
   * Google Scholar profiles
   * DBLP Computer Science Bibliography
   * ORCID & IEEE Xplore
5. **Professional & Personal Homepages**:
   * Personal academic websites (e.g., `mason.gmu.edu/~[userid]` or personal GitHub Pages)
   * LinkedIn profiles for current job titles and city/state locations

---

## 4. Field Specification & Conventions

### `public/students.json`
* `First Name`, `Last Name`: Official name as registered at GMU.
* `Advisor`: Full name of primary faculty advisor (e.g., `Amarda Shehu`). Set to `None` for unadvised coursework M.S. students.
* `Co-Advisor`: Full name of co-advisor, if applicable (e.g., `Fei Li`).
* `Degree`: Degree and graduation year (e.g., `PhD '23`, `MS '24`, `PhD`).
* `Dissertation Title`: Title of completed doctoral dissertation or master's thesis.
* `Current Job`: Current job title and organization (e.g., `Assistant Professor, UC Riverside`).
* `First Job`: First placement upon graduation (e.g., `Postdoc, MIT`).
* `Location`: Primary city and state/country (e.g., `San Francisco, CA`, `Delft, Netherlands`).
* `Last Modified`: `YYYY-MM-DD`
* `Last Verified`: `YYYY-MM-DD`

### `public/faculty.json`
* `First Name`, `Last Name`: Faculty member's name.
* `gmu email/userid`: GMU email address or NetID.
* `Picture`: local relative path under `public/portraits/` (e.g. `portraits/jane-doe.webp`), written by `npm run fetch:portraits` — do not hand-edit this to an external URL; set `Picture Source` instead and re-run the script.
* `Picture Source`: the original external hotlink the local picture was fetched from (provenance only, not rendered).
* `Tenure-Track/Teaching/Staff`: Primary track (`Tenure-Track`, `Teaching`, `Research`, `Staff`).
* `Rank`: Academic rank (e.g., `Associate Professor`).
* `Dept Role`: Administrative role, if any (e.g., `Department Chair`).
* `Former`: `Yes` for former faculty (see §1, "Former Faculty"), blank for everyone currently listed.
* `Year started at GMU` / `Year left GMU`: 4-digit years of the CS appointment. `Year left GMU` is set only on former records; leave either blank when no source states it.
* `Current Position`: a former member's current title and organization (e.g. `Associate Professor, University of Central Florida`, or `Retired`), from their current official page; blank for current faculty.
* `Year of death`: 4-digit year, only on a former record for someone who has died, from a GMU or employer memorial or an obituary. `Current Position` stays blank; the card shows "Died YYYY". Deceased former faculty are included like any other former member.
* `Undergrad from` / `Undergrad Year`, `MS from` / `MS Year`, `PhD from` / `PhD Year`, `Postdoc from` / `Postdoc Year`: institution name and 4-digit graduation/completion year for each degree stage, when known (mirrors vietprofs' `undergradInstitution`/`undergradYear` etc.). Leave both blank together if a stage doesn't apply (e.g. no postdoc) or the year can't be confirmed — never guess a year.
* `Last Modified`: `YYYY-MM-DD`
* `Last Verified`: `YYYY-MM-DD`

---

## 5. Maintenance Workflows

### Batch Audits
Maintainers should periodically perform batch audits of faculty and student records. For each batch:
1. Cross-reference records against GMU CS directory and MARS repository.
2. Update job titles, locations, and dissertation titles.
3. Set `Last Modified` for changed rows and `Last Verified` for all checked rows.
4. Run `npm run build` to verify clean bundle generation.

### Faculty Portraits
When a faculty `Picture` field is set to an external URL (freshly added via the submit form, or by hand), run `npm run fetch:portraits` to download it, convert it to a size-capped `.webp`, store it under `public/portraits/`, and rewrite `faculty.json` to point at the local copy (`Picture Source` keeps the original URL for provenance). This keeps the site from depending on external hosts staying up. Pass `--name "Full Name"` to fetch just one person, or `--dry-run` to preview without downloading.
