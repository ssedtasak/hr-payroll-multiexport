// Template Exporter - Main export orchestrator
// Coordinates export to different formats

import ExcelJS from 'exceljs';
import { exportToAccounting } from './accountingExporter.js';
import { exportToKBank, exportToKBankSS, exportToKBankWT } from './kbankExporter.js';
import { EmployeeGroupType } from '../models/payroll.js';

/**
 * Export payroll to specified format
 * @param {Object} doc - PayrollDocument
 * @param {string} format - 'accounting' | 'kbank' | 'kbank-ss' | 'kbank-wt'
 * @param {Object} options - Export options
 * @returns {Promise<{blob: Blob, filename: string}>}
 */
export async function exportPayroll(doc, format, options = {}) {
  let workbook;
  let filename;

  switch (format) {
    case 'accounting':
      workbook = await exportToAccounting(doc);
      filename = `Payroll_Accounting_${doc.sheetName || 'Export'}_${formatDateFilename(new Date())}.xlsx`;
      break;
      
    case 'kbank-ss':
      workbook = await exportToKBankSS(doc);
      filename = `Payroll_KBank_SS_${doc.sheetName || 'Export'}_${formatDateFilename(new Date())}.xlsx`;
      break;
      
    case 'kbank-wt':
      workbook = await exportToKBankWT(doc);
      filename = `Payroll_KBank_WT_${doc.sheetName || 'Export'}_${formatDateFilename(new Date())}.xlsx`;
      break;
      
    case 'kbank':
      // Export both SS and WT in one file
      workbook = await exportToKBank(doc, options);
      filename = `Payroll_KBank_${doc.sheetName || 'Export'}_${formatDateFilename(new Date())}.xlsx`;
      break;
      
    default:
      throw new Error(`Unknown export format: ${format}`);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });

  return { blob, filename };
}

/**
 * Export all formats at once - KBank creates separate files for SS and WT
 * @param {Object} doc - PayrollDocument
 * @returns {Promise<Array<{blob: Blob, filename: string, format: string}>>}
 */
export async function exportAll(doc) {
  const results = [];

  // Export accounting
  const accounting = await exportPayroll(doc, 'accounting');
  results.push({ ...accounting, format: 'accounting' });

  // Export KBank SS (Social Security employees)
  try {
    const kbankSS = await exportPayroll(doc, 'kbank-ss');
    results.push({ ...kbankSS, format: 'kbank-ss' });
  } catch (e) {
    console.log('No SS employees to export');
  }

  // Export KBank WT (Withholding Tax employees)
  try {
    const kbankWT = await exportPayroll(doc, 'kbank-wt');
    results.push({ ...kbankWT, format: 'kbank-wt' });
  } catch (e) {
    console.log('No WT employees to export');
  }

  return results;
}

/**
 * Trigger download of a blob
 * @param {Blob} blob 
 * @param {string} filename 
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function formatDateFilename(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

/**
 * Generate Excel template for employee data entry
 * Contains all fields matching the app's data structure
 * @returns {Promise<{blob: Blob, filename: string}>}
 */
export async function generateEmployeeTemplate() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'HR Payroll Multi-Export';
  workbook.created = new Date();

  // ========== INSTRUCTIONS SHEET ==========
  const instructionsSheet = workbook.addWorksheet('คำแนะนำ');
  instructionsSheet.getCell('A1').value = 'HR Payroll Multi-Export - แม่แบบข้อมูลพนักงาน';
  instructionsSheet.getCell('A1').font = { bold: true, size: 14 };
  
  instructionsSheet.getCell('A3').value = 'วิธีใช้:';
  instructionsSheet.getCell('A3').font = { bold: true };
  instructionsSheet.getCell('A4').value = '1. เปิดแท็บ "ข้อมูลพนักงาน"';
  instructionsSheet.getCell('A5').value = '2. เติมข้อมูลพนักงานในแถวที่ 3 เป็นต้นไป (หลังจากหัวตาราง)';
  instructionsSheet.getCell('A6').value = '3. คอลัมน์ที่เป็นสีเหลือง = ข้อมูลบังคับ';
  instructionsSheet.getCell('A7').value = '4. คอลัมน์ที่เป็นสีขาว = ข้อมูลทางเลือก (ใส่ 0 ถ้าไม่มี)';
  instructionsSheet.getCell('A8').value = '5. groupType: social_security = ประกันสังคม, withholding_tax = หัก ณ ที่จ่าย';
  
  instructionsSheet.getCell('A10').value = 'หมายเหตุ:';
  instructionsSheet.getCell('A10').font = { bold: true };
  instructionsSheet.getCell('A11').value = '- เลขบัญชีที่ขึ้นต้นด้วย 0 ให้ใส่เครื่องหมาย \' หน้า เช่น \'0123456';
  instructionsSheet.getCell('A12').value = '- ข้อมูลจะถูก import เข้าสู่ระบบเมื่ออัพโหลดไฟล์นี้กลับเข้าแอป';

  instructionsSheet.columns = [{ width: 80 }];

  // ========== EMPLOYEE DATA SHEET ==========
  const sheet = workbook.addWorksheet('ข้อมูลพนักงาน');

  // Header styling
  const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { rgb: '2563EB' } };
  const requiredFill = { type: 'pattern', pattern: 'solid', fgColor: { rgb: 'FFFF00' } };
  const optionalFill = { type: 'pattern', pattern: 'solid', fgColor: { rgb: 'F3F4F6' } };
  const thinBorder = {
    top: { style: 'thin' },
    bottom: { style: 'thin' },
    left: { style: 'thin' },
    right: { style: 'thin' }
  };

  // Define columns
  const columns = [
    { header: 'รหัสพนักงาน', key: 'employeeId', width: 12, required: true },
    { header: 'ชื่อ-นามสกุล', key: 'fullName', width: 25, required: true },
    { header: 'เลขบัญชี', key: 'bankAccountNumber', width: 18, required: true },
    { header: 'รหัสธนาคาร', key: 'bankCode', width: 10, required: false },
    { header: 'ประเภท', key: 'groupType', width: 15, required: true },
    // Earnings
    { header: 'เงินเดือน', key: 'salaryBase', width: 12, required: false },
    { header: 'OT Base', key: 'otBase', width: 10, required: false },
    { header: 'ค่าตำแหน่ง', key: 'positionAllowance', width: 10, required: false },
    { header: 'ค่าภาษา', key: 'languageAllowance', width: 10, required: false },
    { header: 'ค่าอาหาร', key: 'mealAllowance', width: 10, required: false },
    { header: 'ค่าเดินทาง', key: 'transportAllowance', width: 10, required: false },
    { header: 'Service', key: 'service', width: 10, required: false },
    { header: 'Incentive', key: 'incentive', width: 10, required: false },
    { header: 'เบี้ยขยัน', key: 'diligenceBonus', width: 10, required: false },
    { header: 'OT', key: 'ot', width: 10, required: false },
    // Deductions
    { header: 'ประกันสังคม', key: 'socialSecurity', width: 12, required: false },
    { header: 'กยศ', key: 'studentLoan', width: 10, required: false },
    { header: 'ภงด1', key: 'withholdingTax', width: 10, required: false },
    { header: 'หักกู้ยืม', key: 'loanDeduction', width: 10, required: false },
    { header: 'No Work No Pay', key: 'noWorkNoPay', width: 12, required: false },
  ];

  // Create header row
  const headerRow = sheet.addRow();
  columns.forEach((col, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = col.header;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = headerFill;
    cell.border = thinBorder;
    cell.alignment = { horizontal: 'center' };
  });

  // Add sample rows (3 example employees)
  const sampleData = [
    {
      employeeId: 'E001',
      fullName: 'สมชาย สมชื่อ',
      bankAccountNumber: "'0123456", // Leading apostrophe to preserve zero
      bankCode: '004',
      groupType: 'social_security',
      salaryBase: 15000,
      otBase: 0,
      positionAllowance: 0,
      languageAllowance: 0,
      mealAllowance: 0,
      transportAllowance: 0,
      service: 0,
      incentive: 0,
      diligenceBonus: 0,
      ot: 0,
      socialSecurity: 750,
      studentLoan: 0,
      withholdingTax: 0,
      loanDeduction: 0,
      noWorkNoPay: 0,
    },
    {
      employeeId: 'E002',
      fullName: 'สมใจ สมใจ',
      bankAccountNumber: '9876543210',
      bankCode: '004',
      groupType: 'withholding_tax',
      salaryBase: 20000,
      otBase: 0,
      positionAllowance: 3000,
      languageAllowance: 0,
      mealAllowance: 0,
      transportAllowance: 0,
      service: 0,
      incentive: 5000,
      diligenceBonus: 0,
      ot: 0,
      socialSecurity: 0,
      studentLoan: 0,
      withholdingTax: 1500,
      loanDeduction: 0,
      noWorkNoPay: 0,
    },
  ];

  // Add sample data rows
  sampleData.forEach((data, rowIdx) => {
    const row = sheet.addRow();
    columns.forEach((col, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      const value = data[col.key];
      
      // Format numbers - keep as numbers
      if (typeof value === 'number') {
        cell.value = value;
      } else if (value !== undefined && value !== null) {
        cell.value = String(value);
      }
      
      // Apply styling based on required flag
      if (col.required) {
        cell.fill = requiredFill;
      } else {
        cell.fill = optionalFill;
      }
      cell.border = thinBorder;
      
      // Number format for numeric columns
      if (['salaryBase', 'otBase', 'positionAllowance', 'languageAllowance', 
           'mealAllowance', 'transportAllowance', 'service', 'incentive', 
           'diligenceBonus', 'ot', 'socialSecurity', 'studentLoan', 
           'withholdingTax', 'loanDeduction', 'noWorkNoPay'].includes(col.key)) {
        cell.numFmt = '#,##0.00';
        cell.alignment = { horizontal: 'right' };
      }
    });
  });

  // Set column widths
  sheet.columns = columns.map(col => ({ width: col.width }));

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });

  return { blob, filename: `Employee_Template_${formatDateFilename(new Date())}.xlsx` };
}

/**
 * Parse uploaded Excel template and return employee data
 * @param {ArrayBuffer} buffer - Excel file buffer
 * @returns {Promise<Array>} Array of employee objects
 */
export async function parseEmployeeTemplate(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  
  const sheet = workbook.getWorksheet('ข้อมูลพนักงาน');
  if (!sheet) {
    throw new Error('ไม่พบแท็บ "ข้อมูลพนักงาน" ในไฟล์');
  }

  const employees = [];

  // Get headers from row 1
  const headerRow = sheet.getRow(1);
  const headers = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber] = cell.value;
  });

  // Key mapping from header to field
  const keyMap = {
    'รหัสพนักงาน': 'employeeId',
    'ชื่อ-นามสกุล': 'fullName',
    'เลขบัญชี': 'bankAccountNumber',
    'รหัสธนาคาร': 'bankCode',
    'ประเภท': 'groupType',
    'เงินเดือน': 'salaryBase',
    'OT Base': 'otBase',
    'ค่าตำแหน่ง': 'positionAllowance',
    'ค่าภาษา': 'languageAllowance',
    'ค่าอาหาร': 'mealAllowance',
    'ค่าเดินทาง': 'transportAllowance',
    'Service': 'service',
    'Incentive': 'incentive',
    'เบี้ยขยัน': 'diligenceBonus',
    'OT': 'ot',
    'ประกันสังคม': 'socialSecurity',
    'กยศ': 'studentLoan',
    'ภงด1': 'withholdingTax',
    'หักกู้ยืม': 'loanDeduction',
    'No Work No Pay': 'noWorkNoPay',
  };

  // Parse data rows (skip header row 1 + 2 sample rows 2-3)
  sheet.eachRow({ includeEmpty: false }, (row, rowNum) => {
    if (rowNum < 4) return; // Skip header and sample rows

    const rowData = {};
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const header = headers[colNumber];
      const key = keyMap[header];
      if (key) {
        let value = cell.value;
        // Remove leading apostrophe from bank account numbers
        if (key === 'bankAccountNumber' && typeof value === 'string' && value.startsWith("'")) {
          value = value.substring(1);
        }
        rowData[key] = value;
      }
    });

    // Only add if has employeeId or fullName
    if (rowData.employeeId || rowData.fullName) {
      // Build complete employee object
      const emp = {
        employeeId: rowData.employeeId || '',
        fullName: rowData.fullName || '',
        groupType: rowData.groupType === 'withholding_tax' 
          ? EmployeeGroupType.WITHHOLDING_TAX 
          : EmployeeGroupType.SOCIAL_SECURITY,
        bankInfo: {
          bankCode: rowData.bankCode || '004',
          bankAccountNumber: String(rowData.bankAccountNumber || ''),
          bankAccountName: rowData.fullName || '',
        },
        earnings: {
          salaryBase: parseFloat(rowData.salaryBase) || 0,
          otBase: parseFloat(rowData.otBase) || 0,
          positionAllowance: parseFloat(rowData.positionAllowance) || 0,
          languageAllowance: parseFloat(rowData.languageAllowance) || 0,
          mealAllowance: parseFloat(rowData.mealAllowance) || 0,
          transportAllowance: parseFloat(rowData.transportAllowance) || 0,
          service: parseFloat(rowData.service) || 0,
          incentive: parseFloat(rowData.incentive) || 0,
          diligenceBonus: parseFloat(rowData.diligenceBonus) || 0,
          ot: parseFloat(rowData.ot) || 0,
        },
        deductions: {
          socialSecurity: parseFloat(rowData.socialSecurity) || 0,
          studentLoan: parseFloat(rowData.studentLoan) || 0,
          withholdingTax: parseFloat(rowData.withholdingTax) || 0,
          loanDeduction: parseFloat(rowData.loanDeduction) || 0,
          noWorkNoPay: parseFloat(rowData.noWorkNoPay) || 0,
          personalIncomeTax: 0,
          otherDeduction: 0,
        },
      };
      employees.push(emp);
    }
  });

  return employees;
}
