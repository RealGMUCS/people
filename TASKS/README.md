# GMU CS People Directory Autonomous Task Suite (`TASKS/`)

This directory contains executable task playbooks for maintaining the **GMU CS People Directory** codebase and roster data (`public/faculty.json`, `public/students.json`, `public/awards.json`).

---

## 🚀 One-Line Execution Model

Each playbook is pre-configured with an **Autonomous Goal Directive** header. You can trigger any workflow by typing `/goal TASKS/<filename>.md`:

```bash
/goal TASKS/fetch_portraits.md
/goal TASKS/backfill_linkedin.md
/goal TASKS/check_google_scholar.md
/goal TASKS/verify_websites_and_labs.md
/goal TASKS/audit_faculty_roster.md
/goal TASKS/audit_students_and_alumni.md
/goal TASKS/audit_awards_and_honors.md
/goal TASKS/AUDIT_ISSUES_PRS.md
```

---

## 🔒 PR & Issue Submission Protocol (No Direct Commits to `main`)

To preserve git history and ensure multi-agent safety:

1. **Maintenance Agents DO NOT commit directly to `main`**:
   - All roster maintenance updates, schema fixes, and verified profile additions MUST be committed on a dedicated topic branch (e.g. `task/audit-faculty-batch-1`) and submitted as a **GitHub Pull Request**.
   - If an update is ambiguous, unconfirmed by official sources, or requires direct subject confirmation, create a **GitHub Issue** detailing the finding instead of pushing a PR.

2. **Auditor Agent (`/goal TASKS/AUDIT_ISSUES_PRS.md`)**:
   - Reviews open Pull Requests and Issues.
   - Runs full verification (`npm test && npm run typecheck && npm run validate:data && npm run build && git diff --check`).
   - Squash-merges verified PRs into `main`, deletes topic branches, and closes resolved issues.

---

## 📋 Task Playbooks Overview

| Playbook | Purpose | Core Output |
| :--- | :--- | :--- |
| [`fetch_portraits.md`](fetch_portraits.md) | Search official GMU directory pages, lab sites, and homepages for verified headshots. | `public/faculty.json`, `public/students.json` PRs |
| [`backfill_linkedin.md`](backfill_linkedin.md) | Backfill missing LinkedIn personal profile URLs for faculty and student cards. | `public/faculty.json`, `public/students.json` PRs |
| [`check_google_scholar.md`](check_google_scholar.md) | Audit and backfill missing Google Scholar citation profile links. | `public/faculty.json`, `public/students.json` PRs |
| [`verify_websites_and_labs.md`](verify_websites_and_labs.md) | Verify personal homepages, research lab URLs, and resolve broken links. | `public/faculty.json`, `public/students.json` PRs |
| [`audit_faculty_roster.md`](audit_faculty_roster.md) | Audit GMU CS faculty data (rank, track, netid, office, undergrad/MS/PhD degrees, roles, research topics, timestamps, `Verified`). | `public/faculty.json` PRs |
| [`audit_students_and_alumni.md`](audit_students_and_alumni.md) | Audit grad students & alumni (advisors, degrees, dissertation titles, current/first jobs, locations, internships, honors, `Verified`). | `public/students.json` PRs |
| [`audit_awards_and_honors.md`](audit_awards_and_honors.md) | Audit `public/awards.json` for GMU faculty/student honors, CAREER awards, ACM/IEEE fellowships, and former recipient markers. | `public/awards.json` PRs |
| [`AUDIT_ISSUES_PRS.md`](AUDIT_ISSUES_PRS.md) | Autonomous auditor agent that tests, squash-merges clean PRs into `main`, and closes resolved GitHub Issues. | Repository merge & issue closure |
