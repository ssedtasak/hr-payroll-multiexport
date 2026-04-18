// Calculation Engine
// Handles all payroll calculations deterministically

import { calculateEmployeeTotals, EmployeeGroupType } from '../models/payroll.js';

/**
 * Calculates totals for all employees in a payroll document
 * @param {Object} doc - PayrollDocument
 * @returns {Object} Summary totals
 */
export function calculatePayrollSummary(doc) {
  const employees = doc.employees || [];
  
  let totalNetPay = 0;
  let totalGrossIncome = 0;
  let totalDeductions = 0;
  let transactionCount = 0;

  const byGroup = {
    [EmployeeGroupType.SOCIAL_SECURITY]: {
      netPay: 0,
      grossIncome: 0,
      deductions: 0,
      count: 0,
    },
    [EmployeeGroupType.WITHHOLDING_TAX]: {
      netPay: 0,
      grossIncome: 0,
      deductions: 0,
      count: 0,
    },
  };

  for (const emp of employees) {
    if (!emp.activeForExport) continue;
    
    const totals = calculateEmployeeTotals(emp);
    
    totalNetPay += totals.netPay;
    totalGrossIncome += totals.grossIncome;
    totalDeductions += totals.totalDeduction;
    transactionCount++;

    if (byGroup[emp.groupType]) {
      byGroup[emp.groupType].netPay += totals.netPay;
      byGroup[emp.groupType].grossIncome += totals.grossIncome;
      byGroup[emp.groupType].deductions += totals.totalDeduction;
      byGroup[emp.groupType].count++;
    }
  }

  return {
    totalNetPay,
    totalGrossIncome,
    totalDeductions,
    transactionCount,
    byGroup,
  };
}

/**
 * Gets all calculated totals for employees (for preview/export)
 * @param {Object} doc - PayrollDocument
 * @returns {Array} Array of employee data with calculated totals
 */
export function getEmployeeCalculations(doc) {
  return doc.employees.map(emp => ({
    ...emp,
    calculated: calculateEmployeeTotals(emp),
  }));
}
