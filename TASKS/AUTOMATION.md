# Automated maintenance setup

This file describes how the GMU CS Directory is maintained by scheduled cloud agents: what runs,
when, and how the pieces hand work to each other. It is the source of truth for routine behavior.
Each cloud routine's prompt is a short pointer to its section below, so behavior is changed by
editing this file, not the routine. The setup mirrors VietProfs (`../vietprofs/TASKS/AUTOMATION.md`)
and CS Picks (`../cspicks/docs/AUTOMATION.md`), scaled down to a weekly cadence for a
711-person roster.

Policy (inclusion, fields, sources, the `Verified` marker) lives in `AGENTS.md` and
`ROSTER_MAINTENANCE.md`. This file covers scheduling, caps, and handoffs.

## How it fits together

```
 producers (Sonnet, Sun; news Sun+Thu)  auditor (Opus, Monday)              owner
 ──────────────────────────              ──────────────────────              ─────
 task PRs  "[scheduled:<key>] ..."  ──►  re-verify live, test on main,
                                         CI green → squash-merge
 side-finding Issues                ──►  verify → audit-fix PR → close
 submission Issues (submit.html)    ──►  verify → audit-fix PR → close
 owner-decision Issues              ──►  comment findings, leave open  ──►  only what the
                                                                            auditor leaves open
```

- **Producers** each do one playbook in a small capped batch, then open one PR (data edits) and
  Issues (anything needing a decision). They never merge and never push to `main`.
- **The auditor** is a different model in a different session. It runs the next day and only takes
  items at least 12 hours old, so no producer reviews its own work.
- **Model-free GitHub Actions** do the mechanical parts: `ci.yml` builds every PR, the watchdog
  raises an Issue when routines go quiet, and branch cleanup deletes merged PR branches (cloud
  agents can't).
- **The owner** only sees what the auditor leaves open (see "Needs an owner decision").

### Precedence for scheduled runs

The playbooks in `TASKS/` were written for interactive `/goal` sessions and say to keep going
"until ALL batches are completed". For scheduled runs this file overrides them: every run stops at
its section's cap, opens its PR/Issues, and ends. Where a playbook and this file disagree, this file
wins.

## Schedule

Cloud routines live at <https://claude.ai/code/routines> (environment: Default, network access
Full; shared with VietProfs and CS Picks). Cron is UTC; ET is shown for convenience (EDT; subtract
an hour in winter).

Spread rule (token budget): the owner's VietProfs and CS Picks routines share the same usage limit
and fill most of every weekday (VietProfs producers 05:00-14:00 UTC Mon-Sat and its audit at 03:00;
CS Picks 16:00-01:30 UTC). VietProfs has no producers on Sunday, so People's producers use those
Sunday slots, one every three hours (05:00-14:00; 11:00 is free since `honors` merged into
`news`), and the People audit takes the free Monday mid-morning slot.
The twice-weekly `news` producer runs at 18:00 UTC on Sunday and Thursday, between the CS Picks
audit (16:00) and its `confs` run (20:00), so no 3-hour window holds more than two starts.
No more than two routines of the three repos start within any 3 hours; check the sibling schedules
before moving anything here.

Ordering rule: every producer runs Sunday and the auditor runs Monday 10:30 UTC, so the newest
producer output (Sunday 18:00, `news`) is 16+ hours old at the audit, past its 12-hour minimum, and
the week's PRs are merged long before the next Sunday. The Thursday `news` PR waits for the next
Monday audit; Sunday's `news` run continues after it (see the `news` section).

| Key | Routine id | Model | Cron (UTC) | ET | Section |
| :-- | :-- | :-- | :-- | :-- | :-- |
| `audit` | `trig_01UpDXZQtP4zEejMb1y1LJkB` | Opus 5.5 | `30 10 * * 1` | Mon 6:30 AM | [Auditor](#auditor-audit) |
| `discover` | `trig_01Xy8pVn2cAJBesVKNwc7dy9` | Sonnet 5.5 | `0 5 * * 0` | Sun 1 AM | [Discover new people](#discover-new-people-discover) |
| `check` | `trig_013zYmGzofKWFyiRDtqPEmzb` | Sonnet 5.5 | `0 8 * * 0` | Sun 4 AM | [Check roster info](#check-roster-info-check) |
| `portraits` | `trig_01CTVLVcucbsvw6BXgJVmD8i` | Sonnet 5.5 | `0 14 * * 0` | Sun 10 AM | [Portraits](#portraits-portraits) |
| `news` | `trig_018FaffrhjVztsyDLXdWU6mR` | Sonnet 5.5 | `0 18 * * 0,4` | Sun, Thu 2 PM | [Faculty news and honors](#faculty-news-and-honors-news) |

The former weekly `honors` routine (`trig_01SQXJsBb2M9kdM6GvHGPsTK`, Sun 11:00 UTC) is disabled
since 2026-11-05; `news` does its work. Routines can only be deleted in the web UI.

Each routine attaches only the `Claude_Docs` connector. Don't add `Claude_Code_Remote`: with it, a
run that opens a PR schedules hourly "Re-check PR" reminders until the PR is merged.

Outside the cloud:

| What | Where | When | Notes |
| :-- | :-- | :-- | :-- |
| PR CI | GitHub Action `.github/workflows/ci.yml` | Every PR to `main` | `npm ci`, `npm run build` (typecheck, data validation, tests, Vite build, profile pages), `git diff --check`. The auditor merges only on green. Pushes to `main` are built and deployed by `deploy.yml`. |
| Automation watchdog | GitHub Action `.github/workflows/automation-watchdog.yml` | Wed 12:00 UTC; manual via `gh workflow run automation-watchdog.yml` | Opens or comments on one "Automation watchdog (automated)" Issue when a PR has been open more than 9 days (the auditor stopped or a PR is stuck) or a producer has had no `[scheduled:<key>]` output for 15 days (8 for the twice-weekly `news`; about two cycles; keep in step with the Schedule table); closes it when checks pass. No model involved. |
| Branch cleanup | GitHub Action `.github/workflows/delete-pr-branches.yml` | When a PR closes; sweep Mon 13:00 UTC; manual via `gh workflow run delete-pr-branches.yml` | Deletes a PR's branch once all its PRs are closed. Keeps `main`, branches with an open PR, and branches that never had a PR. No model involved. |

## Conventions for every scheduled run

Every routine prompt says: "Read TASKS/AUTOMATION.md and follow the section for `<key>`." All of
them share these rules:

1. **Setup.** Read `AGENTS.md`, then this file's conventions and your section, then the playbook
   it names and the `ROSTER_MAINTENANCE.md` sections it relies on. Run `npm ci` (not
   `npm install`). Work sequentially; don't spawn subagents. Use the GitHub MCP tools when `gh` is
   missing.
2. **Caps.** Stay within your section's cap, then stop. Before starting, list open PRs and Issues
   titled `[scheduled:<key>]` and skip entries they already touch.
3. **Batches.** Routines with a rotation take their batch from `npm run next-batch -- <key>`,
   which reads `maintenance/rotation.json`. If an open, unmerged `[scheduled:<key>]` PR exists,
   pass its version of the file instead (`npm run next-batch -- <key> --from "$(git show
   origin/<branch>:maintenance/rotation.json)"`), so you continue after it rather than repeating
   it. Your PR sets your own cursor (`<key>.<list>.next`) to the value the script prints; never
   touch another routine's cursor. If you stop early, set it to the first entry you didn't finish.
4. **Titles and branches.** Every PR and Issue title starts with `[scheduled:<key>]`. Branches are
   `task/<key>-<YYYY-MM-DD>`, unless the session assigns its own branch (e.g. `claude/<name>`);
   then use that one. Commit with the session's default git identity.
5. **Boundaries.** Producers never merge PRs and never push to `main`. Unknown beats wrong: never
   fill a field from a guess, a name-only match, or a third-party aggregator. Never set
   `Verified: Yes`; only direct correspondence sets it (`ROSTER_MAINTENANCE.md` §2). On a record
   with `Verified: Yes`, never change a field the live evidence contradicts; file an Issue for the
   owner instead. Never delete a faculty or student record: a faculty member who left is converted
   to a former record (by the auditor, from a `Review possible departure:` side finding).
6. **Timestamps.** Set `Last Modified` (today, `YYYY-MM-DD`) on every record you change and
   `Last Verified` on every record you fully checked, changed or not (`ROSTER_MAINTENANCE.md` §2).
   Don't touch either on records you didn't check.
   **Former faculty** (`Former: Yes`) are records too: they're checked, rotated, and cited like
   everyone else (`ROSTER_MAINTENANCE.md` §1, "Former Faculty"), with their GMU years and
   `Current Position` in place of an appointment.
7. **Validate.** Before opening a PR: `npm run build && git diff --check` (the build runs
   `typecheck`, `validate:data`, and the tests). If it fails for a reason you can't fix inside the
   batch, don't open the PR; open an Issue with the failure instead.
8. **Evidence.** Every changed fact in a PR lists the URL it came from. Official GMU pages,
   MARS, and the person's own site outrank LinkedIn and Scholar (`ROSTER_MAINTENANCE.md` §3). If a
   source is blocked (egress proxy, bot check, LinkedIn), don't accept the fact and don't delete
   the existing value because of the block; list the entry as blocked so a later run retries it.
   **If a block stops the whole run** (a permission denial, the GMU pages unreachable, or too few
   sources left to do the batch honestly), don't end with only a summary or a push notification:
   open one `[scheduled:<key>] Blocked: <cause>` Issue (or comment on the open one for your key)
   with the denied command or failing URLs and their exact errors, what was done, and the cursor
   left unchanged. Then stop. The auditor closes it once a later run of that key succeeds.
9. **Side findings.** Report them as described below.
10. **No follow-ups.** Once your PR/Issues are open, stop. Don't schedule check-ins, reminders,
    wakeups, or re-armed routines to watch CI or the PR, and never call PR-subscription tools
    (`subscribe_pr_activity` and similar); the auditor handles review. If CI fails, note it in the
    PR and leave it.
11. **Every close gets a comment.** Never close a PR or Issue, or merge a PR, without a comment
    saying what was found and done: the change and its source, or the reason for rejecting it.
12. **Small steps for data edits.** Write a roster edit as a script in the scratchpad and run it
    as its own command, keeping the files' 4-space JSON formatting and key order (the data-contract
    test checks it). Don't combine branch creation, the edit, and the push in one command.
13. **Summary.** End with entries processed, changes made, PR/Issue links, side findings filed,
    entries skipped with reasons, and any blocked sources.

## Side findings

While working on its own task, a producer often sees evidence that something else is wrong or
missing. It doesn't fix that in its PR, which stays scoped to its own fields; it files one Issue
per finding so the auditor can verify it independently.

| Finding | Title after the `[scheduled:<key>]` prefix |
| :-- | :-- |
| Faculty rank, track, role, or office looks stale | `Review possible rank change: <name>` (or `stale role`, `stale office`) |
| Faculty member seems to have left GMU or retired (no longer on any cs.gmu.edu people page) | `Review possible departure: <name>` (give the new position and the year left, with sources) |
| Student degree, advisor, graduation, or job looks stale | `Review student record: <name> — <field>` |
| Dead or wrong Website, Scholar, LinkedIn, or Picture | `Likely wrong <field>: <name>` |
| Two records are the same person | `Duplicate record: <name>` |
| An honor that belongs in `awards.json` is missing | `Possible new honor: <name> — <award>` |
| A GMU CS person not in the roster | `New person: <name> — <role>` |

Rules:

- **Dedup first.** Search open Issues, and Issues closed in the last 60 days, for the name. If one
  exists, comment only when you have new evidence.
- **Evidence.** The body gives the record (name and slug), the current stored value, the evidence
  with source URLs, the value you think is correct, your confidence, and what you couldn't check.
- **Bar.** A source that conflicts with the stored value is a finding; a hunch isn't.
- **Cap.** At most 5 side-finding Issues per run. File the strongest and list the rest in the
  summary.

## Needs an owner decision

These stay open for the owner, with the auditor's findings and a recommendation in a comment:

- A conflict with a `Verified: Yes` record (the owner confirmed it directly; ask them).
- Anything that would delete a record. (A faculty member who has died becomes a former record with
  `Year of death` from a memorial or obituary, like any other departure; see ROSTER_MAINTENANCE.md.)
- Ambiguous identity (two people with the name, a name-only match) or eligibility.
- Anything only the subject can settle (a degree not in MARS, a private job change). Issues the
  owner opened asking for confirmation (e.g. #35) are in this group.

After commenting, skip the Issue on later runs unless someone has commented or edited it since.

## Routine sections

### Auditor (`audit`)

Follow `TASKS/AUDIT_ISSUES_PRS.md`, with these rules taking precedence:

- **Scope:** open PRs and Issues created at least 12 hours ago, oldest first, skipping anything this
  session created. At most 8 PRs and 15 Issues per run.
- **PRs:** check out the PR, merge fresh `main` into it, and run `npm run build && git diff --check`.
  Re-verify at least half of the changed records live against the cited URLs (every new record,
  every changed rank, degree, advisor, or job, and every new Picture opened with the Read tool),
  confirm the timestamps follow convention 6, and require green CI. Merge with
  `gh pr merge <n> --squash --delete-branch` and a comment saying what was re-verified. If any fact
  is wrong or unsupported, request changes or close with a comment naming each rejected item and
  why; never merge a partial subset silently. When several PRs touch the same data file, merge the
  oldest first, then rebase each remaining PR onto `main`, resolve conflicts, re-validate, and merge.
- **Rotation PRs** (`check`, `discover`, `news`): merge one even when it changed no roster data,
  as long as its per-entry table shows real checks (spot-check 3 "confirmed" rows live); that is
  what advances the rotation. For `news`, re-verify every added or corrected story and awards row
  against its source (people, date precision, category, and that a grant amount or award isn't
  overstated), and spot-check 3 changed pages logged as "none" and 3 backfill people logged as
  "nothing found". The `news-watch.json` snapshot diff is mechanical; don't re-verify it. Older `[scheduled:honors]` PRs, if any, are reviewed the same way.
  A table that shows only URL status codes isn't a check: close the PR
  and say why, and the next run repeats those entries.
- **Issues:** side findings and submissions from `submit.html` (and owner-pasted "Roster
  feedback:" Issues) are leads, not sources, unless the owner wrote them from direct
  correspondence. Verify live. If confirmed, fix it in the run's fix PR; if the evidence is wrong,
  close with the reason. An owner-authored Issue that relays the person's own words is a direct
  update: apply every field it asserts, and set `Verified: Yes` on that record.
- **Applying fixes:** never edit `main` directly. Make all of a run's verified Issue fixes on one
  branch, `audit-fix/<YYYY-MM-DD>`, branched from fresh `origin/main`, one commit per Issue. Run
  `npm run build && git diff --check`, push, and open one PR titled
  `[scheduled:audit] Verified Issue fixes (<date>)` that lists each Issue with its evidence and has
  one `Closes #n` line per Issue (a comma list only closes the first). Squash-merge it once CI is
  green; this is the one PR you merge yourself, because the Issues came from other agents or the
  owner. Then comment on each Issue with the change. If CI is red, leave it open with a comment.
- **New people:** a verified new student or alum (official GMU page, MARS deposit, or the
  advisor's own lab page naming them as a GMU CS student) is added in the fix PR. A new faculty or
  staff member is added only when the official GMU CS or CEC directory lists them.
- **Departures:** a `Review possible departure:` finding is confirmed when the person is on no
  cs.gmu.edu people page (`ROSTER_MAINTENANCE.md` §1) and a current official page shows where they
  went. Convert the record in the fix PR: `Former: Yes`, `Year left GMU` and `Current Position`
  from cited sources (blank when none states them), GMU email and office cleared, track and rank
  kept as held at GMU. Never delete it. Someone now listed as affiliate or emeritus instead gets
  that track, not `Former`.
- **Owner decisions:** see "Needs an owner decision". `[scheduled:review]` Issues are for the owner;
  leave them alone.
- **Automation health,** every run, after the normal work. Check:
  1. PRs open more than 7 days, and why (red CI, conflict, rejected but still open).
  2. Each producer in the Schedule table: no `[scheduled:<key>]` PR or Issue within two of its cron
     cycles means it has likely stopped.
  3. Issues left open for an owner decision for more than 21 days.
  4. Empty runs: a producer whose last two PRs changed no roster data. Say the likely reason
     (queue exhausted, source blocked, the batch re-selecting entries already done).
  5. Duplicates and drift: no two records in a file share a name and identity (same Scholar or
     LinkedIn), and the roster sizes only changed by records added on purpose since the last audit.

  Fix what you can within the caps. Report the rest in one open Issue titled
  `[scheduled:audit] Automation health`: comment when something is wrong, close it with a
  "checks clean on <date>" comment when they come back clean, and never open a second one. When
  everything is healthy and no such Issue is open, do nothing.

### Discover new people (`discover`)

Playbooks: `TASKS/discover_new_faculty_and_staff.md` and
`TASKS/discover_new_students_and_alumni.md`. Each run does four passes, in this order:

1. **Faculty and staff directory diff.** Compare the official GMU CS people pages (faculty
   `cs.gmu.edu/people/faculty?page=0` through `?page=8`, `/people/faculty/affiliate-faculty?page=0`
   and `?page=1`, `/people/faculty/emeriti-faculty`, `/people/staff`; the faculty pages are
   server-rendered, so `curl` each page and read the `view-profile-title` links) against the
   current records in `public/faculty.json`. Someone listed there but not here is a new record (an
   affiliate gets track `Affiliate`); a current record missing from every page is a
   `Review possible departure:` side finding (never a deletion). Also scan the department news
   page for the last 60 days for hires, promotions, and departures.
2. **Advisor rotation.** `npm run next-batch -- discover` prints 6 faculty. For each, read their
   lab and students pages (and the people pages they link) and the advisor's CV if it lists
   students, and compare against `public/students.json` (`Advisor`/`Co-Advisor`). Students and
   alumni listed there but not here are new records. Pages on `people.cs.gmu.edu` (and
   `cs.gmu.edu/~netid`) serve an incomplete TLS certificate chain: read them with `curl -skL`
   rather than WebFetch, retry once on a 503, then try the latest Wayback snapshot
   (`https://web.archive.org/web/2026/<url>`). Only list an advisor as blocked after all three
   fail.
3. **MARS.** Find Computer Science PhD dissertations and MS theses deposited in the last 12 months
   that aren't in `public/students.json`. `mars.gmu.edu` redirects to `digitalcollections.gmu.edu`,
   which refuses automated fetches, so search for them (`site:digitalcollections.gmu.edu
   "Computer Science" dissertation <year>`) and confirm each from the search result or the
   advisor's CV; list the pass as blocked when neither works.
4. **Former faculty.** `npm run next-batch -- former` lists names that students' `Advisor` fields
   or `awards.json` point at with no faculty record. Take the first 3 not covered by an open
   `[scheduled:discover]` PR or Issue. For each, decide per `ROSTER_MAINTENANCE.md` §1 ("Former
   Faculty"): a former CS faculty member becomes a new `Former: Yes` record with GMU years, track and
   rank as held, `Current Position`, degrees, and links, each cited; a current affiliate missing from
   the roster becomes an `Affiliate` record (pass 1 usually catches these); someone whose GMU
   appointment was only in another department, or a spelling variant of an existing record, goes in
   the PR body as "not a CS faculty record" and in `maintenance/rotation.json` under
   `former.skip` (name → reason, source, date), so `next-batch` stops listing it.

Cap: one PR with at most 5 new faculty/staff (current or former) and 15 new students/alumni, each
with its source URL.
New records follow `ROSTER_MAINTENANCE.md` §1 and §4 exactly: every field present in file key
order, `Advisor` spelled exactly as the faculty record, unknown fields blank, `Verified` blank.
Someone you can't verify from an official or first-party source goes in a `New person:` Issue
instead. In the PR body, list each new record and its source, and a table of the 6 advisors with
what you checked and found (including "no new students"). The PR also sets `discover.advisors.next`,
so open it even when the passes found nobody.

### Check roster info (`check`)

Playbooks: `TASKS/audit_faculty_roster.md`, `TASKS/audit_students_and_alumni.md`,
`TASKS/verify_websites_and_labs.md`, `TASKS/check_google_scholar.md`, and
`TASKS/backfill_linkedin.md`. Cap: the batch `npm run next-batch -- check` prints (10 faculty and
20 students), which reaches every faculty member about every 12 weeks and every student about every
30 weeks.

**Every run opens a PR, even when no record changed**, because the PR advances the rotation. An
entry counts as checked only when every bullet below was done for it; a URL-status pass is not a
check. **Finish the whole batch, students included.** A run has no time budget to protect:
stopping because the run feels long, or to "avoid skimming", is not allowed. Stop early only for
a concrete blocker you can name (the session is ending, the tool or context limit is reached, or
every remaining source is blocked). When you do, name that blocker in the PR body's `## Scope`
section and set each cursor to the first entry you didn't finish. A blocked entry (source 403s,
bot check) is listed as blocked and doesn't stop the batch: move on to the next entry. Do the
students even if a faculty entry was blocked; a PR with 0 students checked and no named blocker is
rejected by the auditor.

For each faculty member, open the official GMU profile, their homepage, and Scholar once and
settle what they show. For a former member (`Former: Yes`), use their current official page
instead: confirm `Current Position`, fill `Year started at GMU` / `Year left GMU` when a CV or
announcement states them, and settle links and degrees the same way:
- **Appointment:** `Rank`, `Tenure-Track/Teaching/Staff`, `Dept Role`, office, and email against
  the official profile. A promotion or new role is a fix in this PR; a departure is a side finding.
- **Degrees:** fill or correct `Undergrad/MS/PhD/JD/Postdoc from` and their years only from the
  person's CV, official bio, or homepage. Never guess a year.
- **Links:** check the stored `Website`, `Google Scholar`, and `LinkedIn`; fill a missing one only
  on a strict identity match (never name alone). LinkedIn blocks fetches; accept a LinkedIn URL only
  when a search result snippet or the person's own site ties it to them.

For each student or alum:
- **Status:** degree and year (`PhD '23`), advisor and co-advisor, and dissertation title against
  MARS or the advisor's page. A current student who has since graduated gets the year, title, and
  `First Job` when sourced.
- **Placement:** `Current Job` and `Location` from their homepage, the employer's page, or
  Scholar's affiliation line. Leave a value alone when nothing newer is found; don't replace it
  with an older or weaker source.
- **Links:** the same rules as for faculty.

In the PR body, put one table row per entry, including entries checked with no change: slug,
status/appointment (confirmed / changed / blocked), website, Scholar, LinkedIn, and the source URL
used. The auditor rejects a check PR without that table.

### Portraits (`portraits`)

Playbook: `TASKS/fetch_portraits.md`. Queue: `npm run next-batch -- portraits` lists faculty with no
`Picture`, faculty whose `Picture` is still an external URL, and current students with no
`Picture`. Cap: 10 portraits per run, faculty first.

- Faculty: set `Picture` to the image URL from the official GMU profile (or the person's own
  homepage), then run `npm run fetch:portraits -- --name "<Full Name>"`, which downloads it, converts
  it to `public/portraits/<slug>.webp`, and records `Picture Source`. ImageMagick (`magick`) must be
  installed; if it's missing, install it (`apt-get install -y imagemagick`) before starting.
- Students: only a headshot the advisor's lab page or the student's own site shows for that named
  person; store the image URL in `Picture`.
- Open every new image with the Read tool and look at it: exactly one person, a face, not a logo,
  group photo, building, or default avatar. Reject anything you can't confirm is that person.
- In the PR body, give each portrait's record, its source page, and one line on why it was
  accepted. List people you searched for without finding a usable headshot, so the next run skips
  them for 8 weeks (by searching earlier `[scheduled:portraits]` PRs for their names).

### Faculty news and honors (`news`)

Playbooks: `TASKS/collect_faculty_news.md` and `TASKS/audit_awards_and_honors.md`. Runs twice a
week. Faculty often announce honors as news, so one run feeds both `public/news.json` and
`public/awards.json`. This routine replaced the weekly `honors` routine on 2026-11-05.

**Coverage is every current faculty member, every run**, by a script rather than by reading every
page: `npm run news:watch` fetches each homepage and lab site (and the news/people subpages logged
in `maintenance/news-scan.json`), each CV it finds through a CV/vita/resume link on those sites
(PDFs via `pdftotext`), and the CS and CEC news pages, then diffs each page's text lines against
the snapshot `maintenance/news-watch.json` and reports only the new lines. The model reads what
changed, not every page. Official `cs.gmu.edu/profiles` bios aren't watched: they rarely change,
the department announces the same honors on its news page, and 100+ profile requests twice a week
get throttled. The honors backfill reads each bio once.

Setup, after `npm ci`: install `pdftotext` if missing (`apt-get install -y poppler-utils`). If an
open `[scheduled:news]` PR exists, continue after it: save its snapshot
(`git show origin/<branch>:maintenance/news-watch.json > "$TMPDIR/news-watch.json"`) and add
`--from "$TMPDIR/news-watch.json"` below, and pass its `rotation.json` to `next-batch`
(convention 3). Branch from fresh `origin/main`, not from that PR.

Each run does four passes:

1. **Watch.** `npm run news:watch -- --write --report "$TMPDIR/news-watch-report.json"`. For each
   entry in the report:
   - `changed`: read its `newLines`, then open the page (and the specific announcement, award
     list, or funder page behind each promising line) and decide per the news playbook §3-§4. A new
     line in a CV is usually an honor, grant, or promotion: check it for an `awards.json` row
     and, if within the last 18 months, a news story. A line that is only reworded, reformatted,
     or older history newly added to a CV still counts: add what's missing, skip duplicates.
   - `baseline` (a page with no earlier snapshot, e.g. a new faculty member or a newly linked CV):
     read it in full, as the news playbook §2 describes, for the last 18 months of news and for
     every honor in a category `awards.json` uses. Exception: while the honors backfill (pass 3)
     is running, a baseline `cv` isn't read here; the backfill reads every CV.
   - `thin` (little text, likely rendered by JavaScript): read it with WebFetch or a browser; if
     that also fails, list it as blocked.
   - `failed`: retry once (Wayback for `people.cs.gmu.edu`), then list it as blocked. The snapshot
     keeps the old hashes, so the next run diffs it again.
   Record each page you read in `news-scan.json` (today's date, status, a short note). Unchanged
   pages need no entry; the snapshot shows when they were last fetched.
   If the report's `since` is empty (no snapshot yet), this run only creates the baseline: don't
   read the `baseline` pages. The 2026-11-05 historical news pass and the honors backfill cover
   what they held.
2. **Deep re-read.** `npm run news:sources -- --limit 5` lists the 5 sources read longest ago.
   Read them in full, looking back 90 days before their last review, to catch what a line diff
   misses (an edited old item, a linked page the watcher doesn't fetch). Log them in
   `news-scan.json`.
3. **Honors backfill (one time).** Until `rotation.json` `honors.faculty.next` is `"done"`,
   `npm run next-batch -- honors` prints the next 15 people. Read each one's CV, official bio,
   and homepage in full for honors in categories `awards.json` already uses (fellowships, NSF
   CAREER, young-investigator awards, test-of-time and most-influential-paper awards, dissertation
   awards, Mason and Virginia awards). This catches honors that predate the snapshot; once it
   finishes, the watch covers everyone. Per-year best-paper awards don't qualify for
   `awards.json` unless that category already lists them for others (they can still be news).
4. **No-URL faculty.** Take the first 2 names in `npm run news:sources`'s `facultyWithoutSources`
   and search their full name with GMU, lab, and news; note what you found in the PR body. A
   confirmed homepage or lab is a `Likely wrong Website:` side finding, not a roster edit here.

Cap: one PR with at most 25 added or corrected `news.json` stories and at most 15 added or
corrected `awards.json` rows, each with its source URL. If the changes would exceed that, take the
newest first and list the rest in the PR body; the next run won't see those lines again, so
also add them to `maintenance/news-evidence.json` as held candidates.

- **News stories** follow the news playbook §3-§5 exactly: eligibility, dedup by
  people/title/venue/year, never-invented date precision, grant amounts never guessed or credited
  wholly to one PI, `people` using exact roster spellings. Candidates you can't date or confirm go
  in `maintenance/news-evidence.json`, not `news.json`. Update `news-scan.json` `lastModified` and
  the `summary` counts to match.
- **Awards rows** use an existing `Category` name, `Name` spelled exactly as in `faculty.json` or
  `students.json`, and `Former: Yes` only for someone no longer at GMU. Never invent an award year
  and never delete a row (a doubtful row is a side finding). A student honor also goes in that
  student's `Honors & Awards` field (with `Last Modified`); otherwise don't edit roster files.

The PR always includes the updated `news-watch.json` snapshot, so open it even when nothing was
added. Its body has: the watch summary (pages watched by kind, changed, baseline, thin, failed);
a table with one row per changed, baseline, or re-read page (URL, kind, people, what the new lines
were, stories/awards added or "none: <reason>"); the backfill table (person, what was read, what
was found) while the backfill runs; every story and awards row added or changed with its source
URL; blocked pages; and the no-URL searches. If you run short of time, stop early: list the
changed pages you didn't get to as held candidates in `news-evidence.json` (URL and their new
lines) so the next run reads them, and set the backfill cursor to the first person you didn't
finish.

## Changing the setup

- **Behavior:** edit this file (and the playbooks), then commit. Routines pick it up on their next
  run.
- **Schedule, model, or on/off:** change the routine at <https://claude.ai/code/routines>, or ask
  Claude Code to use `RemoteTrigger update`, then update the Schedule table here (and the
  watchdog's windows) to match. Routines can't be deleted through the API, only in the web UI.
- **New routine:** add a section and a table row here. Its prompt should be the same pointer the
  others use: `You are the scheduled GMU CS Directory agent for routine key "<key>"
  (github.com/RealGMUCS/people). Read TASKS/AUTOMATION.md and follow "Conventions for every
  scheduled run", "Side findings", and the section for <key>. ...`

## Troubleshooting

- **What did a run do?** `RemoteTrigger list_runs` for the routine, then `get_run_log` for a
  session, or the session link in the commit's `Claude-Session:` trailer.
- **A run can't push, open a PR, or file an Issue** (`git push` or the GitHub API returns 403
  "Resource not accessible by integration" / "Claude doesn't have GitHub access to
  RealGMUCS/people"): the repository is public, so cloning works, but writing needs the Claude
  GitHub app installed on the `RealGMUCS` organization with access to this repository
  (<https://github.com/apps/claude/installations/select_target>; an org admin installs it). This
  happened on the first test run, 2026-10-30.
- **A run fails before it starts (no run in `list_runs`):** check the routine's repository source
  and the environment.
- **Fixes posted on Issues but never applied:** check the run log for `permission_denied`; fixes
  must go through the `audit-fix/<date>` PR, not a direct edit of `main`.
- **PR branches piling up:** the branch-cleanup Action deletes them; check
  `gh run list -w delete-pr-branches.yml`.
- **Lots of blocked sources:** check that the Default environment's network access is still
  **Full**. Some sites (notably LinkedIn) block bots anyway; those entries stay as they are.
- **GMU faculty pages fail with a certificate error:** `people.cs.gmu.edu` sends an incomplete
  TLS chain. Use `curl -skL` (read-only, so skipping verification is safe), then Wayback.
  The cloud classifier may deny `-k` as TLS weakening; on 2026-11-08 that stopped `discover` and
  `check` with no PR or Issue, and WebFetch got 503 from `cs.gmu.edu`. The fix is an Auto mode
  allow rule on each routine that reads GMU pages (`discover`, `check`, `audit`), added in the web
  UI (agents can't edit routine permissions): "Read-only `curl -skL` GETs of public `*.gmu.edu`
  pages and faculty homepages/lab sites are allowed; people.cs.gmu.edu sends an incomplete TLS
  chain, the output is only read as data, and no credentials or uploads are involved."
