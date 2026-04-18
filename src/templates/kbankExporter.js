// KBank Template Exporter
// Generates .xlsx in KBank Transaction Upload format
// Matches exact format from bank_payroll_output.xlsx reference file

import ExcelJS from 'exceljs';
import { EmployeeGroupType, calculateEmployeeTotals } from '../models/payroll.js';

// Color constants from reference file (use 6-char RGB for ExcelJS)
const COLORS = {
  GREEN_HEADER: '00B050',       // Green for header row
  GRAY_SUMMARY: 'A5A5A5',      // Gray for summary section
  LIGHT_GRAY_ALT: 'F2F2F2',    // Light gray for alternating rows
  WHITE: 'FFFFFF',
  YELLOW_INPUT: 'FFFF00',      // Yellow for input cells
};

// Border style
const THIN_BORDER = {
  top: { style: 'thin' },
  bottom: { style: 'thin' },
  left: { style: 'thin' },
  right: { style: 'thin' }
};

/**
 * Helper function to create KBank sheet with employee data
 * @param {ExcelJS.Workbook} workbook 
 * @param {Object[]} employees - Filtered employees
 * @param {Object} doc - PayrollDocument
 * @param {string} sheetName - Name for the worksheet
 * @returns {Promise<ExcelJS.Workbook>}
 */
async function createKBankSheet(workbook, employees, doc, sheetName) {
  const sheet = workbook.addWorksheet(sheetName);

  // Get document-level KBank settings
  const branchCode = doc.kbankBranchCode || '004';
  const paymentDate = doc.kbankPaymentDate || doc.payrollDate;

  // Calculate totals
  let totalAmount = 0;
  const employeesWithTotals = employees.map(emp => {
    const totals = calculateEmployeeTotals(emp);
    totalAmount += totals.netPay;
    return { ...emp, calculated: totals };
  });

  const rowCount = employeesWithTotals.length;

  // If no employees, return empty sheet
  if (rowCount === 0) {
    return workbook;
  }

  // Row 1: Summary section with colors
  sheet.getCell('A1').value = 'Total No. of Transaction / จำนวนรายการทั้งหมด ';
  sheet.getCell('A1').font = { bold: true, color: 'FFFFFFFF' };
  sheet.getCell('A1').fill = { type: 'patternFill', pattern: 'solid', fgColor: { rgb: COLORS.GREEN_HEADER } };
  
  // COUNTA formula for transaction count (data starts at row 4)
  sheet.getCell('B1').value = { formula: `COUNTA(B4:B${4 + rowCount - 1})`, result: rowCount };
  sheet.getCell('B1').fill = { type: 'patternFill', pattern: 'solid', fgColor: { rgb: COLORS.GRAY_SUMMARY } };
  
  sheet.getCell('C1').value = 'Total Amount / จำนวนเงินทั้งหมด ';
  sheet.getCell('C1').font = { bold: true, color: 'FFFFFFFF' };
  sheet.getCell('C1').fill = { type: 'patternFill', pattern: 'solid', fgColor: { rgb: COLORS.GREEN_HEADER } };
  
  // SUM formula for total amount
  sheet.getCell('D1').value = { formula: `SUM(D4:D${4 + rowCount - 1})`, result: totalAmount };
  sheet.getCell('D1').numFmt = '#,##0.00';
  sheet.getCell('D1').fill = { type: 'patternFill', pattern: 'solid', fgColor: { rgb: COLORS.GRAY_SUMMARY } };

  // Row 2: Empty row with light gray
  for (let col = 1; col <= 5; col++) {
    sheet.getCell(2, col).fill = { type: 'patternFill', pattern: 'solid', fgColor: { rgb: COLORS.LIGHT_GRAY_ALT } };
  }

  // Row 3: Column headers with green background
  const headers = [
    'Bank Code / \nรหัสธนาคาร',
    'Account number / \nเลขบัญชีรับเงิน',
    'Account name / \nชื่อบัญชีรับเงิน',
    'Amount/ \nจำนวนเงิน',
    'Effective Date /\nวันที่เงินเข้าบัญชี\n(DD/MM/YYYY) '
  ];
  
  const headerRow = sheet.addRow();
  headers.forEach((header, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = header;
    cell.font = { bold: true, color: 'FFFFFFFF' };
    cell.alignment = { wrapText: true, vertical: 'top', horizontal: 'center' };
    cell.fill = { type: 'patternFill', pattern: 'solid', fgColor: { rgb: COLORS.GREEN_HEADER } };
    cell.border = THIN_BORDER;
  });

  // Set row 3 height for wrapped text
  sheet.getRow(3).height = 45;

  // Data rows (starting row 4)
  for (let i = 0; i < employeesWithTotals.length; i++) {
    const emp = employeesWithTotals[i];
    const rowNum = i + 4;
    
    const row = sheet.addRow();
    
    // Alternating row colors
    const rowColor = i % 2 === 0 ? COLORS.WHITE : COLORS.LIGHT_GRAY_ALT;
    
    // Bank Code: Formula that shows branch code if account number exists
    const cell1 = row.getCell(1);
    cell1.value = { formula: `IF(B${rowNum}<>"","${branchCode}","")` };
    cell1.fill = { type: 'patternFill', pattern: 'solid', fgColor: { rgb: COLORS.YELLOW_INPUT } };
    cell1.border = THIN_BORDER;
    
    // Account Number - Yellow (input field in reference)
    // Force text type to preserve leading zeros (e.g., "0123456")
    const cell2 = row.getCell(2);
    cell2.value = String(emp.bankInfo.bankAccountNumber);
    cell2.dataType = 'string';
    cell2.fill = { type: 'patternFill', pattern: 'solid', fgColor: { rgb: COLORS.YELLOW_INPUT } };
    cell2.border = THIN_BORDER;
    
    // Account Name - Light gray (calculated from name)
    const cell3 = row.getCell(3);
    cell3.value = emp.fullName;
    cell3.fill = { type: 'patternFill', pattern: 'solid', fgColor: { rgb: rowColor } };
    cell3.border = THIN_BORDER;
    
    // Amount - Light gray
    const cell4 = row.getCell(4);
    cell4.value = emp.calculated.netPay;
    cell4.numFmt = '#,##0.00';
    cell4.fill = { type: 'patternFill', pattern: 'solid', fgColor: { rgb: rowColor } };
    cell4.border = THIN_BORDER;
    
    // Effective Date: Formula referencing E4 (first date) for all rows
    const cell5 = row.getCell(5);
    cell5.value = { formula: `IF(B${rowNum}<>"",$E$4,"")` };
    cell5.fill = { type: 'patternFill', pattern: 'solid', fgColor: { rgb: rowColor } };
    cell5.border = THIN_BORDER;
  }

  // Set E4 (first date cell) to actual payment date value (DD/MM/YYYY format)
  const dateCell = sheet.getCell('E4');
  dateCell.value = formatDateForKBank(paymentDate);
  dateCell.numFmt = 'DD/MM/YYYY';

  // Set column widths (matching reference)
  sheet.columns = [
    { width: 15 },  // Bank Code
    { width: 18 },  // Account number
    { width: 30 },  // Account name
    { width: 15 },  // Amount
    { width: 20 },  // Effective Date
  ];

  return workbook;
}

/**
 * Export payroll document to KBank Excel format (all employees)
 * @param {Object} doc - PayrollDocument
 * @param {Object} options
 * @returns {Promise<ExcelJS.Workbook>}
 */
export async function exportToKBank(doc, options = {}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'HR Payroll Multi-Export';
  workbook.created = new Date();

  // Filter employees for export
  let employees = doc.employees.filter(e => e.activeForExport);
  
  await createKBankSheet(workbook, employees, doc, 'Transaction Upload');

  return workbook;
}

/**
 * Export payroll document to KBank Excel format (Social Security employees only)
 * @param {Object} doc - PayrollDocument
 * @returns {Promise<ExcelJS.Workbook>}
 */
export async function exportToKBankSS(doc) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'HR Payroll Multi-Export';
  workbook.created = new Date();

  // Filter Social Security employees only
  const employees = doc.employees.filter(
    e => e.activeForExport && e.groupType === EmployeeGroupType.SOCIAL_SECURITY
  );
  
  if (employees.length === 0) {
    throw new Error('No Social Security employees to export');
  }
  
  await createKBankSheet(workbook, employees, doc, 'Transaction Upload SS');

  return workbook;
}

/**
 * Export payroll document to KBank Excel format (Withholding Tax employees only)
 * @param {Object} doc - PayrollDocument
 * @returns {Promise<ExcelJS.Workbook>}
 */
export async function exportToKBankWT(doc) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'HR Payroll Multi-Export';
  workbook.created = new Date();

  // Filter Withholding Tax employees only
  const employees = doc.employees.filter(
    e => e.activeForExport && e.groupType === EmployeeGroupType.WITHHOLDING_TAX
  );
  
  if (employees.length === 0) {
    throw new Error('No Withholding Tax employees to export');
  }
  
  await createKBankSheet(workbook, employees, doc, 'Transaction Upload WT');

  return workbook;
}

/**
 * Format date as DD/MM/YYYY for KBank
 * @param {string} dateStr 
 * @returns {string}
 */
function formatDateForKBank(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}
