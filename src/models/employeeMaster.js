// Employee Master Model
// Stores employee profiles with bank info for reuse

import { EmployeeGroupType } from './payroll.js';
import { createBankInfo } from './payroll.js';

const MASTER_KEY = 'payroll_employee_master';

/**
 * Get all employees from master
 */
export function getEmployeeMaster() {
  try {
    const saved = localStorage.getItem(MASTER_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('[EmployeeMaster] Failed to load:', e);
  }
  return [];
}

/**
 * Save employee master
 */
export function saveEmployeeMaster(employees) {
  try {
    localStorage.setItem(MASTER_KEY, JSON.stringify(employees));
  } catch (e) {
    console.error('[EmployeeMaster] Failed to save:', e);
  }
}

/**
 * Add employee to master
 */
export function addToEmployeeMaster(employee) {
  const master = getEmployeeMaster();
  // Handle both flat CSV data and nested data
  const bankInfo = employee.bankInfo || {};
  const newEmp = {
    id: `emp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    employeeId: employee.employeeId || '',
    fullName: employee.fullName || '',
    bankInfo: {
      bankCode: bankInfo.bankCode || employee.bankCode || '',
      bankAccountNumber: bankInfo.bankAccountNumber || employee.bankAccountNumber || '',
      bankAccountName: bankInfo.bankAccountName || employee.bankAccountName || employee.fullName || '',
    },
    groupType: employee.groupType || EmployeeGroupType.SOCIAL_SECURITY,
    active: true,
  };
  master.push(newEmp);
  saveEmployeeMaster(master);
  return newEmp;
}

/**
 * Update employee in master
 */
export function updateEmployeeInMaster(id, updates) {
  const master = getEmployeeMaster();
  const index = master.findIndex(e => e.id === id);
  if (index !== -1) {
    master[index] = { ...master[index], ...updates };
    saveEmployeeMaster(master);
    return master[index];
  }
  return null;
}

/**
 * Remove employee from master
 */
export function removeFromEmployeeMaster(id) {
  const master = getEmployeeMaster();
  const filtered = master.filter(e => e.id !== id);
  saveEmployeeMaster(filtered);
}

/**
 * Find employee in master by employeeId
 */
export function findInMaster(employeeId) {
  const master = getEmployeeMaster();
  return master.find(e => e.employeeId === employeeId);
}

/**
 * Create employee row from master employee
 */
export function createFromMaster(masterEmployee) {
  return {
    id: `payroll_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    employeeId: masterEmployee.employeeId,
    groupType: masterEmployee.groupType,
    sequence: 0,
    fullName: masterEmployee.fullName,
    remark: '',
    activeForExport: true,
    earnings: {
      salaryBase: 0,
      otBase: 0,
      positionAllowance: 0,
      languageAllowance: 0,
      mealAllowance: 0,
      transportAllowance: 0,
      service: 0,
      incentive: 0,
      diligenceBonus: 0,
      ot: 0,
    },
    deductions: {
      socialSecurity: 0,
      studentLoan: 0,
      personalIncomeTax: 0,
      loanDeduction: 0,
      noWorkNoPay: 0,
      withholdingTax: 0,
      otherDeduction: 0,
    },
    bankInfo: {
      bankCode: masterEmployee.bankInfo?.bankCode || '',
      bankAccountNumber: masterEmployee.bankInfo?.bankAccountNumber || '',
      bankAccountName: masterEmployee.fullName || '',
      effectivePaymentDate: '',
    },
  };
}
