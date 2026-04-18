// Accounting Template Exporter
// Generates .xlsx in the format required by accounting office
// Matches reference format from Accounting_output.xlsx

import ExcelJS from 'exceljs';
import { EmployeeGroupType, calculateEmployeeTotals } from '../models/payroll.js';

/**
 * Export payroll document to accounting Excel format
 * @param {Object} doc - PayrollDocument
 * @returns {Promise<ExcelJS.Workbook>}
 */
export async function exportToAccounting(doc) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'HR Payroll Multi-Export';
  workbook.created = new Date();

  // Group employees by type
  const socialSecurityEmployees = doc.employees.filter(
    e => e.groupType === EmployeeGroupType.SOCIAL_SECURITY && e.activeForExport
  );
  const withholdingTaxEmployees = doc.employees.filter(
    e => e.groupType === EmployeeGroupType.WITHHOLDING_TAX && e.activeForExport
  );

  // Create sheets
  const sheetName = doc.sheetName || doc.branchName || 'Inrich';
  
  // Sheet 1: Social Security Employees
  const ssSheet = workbook.addWorksheet(`SS - ${sheetName}`);
  await populateAccountingSheet(ssSheet, socialSecurityEmployees, doc, 'social_security');

  // Sheet 2: Withholding Tax Employees
  const wtSheet = workbook.addWorksheet(`WT - ${sheetName}`);
  await populateAccountingSheet(wtSheet, withholdingTaxEmployees, doc, 'withholding_tax');

  return workbook;
}

async function populateAccountingSheet(sheet, employees, doc, groupType) {
  const isSS = groupType === 'social_security';
  const sectionLabel = isSS ? 'พนักงานประกันสังคม' : 'พนักงาน หัก ณ ที่จ่าย';

  // Thin border style
  const thinBorder = {
    top: { style: 'thin' },
    bottom: { style: 'thin' },
    left: { style: 'thin' },
    right: { style: 'thin' }
  };

  // Pink fill for calculated cells (FFCCCC)
  const pinkFill = { type: 'pattern', pattern: 'solid', fgColor: { rgb: 'FFCCCC' } };

  // ============ Row 1: Company name ============
  sheet.getCell('A1').value = 'ชื่อบริษัทฯ';
  sheet.getCell('A1').font = { bold: true };
  sheet.getCell('C1').value = doc.companyName || 'Company';
  sheet.getCell('C1').font = { bold: true };

  // ============ Row 2: Payroll date ============
  sheet.getCell('A2').value = 'รอบการจ่ายเงินเดือนวันที่ ';
  sheet.getCell('A2').font = { bold: true };
  sheet.getCell('C2').value = formatThaiDate(doc.payrollDate);
  sheet.getCell('C2').font = { bold: false };

  // ============ Row 4: Section header ============
  sheet.getCell('A4').value = sectionLabel;
  sheet.getCell('A4').font = { bold: true };
  sheet.mergeCells(`A${4}:A${5}`); // Merge A4:A5

  sheet.getCell('B4').value = 'ลำดับที่';
  sheet.getCell('B4').font = { bold: true };
  sheet.mergeCells(`B${4}:B${5}`);
  applyBorderToCell(sheet.getCell('B4'), thinBorder);

  sheet.getCell('C4').value = 'ชื่อ - นามสกุล';
  sheet.getCell('C4').font = { bold: true };
  sheet.mergeCells(`C${4}:C${5}`);
  applyBorderToCell(sheet.getCell('C4'), thinBorder);

  // D4: "รายละเอียดเงินเดือน" - merge D4:H4
  sheet.mergeCells('D4:H4');
  sheet.getCell('D4').value = 'รายละเอียดเงินเดือน';
  sheet.getCell('D4').font = { bold: true };
  sheet.getCell('D4').alignment = { horizontal: 'center' };
  applyBorderToCell(sheet.getCell('D4'), thinBorder);

  // D5: "Salary Base"
  sheet.getCell('D5').value = 'Salary Base';
  sheet.getCell('D5').font = { bold: true, size: 9 };
  applyBorderToCell(sheet.getCell('D5'), thinBorder);

  // E5: "เงินได้อื่นๆ"
  sheet.getCell('E5').value = 'เงินได้อื่นๆ';
  sheet.getCell('E5').font = { bold: true, size: 9 };
  applyBorderToCell(sheet.getCell('E5'), thinBorder);

  // F5: "ค่าอาหาร"
  sheet.getCell('F5').value = 'ค่าอาหาร';
  sheet.getCell('F5').font = { bold: true, size: 9 };
  applyBorderToCell(sheet.getCell('F5'), thinBorder);

  // G5: blank (border only)
  applyBorderToCell(sheet.getCell('G5'), thinBorder);

  // H5: blank (border only)
  applyBorderToCell(sheet.getCell('H5'), thinBorder);

  // I4: "เงินเดือน"
  sheet.getCell('I4').value = 'เงินเดือน';
  sheet.getCell('I4').font = { bold: true };
  sheet.mergeCells(`I${4}:I${5}`);
  applyBorderToCell(sheet.getCell('I4'), thinBorder);

  // J4: "Commission" - merge J4:M4
  sheet.mergeCells('J4:M4');
  sheet.getCell('J4').value = 'Commission';
  sheet.getCell('J4').font = { bold: true };
  sheet.getCell('J4').alignment = { horizontal: 'center' };
  applyBorderToCell(sheet.getCell('J4'), thinBorder);

  // J5: "Service"
  sheet.getCell('J5').value = 'Service';
  sheet.getCell('J5').font = { bold: true, size: 9 };
  applyBorderToCell(sheet.getCell('J5'), thinBorder);

  // K5: "Incentive"
  sheet.getCell('K5').value = 'Incentive';
  sheet.getCell('K5').font = { bold: true, size: 9 };
  applyBorderToCell(sheet.getCell('K5'), thinBorder);

  // L5: "เบี้ยขยัน"
  sheet.getCell('L5').value = 'เบี้ยขยัน';
  sheet.getCell('L5').font = { bold: true, size: 9 };
  applyBorderToCell(sheet.getCell('L5'), thinBorder);

  // M5: "OT"
  sheet.getCell('M5').value = 'OT';
  sheet.getCell('M5').font = { bold: true, size: 9 };
  applyBorderToCell(sheet.getCell('M5'), thinBorder);

  // N4: "รวม Commission"
  sheet.getCell('N4').value = 'รวม Commission';
  sheet.getCell('N4').font = { bold: true };
  sheet.getCell('N4').alignment = { wrapText: true };
  sheet.mergeCells(`N${4}:N${5}`);
  applyBorderToCell(sheet.getCell('N4'), thinBorder);

  // O4: "รวมรายรับ"
  sheet.getCell('O4').value = 'รวมรายรับ';
  sheet.getCell('O4').font = { bold: true };
  sheet.mergeCells(`O${4}:O${5}`);
  applyBorderToCell(sheet.getCell('O4'), thinBorder);

  // P4: deductions header
  if (isSS) {
    sheet.getCell('P4').value = 'รายการหัก';
    sheet.getCell('P4').font = { bold: true };
    sheet.mergeCells(`P${4}:T${4}`);
    sheet.getCell('P4').alignment = { horizontal: 'center' };
    applyBorderToCell(sheet.getCell('P4'), thinBorder);
  } else {
    sheet.getCell('P4').value = 'หัก ณ ที่จ่าย';
    sheet.getCell('P4').font = { bold: true };
    sheet.mergeCells(`P${4}:T${4}`);
    sheet.getCell('P4').alignment = { horizontal: 'center' };
    applyBorderToCell(sheet.getCell('P4'), thinBorder);
  }

  // P5: "ปกส." for SS, blank for WT
  sheet.getCell('P5').value = isSS ? 'ปกส.' : '';
  sheet.getCell('P5').font = { bold: true, size: 9 };
  applyBorderToCell(sheet.getCell('P5'), thinBorder);

  // Q5: "กยศ." for SS, "ภงด.1" for WT
  sheet.getCell('Q5').value = isSS ? 'กยศ.' : 'ภงด.1';
  sheet.getCell('Q5').font = { bold: true, size: 9 };
  applyBorderToCell(sheet.getCell('Q5'), thinBorder);

  // R5: blank
  applyBorderToCell(sheet.getCell('R5'), thinBorder);

  // S5: "หักกู้ยืม"
  sheet.getCell('S5').value = 'หักกู้ยืม';
  sheet.getCell('S5').font = { bold: true, size: 9 };
  applyBorderToCell(sheet.getCell('S5'), thinBorder);

  // T5: "No work No pay"
  sheet.getCell('T5').value = 'No work No pay';
  sheet.getCell('T5').font = { bold: true, size: 9 };
  applyBorderToCell(sheet.getCell('T5'), thinBorder);

  // U4: "รวมรายการหัก"
  sheet.getCell('U4').value = 'รวมรายการหัก';
  sheet.getCell('U4').font = { bold: true };
  sheet.getCell('U4').alignment = { wrapText: true };
  sheet.mergeCells(`U${4}:U${5}`);
  applyBorderToCell(sheet.getCell('U4'), thinBorder);

  // V4: "รวมสุทธิ"
  sheet.getCell('V4').value = 'รวมสุทธิ';
  sheet.getCell('V4').font = { bold: true };
  sheet.mergeCells(`V${4}:V${5}`);
  applyBorderToCell(sheet.getCell('V4'), thinBorder);

  // ============ Data rows ============
  const startRow = 6;
  let rowNum = 1;

  for (const emp of employees) {
    const row = startRow + rowNum - 1;

    // Column A: empty (merged with section header)
    applyBorderToCell(sheet.getCell(`A${row}`), thinBorder);

    // Column B: sequence number
    sheet.getCell(`B${row}`).value = rowNum;
    applyBorderToCell(sheet.getCell(`B${row}`), thinBorder);

    // Column C: employee name
    sheet.getCell(`C${row}`).value = emp.fullName;
    applyBorderToCell(sheet.getCell(`C${row}`), thinBorder);

    // Earnings - Column D: salaryBase
    sheet.getCell(`D${row}`).value = emp.earnings.salaryBase;
    applyBorderToCell(sheet.getCell(`D${row}`), thinBorder);

    // Column E: positionAllowance + languageAllowance
    sheet.getCell(`E${row}`).value = emp.earnings.positionAllowance + emp.earnings.languageAllowance;
    applyBorderToCell(sheet.getCell(`E${row}`), thinBorder);

    // Column F: mealAllowance
    sheet.getCell(`F${row}`).value = emp.earnings.mealAllowance;
    applyBorderToCell(sheet.getCell(`F${row}`), thinBorder);

    // Column G: transportAllowance
    sheet.getCell(`G${row}`).value = emp.earnings.transportAllowance;
    applyBorderToCell(sheet.getCell(`G${row}`), thinBorder);

    // Column H: blank
    applyBorderToCell(sheet.getCell(`H${row}`), thinBorder);

    // Column I: Salary Total (formula = SUM(D:H))
    sheet.getCell(`I${row}`).value = { formula: `SUM(D${row}:H${row})` };
    sheet.getCell(`I${row}`).font = { bold: true };
    sheet.getCell(`I${row}`).fill = pinkFill;
    applyBorderToCell(sheet.getCell(`I${row}`), thinBorder);

    // Commission columns
    // J: service
    sheet.getCell(`J${row}`).value = emp.earnings.service;
    applyBorderToCell(sheet.getCell(`J${row}`), thinBorder);

    // K: incentive
    sheet.getCell(`K${row}`).value = emp.earnings.incentive;
    applyBorderToCell(sheet.getCell(`K${row}`), thinBorder);

    // L: diligenceBonus
    sheet.getCell(`L${row}`).value = emp.earnings.diligenceBonus;
    applyBorderToCell(sheet.getCell(`L${row}`), thinBorder);

    // M: OT
    sheet.getCell(`M${row}`).value = emp.earnings.ot;
    applyBorderToCell(sheet.getCell(`M${row}`), thinBorder);

    // N: Total Commission (formula = SUM(J:M))
    sheet.getCell(`N${row}`).value = { formula: `SUM(J${row}:M${row})` };
    sheet.getCell(`N${row}`).fill = pinkFill;
    applyBorderToCell(sheet.getCell(`N${row}`), thinBorder);

    // O: Gross Income (formula = I + N)
    sheet.getCell(`O${row}`).value = { formula: `I${row}+N${row}` };
    sheet.getCell(`O${row}`).font = { bold: true };
    applyBorderToCell(sheet.getCell(`O${row}`), thinBorder);

    // Deductions
    if (isSS) {
      // P: socialSecurity (ปกส.)
      sheet.getCell(`P${row}`).value = { formula: `ROUND(IF((I${row}+J${row})>17500,875,0))` };
      applyBorderToCell(sheet.getCell(`P${row}`), thinBorder);
    }

    // Q: studentLoan for SS, withholdingTax for WT
    if (isSS) {
      sheet.getCell(`Q${row}`).value = emp.deductions.studentLoan;
    } else {
      sheet.getCell(`Q${row}`).value = emp.deductions.withholdingTax;
    }
    applyBorderToCell(sheet.getCell(`Q${row}`), thinBorder);

    // R: personalIncomeTax
    sheet.getCell(`R${row}`).value = emp.deductions.personalIncomeTax;
    applyBorderToCell(sheet.getCell(`R${row}`), thinBorder);

    // S: loanDeduction
    sheet.getCell(`S${row}`).value = emp.deductions.loanDeduction;
    applyBorderToCell(sheet.getCell(`S${row}`), thinBorder);

    // T: noWorkNoPay
    sheet.getCell(`T${row}`).value = emp.deductions.noWorkNoPay;
    applyBorderToCell(sheet.getCell(`T${row}`), thinBorder);

    // U: Total Deductions (formula = SUM(P:T or Q:T))
    if (isSS) {
      sheet.getCell(`U${row}`).value = { formula: `SUM(P${row}:T${row})` };
    } else {
      sheet.getCell(`U${row}`).value = { formula: `SUM(Q${row}:T${row})` };
    }
    sheet.getCell(`U${row}`).font = { bold: true };
    applyBorderToCell(sheet.getCell(`U${row}`), thinBorder);

    // V: Net Pay (formula = O - U)
    sheet.getCell(`V${row}`).value = { formula: `O${row}-U${row}` };
    sheet.getCell(`V${row}`).font = { bold: true };
    applyBorderToCell(sheet.getCell(`V${row}`), thinBorder);

    rowNum++;
  }

  // ============ Subtotal row ============
  const subtotalRow = startRow + employees.length;
  const lastDataRow = subtotalRow - 1;

  // A: "รวม" label
  sheet.getCell(`A${subtotalRow}`).value = `รวม${sectionLabel}`;
  sheet.getCell(`A${subtotalRow}`).font = { bold: true };
  applyBorderToCell(sheet.getCell(`A${subtotalRow}`), thinBorder);

  // B: blank
  applyBorderToCell(sheet.getCell(`B${subtotalRow}`), thinBorder);

  // C: blank
  applyBorderToCell(sheet.getCell(`C${subtotalRow}`), thinBorder);

  // D: SUM formula
  sheet.getCell(`D${subtotalRow}`).value = { formula: `SUM(D${startRow}:D${lastDataRow})` };
  sheet.getCell(`D${subtotalRow}`).font = { bold: true };
  applyBorderToCell(sheet.getCell(`D${subtotalRow}`), thinBorder);

  // E: SUM formula
  sheet.getCell(`E${subtotalRow}`).value = { formula: `SUM(E${startRow}:E${lastDataRow})` };
  sheet.getCell(`E${subtotalRow}`).font = { bold: true };
  applyBorderToCell(sheet.getCell(`E${subtotalRow}`), thinBorder);

  // F: SUM formula
  sheet.getCell(`F${subtotalRow}`).value = { formula: `SUM(F${startRow}:F${lastDataRow})` };
  sheet.getCell(`F${subtotalRow}`).font = { bold: true };
  applyBorderToCell(sheet.getCell(`F${subtotalRow}`), thinBorder);

  // G: SUM formula
  sheet.getCell(`G${subtotalRow}`).value = { formula: `SUM(G${startRow}:G${lastDataRow})` };
  sheet.getCell(`G${subtotalRow}`).font = { bold: true };
  applyBorderToCell(sheet.getCell(`G${subtotalRow}`), thinBorder);

  // H: blank
  applyBorderToCell(sheet.getCell(`H${subtotalRow}`), thinBorder);

  // I: SUM formula
  sheet.getCell(`I${subtotalRow}`).value = { formula: `SUM(I${startRow}:I${lastDataRow})` };
  sheet.getCell(`I${subtotalRow}`).font = { bold: true };
  applyBorderToCell(sheet.getCell(`I${subtotalRow}`), thinBorder);

  // J: SUM formula
  sheet.getCell(`J${subtotalRow}`).value = { formula: `SUM(J${startRow}:J${lastDataRow})` };
  sheet.getCell(`J${subtotalRow}`).font = { bold: true };
  applyBorderToCell(sheet.getCell(`J${subtotalRow}`), thinBorder);

  // K: SUM formula
  sheet.getCell(`K${subtotalRow}`).value = { formula: `SUM(K${startRow}:K${lastDataRow})` };
  sheet.getCell(`K${subtotalRow}`).font = { bold: true };
  applyBorderToCell(sheet.getCell(`K${subtotalRow}`), thinBorder);

  // L: SUM formula
  sheet.getCell(`L${subtotalRow}`).value = { formula: `SUM(L${startRow}:L${lastDataRow})` };
  sheet.getCell(`L${subtotalRow}`).font = { bold: true };
  applyBorderToCell(sheet.getCell(`L${subtotalRow}`), thinBorder);

  // M: SUM formula
  sheet.getCell(`M${subtotalRow}`).value = { formula: `SUM(M${startRow}:M${lastDataRow})` };
  sheet.getCell(`M${subtotalRow}`).font = { bold: true };
  applyBorderToCell(sheet.getCell(`M${subtotalRow}`), thinBorder);

  // N: SUM formula
  sheet.getCell(`N${subtotalRow}`).value = { formula: `SUM(N${startRow}:N${lastDataRow})` };
  sheet.getCell(`N${subtotalRow}`).font = { bold: true };
  applyBorderToCell(sheet.getCell(`N${subtotalRow}`), thinBorder);

  // O: SUM formula
  sheet.getCell(`O${subtotalRow}`).value = { formula: `SUM(O${startRow}:O${lastDataRow})` };
  sheet.getCell(`O${subtotalRow}`).font = { bold: true };
  applyBorderToCell(sheet.getCell(`O${subtotalRow}`), thinBorder);

  if (isSS) {
    // P: SUM formula
    sheet.getCell(`P${subtotalRow}`).value = { formula: `SUM(P${startRow}:P${lastDataRow})` };
    sheet.getCell(`P${subtotalRow}`).font = { bold: true };
    applyBorderToCell(sheet.getCell(`P${subtotalRow}`), thinBorder);
  }

  // Q: SUM formula
  sheet.getCell(`Q${subtotalRow}`).value = { formula: `SUM(Q${startRow}:Q${lastDataRow})` };
  sheet.getCell(`Q${subtotalRow}`).font = { bold: true };
  applyBorderToCell(sheet.getCell(`Q${subtotalRow}`), thinBorder);

  // R: SUM formula
  sheet.getCell(`R${subtotalRow}`).value = { formula: `SUM(R${startRow}:R${lastDataRow})` };
  sheet.getCell(`R${subtotalRow}`).font = { bold: true };
  applyBorderToCell(sheet.getCell(`R${subtotalRow}`), thinBorder);

  // S: SUM formula
  sheet.getCell(`S${subtotalRow}`).value = { formula: `SUM(S${startRow}:S${lastDataRow})` };
  sheet.getCell(`S${subtotalRow}`).font = { bold: true };
  applyBorderToCell(sheet.getCell(`S${subtotalRow}`), thinBorder);

  // T: SUM formula
  sheet.getCell(`T${subtotalRow}`).value = { formula: `SUM(T${startRow}:T${lastDataRow})` };
  sheet.getCell(`T${subtotalRow}`).font = { bold: true };
  applyBorderToCell(sheet.getCell(`T${subtotalRow}`), thinBorder);

  // U: SUM formula
  sheet.getCell(`U${subtotalRow}`).value = { formula: `SUM(U${startRow}:U${lastDataRow})` };
  sheet.getCell(`U${subtotalRow}`).font = { bold: true };
  applyBorderToCell(sheet.getCell(`U${subtotalRow}`), thinBorder);

  // V: SUM formula
  sheet.getCell(`V${subtotalRow}`).value = { formula: `SUM(V${startRow}:V${lastDataRow})` };
  sheet.getCell(`V${subtotalRow}`).font = { bold: true };
  applyBorderToCell(sheet.getCell(`V${subtotalRow}`), thinBorder);

  // ============ Set Column Widths ============
  sheet.columns = [
    { width: 17.375 },  // A
    { width: 6.375 },    // B
    { width: 32.75 },    // C
    { width: 14.625 },   // D
    { width: 9.375 },    // E
    { width: 13 },       // F
    { width: 13 },       // G
    { width: 13 },       // H
    { width: 10.125 },   // I
    { width: 9.375 },    // J
    { width: 13 },       // K
    { width: 13 },       // L
    { width: 13 },       // M
    { width: 10.375 },   // N
    { width: 9 },        // O
    { width: 9.375 },    // P
    { width: 13 },       // Q
    { width: 13 },       // R
    { width: 9.625 },    // S
    { width: 9.75 },     // T
    { width: 9.375 },    // U
    { width: 14.625 },   // V
  ];
}

function applyBorderToCell(cell, border) {
  cell.border = border;
}

function formatThaiDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  // Format as Thai date: DD/MM/YYYY (Buddhist calendar)
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear() + 543;
  return `${day}/${month}/${year}`;
}
