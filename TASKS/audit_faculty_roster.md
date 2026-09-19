# Audit Faculty Roster (`audit_faculty_roster.md`)

> **Autonomous Goal Directive (`/goal TASKS/audit_faculty_roster.md`):**
> Execute the task workflow across **ALL BATCHES CONTINUOUSLY** until **100% of items in the repository are fully audited and processed**. Systematically audit and maintain the GMU CS faculty dataset in `public/faculty.json`. Verify tenure-track, teaching, research, and emeritus ranks, administrative roles (`Dept Role`), office locations, GMU netids/emails, research interests, and degree progression (`Undergrad from`/`Year`, `MS from`/`Year`, `PhD from`/`Year`, `Postdoc from`/`Year`). Follow all verification and metadata standards in `ROSTER_MAINTENANCE.md`. Set `Verified: Yes` ONLY if confirmed by direct correspondence. Update `Last Modified` and `Last Verified` dates. Submit all edits as a GitHub PR. Never commit directly to `main`. Do NOT stop execution until ALL batches are completed!

---

## 🎯 Task Goal

Ensure `public/faculty.json` is completely aligned with official GMU CS department records and live academic sources.

---

## 🛠️ Verification & Maintenance Rules

1. **Inclusion Standards**: Follow Section 1 of `ROSTER_MAINTENANCE.md` (Tenure-track, Teaching, Research, Emeritus, Staff).
2. **Degree Chronology**:
   - `Undergrad from`/`Year`, `MS from`/`Year`, `PhD from`/`Year`, `Postdoc from`/`Year`.
   - Never guess a year; leave both institution and year blank if unknown or non-existent.
3. **Verification Markers**:
   - `Verified: Yes` ONLY when confirmed by direct email/communication.
   - Always update `Last Modified` and `Last Verified` to `YYYY-MM-DD`.
4. **Local Verification**:
   ```bash
   npm test && npm run typecheck && npm run validate:data && npm run build && git diff --check
   ```
5. **PR / Issue Protocol**:
   - Submit clean edits as a GitHub Pull Request on a topic branch.
   - If a faculty status is ambiguous or conflicting, open a GitHub Issue.
