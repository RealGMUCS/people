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

### Graduate Students & Alumni
Include current graduate students and alumni who earned or are pursuing degrees from GMU Computer Science:
* **PhD Candidates & Alumni**: Tracked with degree format (e.g., `PhD '23` or `PhD`), primary advisor, co-advisor (where applicable), dissertation title, first job, current job, and current location.
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
   * GMU CS Faculty Directory: `cs.gmu.edu/directory/by-category/`
   * CCE Directory: `computing.gmu.edu/directory`
   * Individual GMU Profiles: `cs.gmu.edu/profiles/[netid]`
2. **GMU Archival & Thesis Repository**:
   * **MARS (Mason Archival Repository Service)**: `mars.gmu.edu` for official M.S. theses and Ph.D. dissertations.
3. **Academic Bibliographic Databases**:
   * Google Scholar profiles
   * DBLP Computer Science Bibliography
   * ORCID & IEEE Xplore
4. **Professional & Personal Homepages**:
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
* `Tenure-Track/Teaching/Staff`: Primary track (`Tenure-Track`, `Teaching`, `Research`, `Staff`).
* `Rank`: Academic rank (e.g., `Associate Professor`).
* `Dept Role`: Administrative role, if any (e.g., `Department Chair`).
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
