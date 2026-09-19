# Check & Backfill Google Scholar Profiles (`check_google_scholar.md`)

> **Autonomous Goal Directive (`/goal TASKS/check_google_scholar.md`):**  
> Audit missing Google Scholar citation profile links in `public/faculty.json` and `public/students.json`. Perform targeted web searches to identify authentic Google Scholar user IDs matching faculty and graduate student publication records. Update `Google Scholar`, `Last Modified`, and `Last Verified` fields. Submit updates as a GitHub PR. Never commit directly to `main`. Iterate in bounded batches until all entries are checked.

---

## 🎯 Task Goal

Ensure all GMU CS researchers with active Google Scholar profiles have working citation links.

---

## 🛠️ Verification & Data Rules

1. **Profile Disambiguation**: Verify author papers, co-authors (GMU faculty/students), and institutional affiliation listed on Google Scholar.
2. **URL Standard**: `https://scholar.google.com/citations?user=USER_ID`.
3. **Local Verification**:
   ```bash
   npm test && npm run typecheck && npm run validate:data && npm run build && git diff --check
   ```
4. **PR Submission**:
   - Submit changes via a GitHub Pull Request on a topic branch.
