# Backfill LinkedIn Profiles (`backfill_linkedin.md`)

> **Autonomous Goal Directive (`/goal TASKS/backfill_linkedin.md`):**
> Execute the task workflow across **ALL BATCHES CONTINUOUSLY** until **100% of items in the repository are fully audited and processed**. Systematically search for missing LinkedIn profile links in `public/faculty.json` and `public/students.json`. Perform multi-query research using name, GMU CS affiliation, advisor, degree, and current placement. Validate that the LinkedIn profile matches the exact individual before adding it. Update `LinkedIn`, `Last Modified`, and `Last Verified` fields. Submit all changes as a GitHub PR. Never commit directly to `main`. Iterate in bounded batches until all entries are audited. Do NOT stop execution until ALL batches are completed!

---

## 🎯 Task Goal

Complete LinkedIn coverage across faculty, graduate students, and alumni cards.

---

## 🛠️ Verification & Data Rules

1. **Identity Confirmation**: Verify name, degree stage, advisor, and GMU affiliation on the candidate LinkedIn profile before accepting.
2. **URL Normalization**: Standardize to `https://www.linkedin.com/in/username`.
3. **Metadata Updates**: Set `Last Modified` and `Last Verified` to `YYYY-MM-DD`.
4. **Local Verification**:
   ```bash
   npm test && npm run typecheck && npm run validate:data && npm run build && git diff --check
   ```
5. **PR Submission**:
   - Commit edits to a topic branch (e.g. `task/backfill-linkedin-batch-1`).
   - Submit a GitHub Pull Request with citation proof.
