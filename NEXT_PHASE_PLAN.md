# Next Phase Plan

## Completed Features ✅

### Priority 1: LocalStorage Auto-Save ✅
- Auto-save to localStorage on every change
- Load from localStorage on page load
- Save Draft / Load Draft buttons
- Clear button to reset

### Priority 2: Employee Master + CSV Upload ✅
- Employee Master section with purple gradient UI
- Download CSV Template button
- Upload CSV button with parsing
- Add employee from master to payroll
- Delete employee from master
- Clear Master button with confirmation
- Fixed: Bank account number saving (flat vs nested data)

### Priority 3: Accounting Exact Styling ✅
- Matched 21-column reference format
- Merged cells for section headers (rows 4-5)
- Thin borders on all cells
- Pink fill (FFCCCC) on calculated cells
- Matched column widths from reference
- Subtotal rows with SUM formulas

### Priority 4: Code Splitting ✅
- Split ExcelJS into separate chunk
- Main app: 44KB (gzipped: 11KB)
- ExcelJS: 938KB (gzipped: 271KB)
- Better caching

### Priority 5: KBank Document-Level Fields ✅
- Added `kbankBranchCode` and `kbankPaymentDate` to PayrollDocument model
- UI for KBank Branch Code and Payment Date inputs
- KBank exporter uses document-level branch code and payment date
- DD/MM/YYYY date format in KBank output

### Priority 6: Input Focus Fix ✅
- Changed from `onInput` to `onBlur` for employee field inputs
- Prevents re-render on every keystroke which caused focus loss

---

## Future Ideas (Not Started)

### Priority A: Batch CSV Upload
- Upload multiple CSV files at once
- Merge employees from different sources
- Deduplication logic

### Priority B: Print Payroll Summary
- Generate printable payroll report
- PDF export option
- Summary of totals by section

### Priority C: Email Notifications
- Email errors when export fails
- Notification for incomplete data
- Integration with SMTP or SendGrid

### Priority D: Multi-Branch Support
- Manage multiple branches
- Separate exports per branch
- Branch-specific KBank settings
