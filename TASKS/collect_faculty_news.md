# Collect Faculty & Student News

Run this playbook with `/goal TASKS/collect_faculty_news.md` to curate `public/news.json` for
[`news.html`](../news.html). Follow [ROSTER_MAINTENANCE.md](../ROSTER_MAINTENANCE.md) for person
identity, affiliations, direct confirmations, and any separate roster edits.

## Scope and completion

Start from **every current faculty member**, including teaching, research, affiliate, and emeritus
faculty; prioritize tenure-line faculty when sources have the same audit age. Review both
`Website` and `Lab Website` in `public/faculty.json`, plus their linked news/archive and people
pages. Shared labs are reviewed once and credited to the people involved. Do not assume an
empty lab field means the person has no research group. Historical stories involving former
faculty are eligible when the event occurred at Mason; do not import their new employer's news.

For a requested full pass, continue until every available source is checked or has a documented
access problem, and every faculty member without a source has a documented discovery attempt.
For a bounded pass, stop at the requested cap and report coverage and remaining work. A checked
source with no eligible stories is a valid result. Do not claim a complete audit from the initial
seed. The scheduled `news` routine (twice a week) covers every faculty page with
`npm run news:watch`, which reports only text that is new since its last snapshot, plus
`npm run news:feeds` for new NSF awards, CEC grants-list entries, and flagship-venue papers (§2 step 4 sources), and reads the
changes under [AUTOMATION.md](AUTOMATION.md), "Faculty news and honors", together with the honors
playbook; its caps and PR handoff take precedence.

## 1. Build the queue

Run `npm run news:sources -- --limit 10`. The command deduplicates current faculty homepage and
lab URLs, queues never-reviewed sources first, then the oldest reviews, and lists faculty with
no URL. It reads `maintenance/news-scan.json`; do not use roster `Last Verified` as a news cursor.
Use the command again after each batch. For missing URLs, inspect the official faculty profile
and search the person's full name with GMU, lab, and news. Fix a roster URL only when the
relationship is confirmed; follow the roster timestamp and direct-confirmation rules.

On the initial pass, prioritize the last 18 months. On later passes, look back at least 90 days
before the last review to catch late additions and corrected posts. An explicit request for
older history overrides this window. Keep existing stories when they leave the window.

For historical backfills, work through every available archive year rather than stopping after
recent posts. Supplement personal sites with older university newsletters, the Stearns Center's
teaching-award histories, professional-society fellow/award lists, conference award archives, and
primary funder records. Search faculty with sparse sites individually, including teaching and
emeritus faculty. Record held candidates, conflicting years, and exclusions in
`maintenance/news-evidence.json` so later passes do not repeat unresolved assumptions.

## 2. Read each person's sources

1. Read the homepage and distinct lab homepage, including collapsed older-news sections.
2. Follow linked news/archive pages, lab members/alumni, and relevant project announcements.
3. For promising stories, follow the specific announcement, conference award list, university
   news article, or funder award page when available. Prefer a stable story permalink over a
   moving homepage. When the homepage is the only source, retain the closest working anchor.
4. Search official GMU news and the CS department as a supplement, especially for people without
   maintained personal news. For grants and papers, `npm run news:feeds -- --since <date>` lists
   NSF awards to roster faculty at GMU, the college's grants list
   (<https://cec.gmu.edu/research/grants>: every funder, posted about weekly), and their
   GMU-affiliated papers at flagship venues. Avoid using aggregators or search snippets as the sole
   evidence.
5. Record success, no relevant news, or failure for every URL in `maintenance/news-scan.json`,
   with its actual review date and a short note. Keep a blocked URL distinct from a clean review.
   Incomplete TLS chains on `people.cs.gmu.edu` are a known access issue; retry or use indexed
   primary-page content, and document the fallback. A 403 or redirect to the department homepage
   is not proof of no news. A shared source check does not imply every member's homepage was read.

## 3. Decide what belongs

Include concrete achievements with a named Mason connection:

- Faculty honors, fellowships, major recognition, and significant promotions.
- Best/distinguished/test-of-time paper awards and explicitly identified spotlights or highlights.
- New research grants, industry awards, and gifts with an explicit recipient and funder.
- Completed student defenses and graduations; meaningful placements when publicly announced.
- Student scholarships, fellowships, competitions, research awards, and other major achievements.
- Every full paper accepted at a top venue in its area: main research tracks of flagship
  conferences (e.g., NeurIPS, ICML, ICLR, CVPR, ACL, EMNLP, ICSE, FSE, ASE, ISSTA, CAV, CCS,
  USENIX Security, S&P, NDSS, MobiCom, MobiSys, SenSys, EuroSys, CHI, CSCW, UIST, SIGGRAPH, ICRA,
  IROS, CoRL, KDD) and flagship journals (e.g., TSE, TOSEM, TPAMI, JAIR). Apply the rule to every
  lab alike. Group a lab's acceptances from one announcement into one story; list papers rather
  than import a whole publication list.
- Not newsworthy on their own: workshop papers, Findings, posters, demos, short/NIER papers,
  and doctoral or student symposia. Second-tier venues are included only for an award.
- Selected research results and notable software releases with a clear contribution.

Omit routine travel, committee service, hiring advertisements, semester greetings, social events,
undated promotional claims, and achievements unrelated to the Mason appointment. A paper acceptance
is not a paper award. A workshop poster award is not a main-conference best paper award. An
accepted future conference paper is an acceptance announcement, not a completed presentation.
A defense is not proof that the university has conferred the degree. A planned job is not an
already-started job. News may mention collaborators outside the roster without adding them to it.

## 4. Verify and deduplicate

Confirm identity and lab affiliation from primary sources and roster advisor links. Use full
roster spellings for named faculty and students so profile links resolve. If a source uses only
first names, follow its people page before expanding them. Do not assign a group result to every
faculty member unless their participation is supported. Attribute self-reported announcements
to the lab/homepage; seek the award body or funder for stronger confirmation when accessible.

Search existing news by people, title/paper/project, funder, venue, and year. Merge multiple
announcements of the same milestone into one story, preserving its stable `id`; a distinct later
milestone can be a new story. Correct or remove disproven claims with evidence. Do not silently
replace owner-confirmed facts with conflicting web research; document the conflict for the owner.
Do not copy long source paragraphs. Write a short factual title and one or two original sentences.

For grants, never guess amounts or imply the entire multi-institution total went to one PI. For
NSF records, inspect the named PI/co-PIs, recipient institution, project title, and original
award date. A transferred CAREER grant is not a newly won CAREER award. Academic funding
cycles alone do not establish an announcement date; hold undated candidates for corroboration.
Browser-render JavaScript-only labs before treating them as empty; retain access failures in
the log when the fallback also fails.

For papers, distinguish coauthors, recipients, teams, and advisors. Do not infer dates, awards,
degree conferral, or current employment from titles or name-only matches.

## 5. Write `public/news.json`

Keep four-space JSON indentation and this exact key order (enforced by `validateNews`):

| Field | Convention |
| --- | --- |
| `id` | Stable unique lowercase hyphenated milestone identifier; never change it just to edit prose. |
| `title` | Specific, factual headline. |
| `summary` | One or two original sentences; state what happened and to whom. |
| `date` | Supported event date or dated announcement, `YYYY-MM-DD`, `YYYY-MM`, or `YYYY`. Preserve the source's precision. Never invent January 1 or use the scan date as the event date. |
| `category` | `faculty-achievement`, `paper-award`, `paper`, `grant`, `graduation`, `job`, `student-achievement`, or `research`. Use `paper` for publications/acceptances, `paper-award` for paper distinctions, `job` for announced jobs/placements, and `research` for broader research highlights or software. For combined milestones, use the primary event (e.g., `graduation` for a defense that also announces a job). |
| `people` | Unique full-name strings, including at least one exact faculty roster name. Include actual recipients and supported faculty connections. Unlisted people display without a profile link. |
| `tags` | Short searchable topics, funders, venues, or award names; unique strings. |
| `sourceName` | Readable primary-source name, such as a lab, faculty homepage, university, or funder. |
| `sourceUrl` | Working absolute HTTP(S) link supporting the claim; prefer a specific story. |
| `lastModified` | Actual date of the latest story change, `YYYY-MM-DD`. |
| `lastVerified` | Actual date the story was checked against a live source, `YYYY-MM-DD`. |

If only a conference award year is supported, use that year; if even a year is uncertain, hold the
candidate in the scan notes. The page shows month/year or year-only dates honestly; ordering
within an imprecisely dated period is conservative and does not establish an exact event date.
Do not mark web-researched news or roster records `Verified: Yes`.

Record scan outcomes even when there are no stories. Do not update unrelated faculty/student
records simply because their website yielded news. An honor found here also belongs in
`public/awards.json` when its category is already used there (see `audit_awards_and_honors.md`);
other roster updates need their own sourced inclusion and timestamp checks.

## 6. Validate and hand off

Run `npm run build && git diff --check`. Inspect `news.html` at desktop and mobile widths:
free-text and scoped search, suggestions, category/year filters, oldest/newest ordering, topic
chips, profile/source links, empty results, and a copied URL restoring the same view. Check that
all stories have readable source attribution and dates without invented precision.

Report stories added/corrected, distinct sources checked, people covered, blocked/missing sources,
and sources remaining. Owner-directed local sessions follow AGENTS.md. Scheduled runs open a
`[scheduled:news]` PR (never a push to `main`) with coverage and source evidence in its
description, as AUTOMATION.md describes.
