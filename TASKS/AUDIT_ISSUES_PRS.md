# GMU CS People Directory PR & Issue Audit Agent (`AUDIT_ISSUES_PRS.md`)

> **Autonomous Goal Directive (`/goal TASKS/AUDIT_ISSUES_PRS.md`):**
> Execute the task workflow across **ALL BATCHES CONTINUOUSLY** until **100% of items in the repository are fully audited and processed**. Inspect all open GitHub Pull Requests, PR topic branches, and open GitHub Issues in the `people` repository (`../people`). Validate all proposed roster changes against live evidence, schema contracts in `ROSTER_MAINTENANCE.md`, and local tests (`npm test && npm run typecheck && npm run validate:data && npm run build && git diff --check`). Squash-merge clean, verified PRs into `main`, delete merged topic branches, and post detailed comment updates or close resolved issues. Iterate in bounded batches until all open PRs and issues are completely audited. Do NOT stop execution until ALL batches are completed!

---

## 🎯 Purpose & Scope

This task playbook instructs an autonomous audit agent to act as the primary review gate for all maintenance proposals, faculty updates, student/alumni additions, portrait URLs, and award updates in `people`.

---

## 🛠️ Step-by-Step Execution Workflow

### 1. Survey Open Pull Requests & Issues
Execute git and GitHub CLI commands to audit active branches, PRs, and issues:
```bash
git fetch origin
git branch -r
gh pr list --state open
gh issue list --state open
```

### 2. Audit & Verify Pull Requests
For each open Pull Request:
1. **Checkout & Inspect**:
   ```bash
   git checkout <branch-name>
   git diff main...<branch-name>
   ```
2. **Data & Schema Verification**:
   - Check `ROSTER_MAINTENANCE.md` rules.
   - Confirm `Last Modified` and `Last Verified` dates are updated to `YYYY-MM-DD`.
   - Confirm `Verified` is set to `Yes` ONLY if confirmed by direct correspondence.
   - Confirm degree formats (`PhD '23`, `MS '24`), institution names, and dissertation titles.
3. **Run Local Test & Build Suite**:
   ```bash
   npm test && npm run typecheck && npm run validate:data && npm run build && git diff --check
   ```
4. **Merge or Request Revision**:
   - If tests pass and data edits are fully verified:
     ```bash
     git checkout main
     git merge --squash <branch-name>
     git commit -m "fix(roster): squash merge PR #<num> - <summary>"
     git push origin main
     git branch -d <branch-name>
     git push origin --delete <branch-name>
     gh pr close <num> --comment "Verified and squash-merged into main."
     ```
   - If changes fail tests or contain unverified claims, leave a detailed review comment on the PR explaining the exact failure or missing proof.

### 3. Process & Resolve Open Issues
For each open GitHub Issue:
1. Review the submitted faculty correction, student graduation update, or award addition.
2. Search official web sources to verify the claim.
3. If verified, apply the edit on a topic branch, run local verification suite (`npm test && npm run typecheck && npm run validate:data && npm run build && git diff --check`), submit/merge, and close the issue with a link to the fix commit.

---

## 🏁 Verification Checklist

- [ ] All open PRs audited and tested against `npm test && npm run typecheck && npm run validate:data && npm run build && git diff --check`.
- [ ] Approved PRs squash-merged into `main` and branch names cleaned up.
- [ ] No direct unverified commits pushed to `main`.
