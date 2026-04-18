// Canonical Payroll Data Model
// Single source of truth for payroll data

/**
 * Employee group types
 * @enum {string}
 */
export const EmployeeGroupType = {
  SOCIAL_SECURITY: 'social_security',     // พนักงานประกันสังคม
  WITHHOLDING_TAX: 'withholding_tax',      // พนักงานหัก ณ ที่จ่าย
};

/**
 * Creates a new PayrollDocument
 * @param {Object} params
 * @returns {Object} PayrollDocument
 */
export function createPayrollDocument({
  companyName = '',
  branchName = '',
  payrollDate = new Date().toISOString().split('T')[0],
  serviceDate = '',
  sheetName = '',
  exportTargets = ['accounting', 'kbank'],
  // KBank specific fields - document level
  kbankBranchCode = '004',
  kbankPaymentDate = new Date().toISOString().split('T')[0],
} = {}) {
  return {
    id: generateId(),
    companyName,
    branchName,
    payrollDate,
    serviceDate,
    sheetName: sheetName || branchName,
    exportTargets,
    // KBank document-level settings
    kbankBranchCode,
    kbankPaymentDate,
    employees: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Creates a new EmployeeRow
 * @param {Object} params
 * @returns {Object} EmployeeRow
 */
export function createEmployeeRow({
  employeeId = '',
  groupType = EmployeeGroupType.SOCIAL_SECURITY,
  sequence = 1,
  fullName = '',
  remark = '',
  activeForExport = true,
  earnings = createEarnings(),
  deductions = createDeductions(),
  bankInfo = createBankInfo(),
} = {}) {
  return {
    id: generateId(),
    employeeId,
    groupType,
    sequence,
    fullName,
    remark,
    activeForExport,
    earnings,
    deductions,
    bankInfo,
  };
}

/**
 * Creates earnings object
 * @returns {Object} Earnings
 */
export function createEarnings({
  salaryBase = 0,
  otBase = 0,
  positionAllowance = 0,
  languageAllowance = 0,
  mealAllowance = 0,
  transportAllowance = 0,
  service = 0,
  incentive = 0,
  diligenceBonus = 0,
  ot = 0,
} = {}) {
  return {
    salaryBase,
    otBase,
    positionAllowance,
    languageAllowance,
    mealAllowance,
    transportAllowance,
    service,
    incentive,
    diligenceBonus,
    ot,
  };
}

/**
 * Creates deductions object
 * @returns {Object} Deductions
 */
export function createDeductions({
  socialSecurity = 0,
  studentLoan = 0,
  personalIncomeTax = 0,
  loanDeduction = 0,
  noWorkNoPay = 0,
  withholdingTax = 0,
  otherDeduction = 0,
} = {}) {
  return {
    socialSecurity,
    studentLoan,
    personalIncomeTax,
    loanDeduction,
    noWorkNoPay,
    withholdingTax,
    otherDeduction,
  };
}

/**
 * Creates bank info object
 * @returns {Object} BankInfo
 */
export function createBankInfo({
  bankCode = '',
  bankAccountNumber = '',
  bankAccountName = '',
  effectivePaymentDate = '',
} = {}) {
  return {
    bankCode,
    bankAccountNumber,
    bankAccountName,
    effectivePaymentDate,
  };
}

/**
 * Calculates totals for an employee row
 * @param {Object} employee - EmployeeRow with earnings and deductions
 * @returns {Object} CalculatedTotals
 */
export function calculateEmployeeTotals(employee) {
  const { earnings, deductions, groupType } = employee;

  const grossSalary = earnings.salaryBase;
  
  const extraIncomeTotal = 
    earnings.otBase +
    earnings.positionAllowance +
    earnings.languageAllowance +
    earnings.mealAllowance +
    earnings.transportAllowance +
    earnings.service +
    earnings.incentive +
    earnings.diligenceBonus +
    earnings.ot;

  const grossIncome = grossSalary + extraIncomeTotal;

  let totalDeduction;
  if (groupType === EmployeeGroupType.SOCIAL_SECURITY) {
    totalDeduction = 
      deductions.socialSecurity +
      deductions.studentLoan +
      deductions.loanDeduction +
      deductions.noWorkNoPay +
      deductions.otherDeduction;
  } else {
    totalDeduction = 
      deductions.withholdingTax +
      deductions.personalIncomeTax +
      deductions.loanDeduction +
      deductions.noWorkNoPay +
      deductions.otherDeduction;
  }

  const netPay = grossIncome - totalDeduction;

  return {
    grossSalary,
    extraIncomeTotal,
    grossIncome,
    totalDeduction,
    netPay,
  };
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}
