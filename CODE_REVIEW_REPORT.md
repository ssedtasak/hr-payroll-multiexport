# Code Review Report
**Project:** HR Payroll Multi-Export
**Date:** 2026-04-18
**Scope:** `src/` (App, models, engines, templates, utils)

---

## Summary

Overall the code is well-structured with clear separation (models, engines, templates). Below are findings grouped by severity. The **High** items should be fixed before the next release.

| Severity | Count |
|----------|-------|
| High     | 5     |
| Medium   | 8     |
| Low / Polish | 7 |

---

## HIGH severity

### 1. Excel template parser imports sample row as real data
`src/templates/exporter.js` → `parseEmployeeTemplate`
```js
if (rowNum < 3) return; // Skip header and sample rows
```
The template writes **1 header** (row 1) + **2 sample rows** (rows 2 & 3). The guard only skips row 2, so the second sample (`สมใจ สมใจ`) will be imported every time a user uploads the template unedited.
**Fix:** skip `rowNum < 4`, OR mark sample rows with a special flag, OR do not write sample rows at all (leave one blank guidance row).

### 2. KBank netPay validation never runs
`src/engines/validationEngine.js` → `validateForKBank`
```js
const totals = emp.calculated || {};
if (totals.netPay <= 0) { ... }
```
`emp.calculated` is never attached to raw document employees, so `totals.netPay` is always `undefined`, `undefined <= 0` is `false`, and the check is a no-op. Employees with zero/negative net pay could be exported.
**Fix:** call `calculateEmployeeTotals(emp)` inline.

### 3. XSS risk in Employee Master list
`src/App.js` → `renderMasterEmployeeList`
```js
<span class="master-item-bank"> | ${emp.bankInfo?.bankAccountNumber || '-'} | ${emp.bankInfo?.bankCode || '-'}</span>
```
`bankAccountNumber` and `bankCode` come from user-supplied CSV/Excel and are inserted into `innerHTML` **without `escapeHtml`**. A malicious CSV with `<script>` or `<img onerror>` in those fields would execute.
**Fix:** wrap both with `escapeHtml(...)`.

### 4. CSV / Excel formula injection in generated files
Employee names, bank names, etc. are written raw into exported `.xlsx`. If a user enters `=CMD|'/C calc'!A0` (or similar) as a name, opening the exported file in Excel may execute the formula.
**Fix:** when writing string cells that came from user input, prefix any value starting with `=`, `+`, `-`, `@`, `\t`, `\r` with a single quote, or set `cell.value = { richText: [{ text: value }] }`.

### 5. `cell.font.color` uses wrong shape
Multiple places in `kbankExporter.js` / `exporter.js`:
```js
cell.font = { bold: true, color: 'FFFFFFFF' };
```
ExcelJS expects `color: { argb: 'FFFFFFFF' }`. The current string form is silently ignored, so header text is not actually white.
**Fix:** `color: { argb: 'FFFFFFFF' }`.

---

## MEDIUM severity

### 6. `calculateEmployeeTotals` ignores `otBase`/`diligenceBonus` double-count risk
`earnings.ot` and `earnings.otBase` are both summed into extra income. If the UI treats `otBase` as the rate and `ot` as the final amount, the total will be inflated. Clarify which is "amount" vs "rate" and document it.

### 7. O(n²) master import
`addToEmployeeMaster` reads and writes localStorage on every call; importing 100 employees does 100 full reads + writes.
**Fix:** accept a batch: `addManyToMaster(list)`.

### 8. `loadDraft` does no schema validation
`src/App.js` → `loadDraft` trusts any uploaded JSON. A malformed file can crash the app. Validate top-level keys and fall back safely.

### 9. CSV parser doesn't handle escaped quotes
`src/utils/csvParser.js` → `parseCSVLine` flips `inQuotes` on every `"`, so `"he said ""hi"""` is parsed incorrectly.
**Fix:** detect `""` and treat as a literal quote.

### 10. `bankCode` silently defaults to `004`
In `parseEmployeeTemplate` and `parseEmployeeCSV`, missing `bankCode` becomes `004` (KBank) with no warning. A non-KBank account will fail at the bank upload stage.
**Fix:** surface a warning and/or require the field.

### 11. Draft contains PII stored in plain localStorage
Names, salaries, bank accounts, and the whole master sit in localStorage unencrypted. On shared machines this leaks payroll data. Consider:
- warning the user on first use,
- clearing on tab close (sessionStorage option), or
- providing an explicit lock/PIN (out of scope for MVP, but document).

### 12. Hardcoded SS threshold (17,500 / 875) in Excel formula
`accountingExporter.js`:
```js
{ formula: `ROUND(IF((I${row}+J${row})>17500,875,0))` }
```
The social-security cap changes over time. Extract to a constant and document the law source.

### 13. `validateForAccounting` rejects zero salary
Some edge cases (new hire with only OT, commission-only staff) may legitimately have `salaryBase = 0`. Loosen to `< 0` or allow when grossIncome > 0.

---

## LOW / polish

### 14. Unused variables
`src/templates/exporter.js` → `parseEmployeeTemplate` declares `const errors = []` and never pushes/returns it.

### 15. `generateId` uses deprecated `substr`
```js
Math.random().toString(36).substr(2, 9)
```
`substr` is deprecated; use `substring` or `slice`.

### 16. Magic strings for group types
`'social_security'` / `'withholding_tax'` appear both as enum values and as raw strings in CSV/Excel parsing. Always import `EmployeeGroupType` and compare against the enum.

### 17. `accountingExporter.js` unused import
`calculateEmployeeTotals` is imported but not used.

### 18. Thai Buddhist calendar is hard-coded in accounting exporter
`formatThaiDate` always adds 543 years. Good default, but add a comment/explanation so a future dev doesn't "fix" it.

### 19. No automated tests
`package.json` has `lint` and `typecheck` scripts but no `test`. The calculation engine and exporters are pure functions — ideal for Jest/Vitest. Add a minimal test suite covering:
- `calculateEmployeeTotals` (SS vs WT, zero values)
- `parseEmployeeCSV` (quoted fields, missing columns)
- `parseEmployeeTemplate` round-trip.

### 20. No CI
Add a GitHub Actions workflow running `npm run lint` + `npm run build` on PRs (repo is public now).

---

## Suggested fix order

1. Items **1, 2, 3** (correctness + security) — <1h of work.
2. Items **4, 5** (Excel quality) — 1–2h.
3. Items **9, 10, 11** (input handling + PII warning) — 2–4h.
4. Add a smoke test suite (Item 19) — 2h.
5. Add CI (Item 20) — 30min.

Nothing blocks users today, but Items 1 and 3 are user-visible defects that will cause confusion or a security incident if ignored.

---

## Strengths (keep doing this)

- Clear single-source-of-truth data model (`src/models/payroll.js`).
- Deterministic calculation engine separated from UI.
- Export templates isolated per target (accounting / KBank-SS / KBank-WT).
- Auto-save to localStorage is a nice UX touch.
- Recent fix for leading-zero bank accounts is correct.
