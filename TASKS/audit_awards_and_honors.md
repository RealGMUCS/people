# Audit Faculty & Student Awards (`audit_awards_and_honors.md`)

> **Autonomous Goal Directive (`/goal TASKS/audit_awards_and_honors.md`):**
> Execute the task workflow across **ALL BATCHES CONTINUOUSLY** until **100% of items in the repository are fully audited and processed**. Audit and maintain award listings in `public/awards.json`. Verify faculty and student honors, ACM/IEEE/AAAI Fellowships, NSF CAREER awards, best paper awards, university teaching awards, and former award recipient markers (`Former: Yes`). Verify recipient names against `public/faculty.json` and `public/students.json`. Submit all changes as a GitHub PR. Never commit directly to `main`. Do NOT stop execution until ALL batches are completed!

---

## 🎯 Task Goal

Ensure all department, university, national, and international honors for GMU CS faculty and students are accurately tracked in `public/awards.json`.

---

## 🛠️ Verification & Schema Rules

1. **Recipient Integrity**: Full name MUST resolve to a valid faculty or student entry in `faculty.json` or `students.json`.
2. **Former Marker**: Use `Former: Yes` for former recipients or past awardees who have departed GMU.
3. **Local Verification**:
   ```bash
   npm test && npm run typecheck && npm run validate:data && npm run build && git diff --check
   ```
4. **PR Submission**:
   - Submit edits via GitHub PR on a topic branch.
