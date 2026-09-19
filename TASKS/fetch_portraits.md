# Fetch & Audit Roster Portraits (`fetch_portraits.md`)

> **Autonomous Goal Directive (`/goal TASKS/fetch_portraits.md`):**  
> Systematically search for missing or outdated portrait headshot URLs in `public/faculty.json` and `public/students.json`. Use official GMU directory pages (`cs.gmu.edu`, `computing.gmu.edu`), academic lab websites, and professional homepages to locate authentic headshots. Carefully inspect image URLs to ensure they depict the exact person and are not non-person icons, stock logos, or placeholders. Update `Picture`, `Last Modified`, and `Last Verified` fields. Submit all updates as a GitHub PR. Never commit directly to `main`. Iterate in bounded batches until all roster entries are audited.

---

## 🎯 Task Goal

Ensure every faculty and student record in the GMU CS directory has a verified portrait image link when publicly available.

---

## 🛠️ Verification & Data Rules

1. **Non-Person Image Prevention**: Inspect candidate image URLs carefully. Do NOT use department logos, campus buildings, generic avatars, stock graphics, or corrupted image URLs.
2. **Official Provenance**: Prioritize `cs.gmu.edu/sites/default/files/...` or personal site headshots.
3. **Metadata Updates**: Update `Last Modified` and `Last Verified` to `YYYY-MM-DD`.
4. **Local Verification**:
   ```bash
   npm test && npm run typecheck && npm run validate:data && npm run build && git diff --check
   ```
5. **PR Submission**:
   - Create a topic branch (e.g. `task/fetch-portraits-batch-1`).
   - Submit a GitHub Pull Request with image proof. Do NOT commit directly to `main`.
