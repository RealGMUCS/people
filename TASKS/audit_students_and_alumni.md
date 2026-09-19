# Audit Graduate Students & Alumni Roster (`audit_students_and_alumni.md`)

> **Autonomous Goal Directive (`/goal TASKS/audit_students_and_alumni.md`):**  
> Systematically audit and update graduate student and alumni records in `public/students.json`. Cross-check PhD/MS degree progress, primary advisors (`Advisor` matching `First Last` in `faculty.json`), co-advisors, dissertation titles against MARS (Mason Archival Repository Service at `mars.gmu.edu`), first jobs, current placements, location, internships, honors, and research topics. Set `Verified: Yes` ONLY if confirmed by direct communication. Update `Last Modified` and `Last Verified` timestamps. Submit updates as a GitHub PR. Never commit directly to `main`. Iterate in bounded batches until all student records are verified.

---

## 🎯 Task Goal

Maintain an accurate, comprehensive directory of current PhD/MS students and alumni from GMU CS.

---

## 🛠️ Data Standards & Verification Rules

1. **Advisor Validation**: Primary `Advisor` MUST match the exact `First Last` name in `public/faculty.json`. Set to `None` for unadvised coursework M.S. students.
2. **Degree Formatting**: `PhD '23`, `MS '24`, `BS '25`, `PhD`.
3. **Dissertation Proof**: Verify doctoral dissertation and master's thesis titles against official MARS repository records.
4. **Metadata Rules**:
   - Set `Last Modified` and `Last Verified` to `YYYY-MM-DD`.
   - Set `Verified: Yes` only for direct subject/advisor confirmation.
5. **Local Verification**:
   ```bash
   npm test && npm run typecheck && npm run validate:data && npm run build && git diff --check
   ```
6. **PR / Issue Protocol**:
   - Submit updates via GitHub PR on a topic branch.
