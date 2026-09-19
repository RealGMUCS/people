# Verify Homepages & Lab Websites (`verify_websites_and_labs.md`)

> **Autonomous Goal Directive (`/goal TASKS/verify_websites_and_labs.md`):**
> Execute the task workflow across **ALL BATCHES CONTINUOUSLY** until **100% of items in the repository are fully audited and processed**. Audit all personal academic websites and research lab URLs in `public/faculty.json` and `public/students.json`. Verify active HTTP status, fix broken/404 links, remove outdated domain redirects, and update new lab sites (`mason.gmu.edu/~netid`, GitHub Pages, personal domains). Update `Website`, `Last Modified`, and `Last Verified` fields. Submit updates as a GitHub PR. Never commit directly to `main`. Do NOT stop execution until ALL batches are completed!

---

## 🎯 Task Goal

Ensure all personal homepage and lab links across faculty and student directory cards are active and accurate.

---

## 🛠️ Verification Rules

1. **Active HTTP Check**: Test links to ensure they resolve without HTTP 404, 500, or domain squatting.
2. **Canonical Domain**: Prefer personal academic homepages or GMU hosted user pages.
3. **Local Verification**:
   ```bash
   npm test && npm run typecheck && npm run validate:data && npm run build && git diff --check
   ```
4. **PR Submission**:
   - Submit edits via GitHub Pull Request on a topic branch.
