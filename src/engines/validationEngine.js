// Validation Engine
// Validates payroll data before export

import { EmployeeGroupType } from '../models/payroll.js';

/**
 * Validation result object
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether validation passed
 * @property {Array} errors - List of error messages
 * @property {Array} warnings - List of warning messages
 */

/**
 * Validates entire payroll document
 * @param {Object} doc - PayrollDocument
 * @param {string[]} exportTargets - Which exports to validate ['accounting', 'kbank']
 * @returns {Object} Validation results by target
 */
export function validatePayrollDocument(doc, exportTargets = ['accounting', 'kbank']) {
  const results = {};

  if (exportTargets.includes('accounting')) {
    results.accounting = validateForAccounting(doc);
  }

  if (exportTargets.includes('kbank')) {
    results.kbank = validateForKBank(doc);
  }

  const allValid = Object.values(results).every(r => r.valid);

  return { valid: allValid, results };
}

/**
 * Validates for accounting export
 * @param {Object} doc - PayrollDocument
 * @returns {ValidationResult}
 */
export function validateForAccounting(doc) {
  const errors = [];
  const warnings = [];

  if (!doc.companyName?.trim()) {
    errors.push('Company name is required');
  }

  if (!doc.payrollDate) {
    errors.push('Payroll date is required');
  }

  const employees = doc.employees || [];
  
  if (employees.length === 0) {
    errors.push('No employees in payroll');
  }

  employees.forEach((emp, index) => {
    const rowNum = index + 1;
    
    if (!emp.fullName?.trim()) {
      errors.push(`Row ${rowNum}: Employee name is required`);
    }

    if (!emp.employeeId?.trim()) {
      errors.push(`Row ${rowNum}: Employee ID is required`);
    }

    if (emp.earnings?.salaryBase <= 0) {
      errors.push(`Row ${rowNum}: Base salary must be greater than 0`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates for KBank export
 * KBank uses document-level branch code and payment date
 * Employee-level needs only: bankAccountNumber
 * @param {Object} doc - PayrollDocument
 * @returns {ValidationResult}
 */
export function validateForKBank(doc) {
  const errors = [];
  const warnings = [];

  if (!doc.payrollDate) {
    errors.push('Payroll date is required');
  }

  if (!doc.kbankBranchCode?.trim()) {
    errors.push('KBank Branch Code is required (in Document Setup)');
  }

  if (!doc.kbankPaymentDate) {
    errors.push('KBank Payment Date is required (in Document Setup)');
  }

  const employees = (doc.employees || []).filter(e => e.activeForExport);
  
  if (employees.length === 0) {
    errors.push('No active employees for export');
  }

  employees.forEach((emp, index) => {
    const rowNum = index + 1;

    // Bank account number is still per-employee
    if (!emp.bankInfo?.bankAccountNumber?.trim()) {
      errors.push(`Row ${rowNum}: Bank account number is required`);
    }

    // Account name comes from employee Name, so it's always filled
    // But check if netPay is valid
    const totals = emp.calculated || {};
    if (totals.netPay <= 0) {
      errors.push(`Row ${rowNum}: Net pay must be greater than 0 for bank transfer`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Quick validation status for UI display
 * @param {Object} doc - PayrollDocument
 * @returns {Object} Status by export type
 */
export function getValidationStatus(doc) {
  const results = validatePayrollDocument(doc);
  
  return {
    accounting: results.results.accounting?.valid ?? false,
    kbank: results.results.kbank?.valid ?? false,
    all: results.valid,
  };
}
