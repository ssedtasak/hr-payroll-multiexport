# MVP Fix Plan

## Status: COMPLETED ✅

All items below have been implemented in the codebase:

### 1. Input Field Focus Issue ✅
**Solution Applied:** Using `onBlur` event instead of `onInput` for saving values
- Implemented in App.js `attachEventHandlers()` function
- Employee field inputs use `blur` event to trigger save

### 2. KBank Template - Document Level Fields ✅
**Solution Applied:** Added `kbankBranchCode` and `kbankPaymentDate` to PayrollDocument model
- Fields exist in `createPayrollDocument()` function (payroll.js)
- UI in App.js provides inputs for KBank Branch Code and Payment Date
- KBank exporter uses document-level fields (kbankExporter.js)

**KBank Template Structure (verified):**
```
Row 1: Summary - "Total No. of Transaction" | =COUNTA(B4:B103) | "Total Amount" | =SUM(D4:D103)
Row 2: Empty
Row 3: Headers - Bank Code | Account number | Account name | Amount | Effective Date (DD/MM/YYYY)
Row 4+: Data with formulas:
  - Bank Code: =IF(B4<>"","004","")  [same branch code for all]
  - Effective Date: =IF(B4<>"",$E$4,"")  [same date for all]
```

### 3. Accounting Template Structure ✅
**Solution Applied:** Exporter matches reference format with 21 columns
- Merged cells for section headers (rows 4-5)
- Thin borders on all cells
- Pink fill (FFCCCC) on calculated cells (I, N columns)
- Proper SUM formulas in subtotal row

## Verification

- [x] Build succeeds: `npm run build` completes without errors
- [x] Code splitting works: ExcelJS in separate chunk (938KB)
- [x] Main bundle: 44KB (gzipped: 11KB)
- [x] Input fields use onBlur (no re-render on every keystroke)
- [x] KBank document-level fields exist in model
- [x] Accounting exporter has exact 21-column structure
