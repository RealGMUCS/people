# Discover New Students & Alumni (`discover_new_students_and_alumni.md`)

> **Autonomous Goal Directive (`/goal TASKS/discover_new_students_and_alumni.md`):**  
> Systematically discover unlisted GMU CS PhD students, M.S. thesis students, undergraduate lab researchers, recent graduates, and dissertation deposits on MARS (`mars.gmu.edu`). Audit advisor lab websites, GMU CS lab rosters, Google Scholar, DBLP, and LinkedIn to find current and former GMU CS students not yet in `public/students.json`. Verify primary `Advisor` (matching a faculty entry in `faculty.json`), degree format (`PhD '25`, `MS '24`), dissertation title, placement, and location. Submit proposed new records as a GitHub PR. Never commit directly to `main`. Iterate in bounded batches.

---

## 🎯 Task Purpose & Scope

Expand coverage of GMU CS graduate students, thesis M.S. students, undergraduate researchers, and alumni placements.

---

## 🛠️ Verification & Data Standards

1. **Advisor Validation**: Primary `Advisor` MUST match `First Last` in `public/faculty.json` (or `None` for unadvised coursework MS).
2. **Dissertation Verification**: Verify completed thesis/dissertation titles against MARS (`mars.gmu.edu`).
3. **Local Verification**:
   ```bash
   npm test && npm run typecheck && npm run validate:data && npm run build && git diff --check
   ```
4. **PR Submission**:
   - Submit new entries via GitHub Pull Request on a topic branch.
