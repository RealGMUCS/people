# Fetch & Audit Roster Portraits (`fetch_portraits.md`)

> **Autonomous Goal Directive (`/goal TASKS/fetch_portraits.md`):**  
> Systematically search for missing or outdated portrait headshot URLs in `public/faculty.json` and `public/students.json`. Execute the portrait retrieval workflow across **ALL BATCHES CONTINUOUSLY** until **100% of missing entries in the repository are fully audited and processed**. Use official GMU directory pages (`cs.gmu.edu`, `computing.gmu.edu`), academic lab websites, and professional homepages to locate authentic headshots. Carefully inspect image URLs to ensure they depict the exact person and are not non-person icons or logos. Update `Picture`, `Last Modified`, and `Last Verified` fields. For each batch of verified updates, create a topic branch (`task/fetch-portraits-batch-[BATCH_NUM]`), run verification (`npm test && npm run typecheck && npm run validate:data && npm run build && git diff --check`), submit a GitHub PR (or Issue), return to `main`, and **IMMEDIATELY PROCEED TO THE NEXT BATCH**. Do NOT stop execution until ALL batches are completed!

---

## 🎯 Task Goal

Ensure every faculty and student record in the GMU CS directory has a verified portrait image link when publicly available.

---

## 🛠️ Verification & Data Rules

1. **Continuous Execution Mandate:** Do NOT stop after a single batch. Iterate continuously through **all remaining batches** until 100% of missing entries are audited.
2. **Non-Person Image Prevention**: Inspect candidate image URLs carefully. Do NOT use department logos, campus buildings, generic avatars, stock graphics, or corrupted image URLs.
3. **Official Provenance**: Prioritize `cs.gmu.edu/sites/default/files/...` or personal site headshots.
4. **Metadata Updates**: Update `Last Modified` and `Last Verified` to `YYYY-MM-DD`.
5. **Local Verification**:
   ```bash
   npm test && npm run typecheck && npm run validate:data && npm run build && git diff --check
   ```
6. **PR Submission**:
   - Create a topic branch (`task/fetch-portraits-batch-[BATCH_NUM]`).
   - Submit a GitHub Pull Request with image proof. Do NOT commit directly to `main`.
