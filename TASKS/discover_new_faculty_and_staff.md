# Discover New GMU CS Faculty & Staff (`discover_new_faculty_and_staff.md`)

> **Autonomous Goal Directive (`/goal TASKS/discover_new_faculty_and_staff.md`):**  
> Systematically search GMU CS department announcements, official directories (`cs.gmu.edu/people/faculty/`, `computing.gmu.edu/directory`), press releases, and faculty hiring notices to discover new tenure-track, teaching, research, emeritus, or staff appointments not yet listed in `public/faculty.json`. Verify appointment track, rank, office, netid, degree progression, and initial metadata. Submit new faculty entries as a GitHub PR (or GitHub Issue if unconfirmed). Never commit directly to `main`. Iterate in bounded batches.

---

## 🎯 Task Purpose & Scope

Ensure `public/faculty.json` stays complete and up-to-date with newly hired or promoted faculty and staff at George Mason University CS.

---

## 🛠️ Data & Verification Standards (`ROSTER_MAINTENANCE.md`)

1. **Required Fields**:
   - `First Name`, `Last Name`, `gmu email/userid`, `Tenure-Track/Teaching/Staff`, `Rank`, `Dept Role`, `Undergrad from`/`Year`, `MS from`/`Year`, `PhD from`/`Year`, `Postdoc from`/`Year`, `Last Modified`, `Last Verified`, `Verified`.
2. **Local Verification**:
   ```bash
   npm test && npm run typecheck && npm run validate:data && npm run build && git diff --check
   ```
3. **PR Submission**:
   - Submit new faculty entries via GitHub Pull Request on a topic branch.
