// Main App - HR Payroll Multi-Export
import {
  createPayrollDocument,
  createEmployeeRow,
  EmployeeGroupType,
  calculateEmployeeTotals,
} from './models/payroll.js';
import { calculatePayrollSummary } from './engines/calculationEngine.js';
import { getValidationStatus } from './engines/validationEngine.js';
import { exportPayroll, exportAll, downloadBlob } from './templates/exporter.js';
import {
  getEmployeeMaster,
  addToEmployeeMaster,
  removeFromEmployeeMaster,
  createFromMaster,
} from './models/employeeMaster.js';
import { parseEmployeeCSV, generateCSVTemplate } from './utils/csvParser.js';
import { generateEmployeeTemplate, parseEmployeeTemplate, downloadBlob } from './templates/exporter.js';

// localStorage key
const STORAGE_KEY = 'payroll_current_draft';

// Application State
let state = {
  document: createPayrollDocument(),
  employees: [],
};

// Load from localStorage on init
function loadFromLocalStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      if (data.document && data.employees) {
        state.document = data.document;
        state.employees = data.employees;
        console.log('[AutoSave] Loaded from localStorage');
      }
    }
  } catch (e) {
    console.error('[AutoSave] Failed to load:', e);
  }
}

// Save to localStorage
function saveToLocalStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      document: state.document,
      employees: state.employees
    }));
  } catch (e) {
    console.error('[AutoSave] Failed to save:', e);
  }
}

// Clear localStorage and reset
function clearLocalStorage() {
  if (confirm('Clear all saved data? This cannot be undone.')) {
    localStorage.removeItem(STORAGE_KEY);
    state.document = createPayrollDocument();
    state.employees = [];
    render();
    console.log('[AutoSave] Cleared');
  }
}

// Render function - updates the DOM
function render() {
  const app = document.getElementById('app');
  if (!app) return;
  app.innerHTML = renderAppHTML();
  attachEventHandlers();
}

// State management
function updateState(updates) {
  state = { ...state, ...updates };
  saveToLocalStorage();
  render();
}

function updateDocument(updates) {
  state.document = { ...state.document, ...updates, updatedAt: new Date().toISOString() };
  saveToLocalStorage();
  render();
}

function updateEmployees(newEmployees) {
  state.employees = newEmployees;
  state.document = { ...state.document, employees: newEmployees, updatedAt: new Date().toISOString() };
  saveToLocalStorage();
  render();
}

function addEmployee(groupType) {
  const newEmp = createEmployeeRow({
    sequence: state.employees.filter(e => e.groupType === groupType).length + 1,
    groupType,
  });
  updateEmployees([...state.employees, newEmp]);
}

function removeEmployee(id) {
  updateEmployees(state.employees.filter(emp => emp.id !== id));
}

function modifyEmployee(id, field, subfield, value) {
  updateEmployees(state.employees.map(emp => {
    if (emp.id !== id) return emp;
    
    // When fullName changes, auto-fill bankAccountName
    if (field === 'fullName' && !subfield) {
      return { 
        ...emp, 
        fullName: value,
        bankInfo: { ...emp.bankInfo, bankAccountName: value }
      };
    }
    
    // Bank info fields should keep string values
    if (field === 'bankInfo') {
      return { ...emp, [field]: { ...emp[field], [subfield]: value } };
    }
    if (subfield) {
      return { ...emp, [field]: { ...emp[field], [subfield]: parseFloat(value) || 0 } };
    }
    return { ...emp, [field]: value };
  }));
}

function formatCurrency(num) {
  if (num === undefined || num === null || isNaN(num)) return '0.00';
  return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Event handlers
function attachEventHandlers() {
  // Document fields - use blur to avoid re-render on every keystroke
  document.querySelectorAll('[data-doc-field]').forEach(el => {
    el.addEventListener('blur', (e) => {
      updateDocument({ [el.dataset.docField]: e.target.value });
    });
  });

  // Add employee buttons
  document.querySelectorAll('[data-add-employee]').forEach(el => {
    el.addEventListener('click', () => {
      addEmployee(el.dataset.addEmployee);
    });
  });

  // Delete employee buttons
  document.querySelectorAll('[data-delete-employee]').forEach(el => {
    el.addEventListener('click', () => {
      removeEmployee(el.dataset.deleteEmployee);
    });
  });

  // Employee field inputs - use blur to avoid re-render on every keystroke
  document.querySelectorAll('[data-emp-field]').forEach(el => {
    el.addEventListener('blur', (e) => {
      const { empId, empField: field, subfield } = el.dataset;
      modifyEmployee(empId, field, subfield, e.target.value);
    });
  });

  // Export buttons
  const exportAccountingBtn = document.getElementById('export-accounting');
  if (exportAccountingBtn) {
    exportAccountingBtn.addEventListener('click', () => handleExport('accounting'));
  }

  const exportKbankSSBtn = document.getElementById('export-kbank-ss');
  if (exportKbankSSBtn) {
    exportKbankSSBtn.addEventListener('click', () => handleExport('kbank-ss'));
  }

  const exportKbankWTBtn = document.getElementById('export-kbank-wt');
  if (exportKbankWTBtn) {
    exportKbankWTBtn.addEventListener('click', () => handleExport('kbank-wt'));
  }

  // Save/Load draft
  const saveDraftBtn = document.getElementById('save-draft');
  if (saveDraftBtn) {
    saveDraftBtn.addEventListener('click', saveDraft);
  }

  const loadDraftBtn = document.getElementById('load-draft');
  if (loadDraftBtn) {
    loadDraftBtn.addEventListener('click', loadDraft);
  }

  // Attach Employee Master handlers
  attachMasterHandlers();
}

async function handleExport(format) {
  try {
    const { blob, filename } = await exportPayroll(state.document, format);
    downloadBlob(blob, filename);
  } catch (err) {
    alert('Export failed: ' + err.message);
  }
}

async function handleExportAll() {
  try {
    const results = await exportAll(state.document);
    for (const { blob, filename } of results) {
      downloadBlob(blob, filename);
    }
  } catch (err) {
    alert('Export failed: ' + err.message);
  }
}

function saveDraft() {
  const data = JSON.stringify(state.document, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `payroll_draft_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function loadDraft() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const text = await file.text();
      const data = JSON.parse(text);
      state.document = data;
      state.employees = data.employees || [];
      render();
    }
  };
  input.click();
}

// Render HTML
function renderAppHTML() {
  const { document: doc, employees } = state;
  const summary = calculatePayrollSummary(doc);
  const validation = getValidationStatus(doc);

  return `
    <div class="app">
      <header class="header">
        <h1>HR Payroll Multi-Export</h1>
        <div class="header-actions">
          <button id="save-draft" class="btn btn-secondary">Save Draft</button>
          <button id="load-draft" class="btn btn-secondary">Load Draft</button>
          <button id="clear-data" class="btn btn-danger" onclick="clearLocalStorage()">Clear Data</button>
        </div>
      </header>

      <main class="main-content">
        <!-- Document Setup -->
        <section class="section document-setup">
          <h2>Document Setup</h2>
          <div class="form-grid">
            <div class="form-group">
              <label>Company Name</label>
              <input type="text" data-doc-field="companyName" value="${escapeHtml(doc.companyName)}" />
            </div>
            <div class="form-group">
              <label>Branch Name</label>
              <input type="text" data-doc-field="branchName" value="${escapeHtml(doc.branchName)}" />
            </div>
            <div class="form-group">
              <label>Payroll Date</label>
              <input type="date" data-doc-field="payrollDate" value="${doc.payrollDate}" />
            </div>
            <div class="form-group">
              <label>Service Date</label>
              <input type="date" data-doc-field="serviceDate" value="${doc.serviceDate}" />
            </div>
          </div>

          <!-- KBank Settings -->
          <h3 style="margin-top: 1rem; font-size: 0.9rem; color: var(--gray-600);">KBank Export Settings</h3>
          <div class="form-grid">
            <div class="form-group">
              <label>KBank Branch Code</label>
              <input type="text" data-doc-field="kbankBranchCode" value="${escapeHtml(doc.kbankBranchCode || '004')}" placeholder="e.g. 004" />
            </div>
            <div class="form-group">
              <label>KBank Payment Date</label>
              <input type="date" data-doc-field="kbankPaymentDate" value="${doc.kbankPaymentDate || doc.payrollDate}" />
            </div>
          </div>
        </section>

        <!-- Employee Master Section -->
        <section class="section employee-master-section">
          <div class="section-header">
            <h2>พนักงานมาสเตอร์ (Employee Master)</h2>
            <div class="master-actions">
              <button id="download-excel-template" class="btn btn-secondary btn-small" style="background: #16a34a; color: white;">Download Excel Template</button>
              <button id="upload-excel-btn" class="btn btn-secondary btn-small" style="background: #16a34a; color: white;">Upload Excel</button>
              <button id="download-csv-template" class="btn btn-secondary btn-small">Download CSV Template</button>
              <button id="upload-csv-btn" class="btn btn-secondary btn-small">Upload CSV</button>
              <button id="clear-master-btn" class="btn btn-secondary btn-small" style="background: rgba(255,255,255,0.2); color: white;">Clear Master</button>
              <input type="file" id="csv-upload-input" accept=".csv" style="display: none;" />
              <input type="file" id="excel-upload-input" accept=".xlsx" style="display: none;" />
            </div>
          </div>
          <div id="master-employee-list" class="master-list">
            ${renderMasterEmployeeList()}
          </div>
        </section>

        <!-- Summary Panel -->
        <section class="section summary-panel">
          <h2>Summary</h2>
          <div class="summary-grid">
            <div class="summary-item">
              <span class="summary-label">Total Net Pay</span>
              <span class="summary-value">${formatCurrency(summary.totalNetPay)}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Transaction Count</span>
              <span class="summary-value">${summary.transactionCount}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">SS Employees</span>
              <span class="summary-value">${summary.byGroup[EmployeeGroupType.SOCIAL_SECURITY]?.count || 0}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">WT Employees</span>
              <span class="summary-value">${summary.byGroup[EmployeeGroupType.WITHHOLDING_TAX]?.count || 0}</span>
            </div>
          </div>
          <div class="validation-status">
            <span class="status-badge ${validation.accounting ? 'valid' : 'invalid'}">
              Accounting: ${validation.accounting ? 'Ready' : 'Not Ready'}
            </span>
            <span class="status-badge ${validation.kbank ? 'valid' : 'invalid'}">
              KBank: ${validation.kbank ? 'Ready' : 'Not Ready'}
            </span>
          </div>
        </section>

        <!-- Employee Sections -->
        ${renderEmployeeSection('Social Security', EmployeeGroupType.SOCIAL_SECURITY)}
        ${renderEmployeeSection('Withholding Tax', EmployeeGroupType.WITHHOLDING_TAX)}

        <!-- Export Section -->
        <section class="section export-section">
          <h2>Export</h2>
          <div class="export-actions">
            <button id="export-accounting" class="btn btn-primary" ${!validation.accounting ? 'disabled' : ''}>
              Export Accounting
            </button>
          </div>
          <h3 style="margin-top: 1rem; font-size: 0.9rem; color: var(--gray-600);">KBank Export (Separate Files)</h3>
          <div class="export-actions">
            <button id="export-kbank-ss" class="btn btn-secondary" ${summary.byGroup[EmployeeGroupType.SOCIAL_SECURITY]?.count ? '' : 'disabled'}>
              Export KBank SS (${summary.byGroup[EmployeeGroupType.SOCIAL_SECURITY]?.count || 0} ราย)
            </button>
            <button id="export-kbank-wt" class="btn btn-secondary" ${summary.byGroup[EmployeeGroupType.WITHHOLDING_TAX]?.count ? '' : 'disabled'}>
              Export KBank WT (${summary.byGroup[EmployeeGroupType.WITHHOLDING_TAX]?.count || 0} ราย)
            </button>
          </div>
        </section>
      </main>
    </div>

    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      
      :root {
        --primary: #2563eb;
        --primary-dark: #1d4ed8;
        --accent: #7c3aed;
        --success: #16a34a;
        --danger: #dc2626;
        --warning: #f59e0b;
        --gray-50: #f9fafb;
        --gray-100: #f3f4f6;
        --gray-200: #e5e7eb;
        --gray-300: #d1d5db;
        --gray-600: #4b5563;
        --gray-800: #1f2937;
        --gray-900: #111827;
      }

      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: var(--gray-50);
        color: var(--gray-800);
        line-height: 1.5;
      }

      .app { max-width: 1400px; margin: 0 auto; padding: 1rem; }

      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 1.5rem;
        background: white;
        border-radius: 8px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        margin-bottom: 1rem;
      }

      .header h1 { font-size: 1.5rem; color: var(--gray-900); }
      .header-actions { display: flex; gap: 0.5rem; }

      .main-content { display: flex; flex-direction: column; gap: 1rem; }

      .section {
        background: white;
        border-radius: 8px;
        padding: 1.5rem;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      }

      .section h2 {
        font-size: 1.125rem;
        margin-bottom: 1rem;
        padding-bottom: 0.5rem;
        border-bottom: 2px solid var(--gray-200);
      }

      .form-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
      }

      .form-group { display: flex; flex-direction: column; gap: 0.25rem; }
      .form-group label { font-size: 0.875rem; color: var(--gray-600); }
      .form-group input {
        padding: 0.5rem;
        border: 1px solid var(--gray-300);
        border-radius: 4px;
        font-size: 0.875rem;
      }
      .form-group input:focus {
        outline: none;
        border-color: var(--primary);
        box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
      }

      .summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 1rem;
        margin-bottom: 1rem;
      }

      .summary-item {
        background: var(--gray-50);
        padding: 0.75rem;
        border-radius: 4px;
        text-align: center;
      }

      .summary-label { display: block; font-size: 0.75rem; color: var(--gray-600); }
      .summary-value { display: block; font-size: 1.25rem; font-weight: 600; }

      .validation-status { display: flex; gap: 0.5rem; }
      .status-badge {
        padding: 0.25rem 0.75rem;
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 500;
      }
      .status-badge.valid { background: #dcfce7; color: var(--success); }
      .status-badge.invalid { background: #fee2e2; color: var(--danger); }

      .employee-section { margin-top: 1rem; }
      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.75rem;
      }
      .section-header h3 { font-size: 1rem; color: var(--gray-700); }

      .employee-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.8125rem;
        overflow-x: auto;
        display: block;
        min-width: 1000px;
      }

      .employee-table th {
        background: var(--gray-100);
        padding: 0.5rem;
        text-align: left;
        font-weight: 500;
        white-space: nowrap;
        border: 1px solid var(--gray-200);
        min-width: 80px;
      }

      .employee-table th:nth-child(1) { min-width: 40px; }  /* ลำดับ */
      .employee-table th:nth-child(2) { min-width: 70px; }  /* รหัส */
      .employee-table th:nth-child(3) { min-width: 150px; } /* ชื่อ - นามสกุล */
      .employee-table th:nth-child(4) { min-width: 120px; } /* เลขบัญชี */
      .employee-table th:nth-child(5) { min-width: 90px; } /* เงินเดือน */
      .employee-table th:nth-child(6) { min-width: 60px; } /* OT */
      .employee-table th:nth-child(7) { min-width: 80px; } /* ค่าตำแหน่ง */
      .employee-table th:nth-child(8) { min-width: 70px; } /* ค่าอาหาร */
      .employee-table th:nth-child(9) { min-width: 80px; } /* ค่าเดินทาง */
      .employee-table th:nth-child(10) { min-width: 70px; } /* Service */
      .employee-table th:nth-child(11) { min-width: 70px; } /* Incentive */
      .employee-table th:nth-child(12) { min-width: 70px; } /* SS/WT */
      .employee-table th:nth-child(13) { min-width: 80px; } /* หักกู้ยืม */
      .employee-table th:nth-child(14) { min-width: 60px; } /* NWNP */
      .employee-table th:nth-child(15) { min-width: 100px; } /* รวมสุทธิ */

      .employee-table td {
        padding: 0.25rem 0.5rem;
        border: 1px solid var(--gray-200);
        vertical-align: middle;
      }

      .employee-table input {
        width: 100%;
        min-width: 60px;
        padding: 0.4rem;
        border: 1px solid transparent;
        background: transparent;
        font-size: 0.875rem;
      }
      .employee-table input:focus {
        border-color: var(--primary);
        background: white;
      }
      .employee-table input[type="number"] { text-align: right; }

      .employee-table .net-pay {
        font-weight: 600;
        background: var(--gray-50);
        text-align: right;
        padding: 0.25rem;
      }

      .btn {
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 4px;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s;
      }
      .btn:disabled { opacity: 0.5; cursor: not-allowed; }
      .btn-primary { background: var(--primary); color: white; }
      .btn-primary:hover:not(:disabled) { background: var(--primary-dark); }
      .btn-secondary { background: var(--gray-200); color: var(--gray-700); }
      .btn-secondary:hover { background: var(--gray-300); }
      .btn-accent { background: var(--accent); color: white; }
      .btn-accent:hover:not(:disabled) { background: #6d28d9; }
      .btn-danger { background: var(--danger); color: white; }
      .btn-danger:hover { background: #b91c1c; }
      .btn-small { padding: 0.25rem 0.5rem; font-size: 0.75rem; }

      .export-actions { display: flex; gap: 0.75rem; flex-wrap: wrap; }

      /* Employee Master Section */
      .employee-master-section {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }
      .employee-master-section h2 { color: white; border-bottom-color: rgba(255,255,255,0.3); }
      .master-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
      .master-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        max-height: 300px;
        overflow-y: auto;
      }
      .master-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: rgba(255,255,255,0.1);
        padding: 0.5rem 0.75rem;
        border-radius: 4px;
      }
      .master-item-info { flex: 1; }
      .master-item-name { font-weight: 500; }
      .master-item-bank { font-size: 0.75rem; opacity: 0.8; }
      .master-item-badge {
        font-size: 0.65rem;
        padding: 0.1rem 0.4rem;
        border-radius: 3px;
        margin-left: 0.5rem;
      }
      .master-item-badge.ss { background: #10b981; }
      .master-item-badge.wt { background: #f59e0b; }
      .master-item-actions { display: flex; gap: 0.25rem; }
      .master-item-btn {
        padding: 0.25rem 0.5rem;
        font-size: 0.7rem;
        border: none;
        border-radius: 3px;
        cursor: pointer;
      }
      .master-add-btn { background: #10b981; color: white; }
      .master-add-btn:hover { background: #059669; }
      .master-delete-btn { background: rgba(255,255,255,0.2); color: white; }
      .master-delete-btn:hover { background: rgba(255,255,255,0.3); }
      .master-empty { text-align: center; padding: 1rem; opacity: 0.8; }
    </style>
  `;
}

function renderEmployeeSection(title, groupType) {
  const { employees, document: doc } = state;
  const groupEmployees = employees.filter(e => e.groupType === groupType);

  return `
    <section class="section employee-section">
      <div class="section-header">
        <h3>${title}</h3>
        <button data-add-employee="${groupType}" class="btn btn-secondary btn-small">
          + Add Employee
        </button>
      </div>

      ${groupEmployees.length === 0 ? '<p style="color: var(--gray-500); padding: 1rem;">No employees added yet.</p>' : `
        <table class="employee-table">
          <thead>
            <tr>
              <th>ลำดับ</th>
              <th>รหัส</th>
              <th>ชื่อ - นามสกุล</th>
              <th>เลขบัญชี</th>
              <th>เงินเดือน</th>
              <th>OT</th>
              <th>ค่าตำแหน่ง</th>
              <th>ค่าอาหาร</th>
              <th>ค่าเดินทาง</th>
              <th>Service</th>
              <th>Incentive</th>
              <th>SS/WT</th>
              <th>หักกู้ยืม</th>
              <th>NWNP</th>
              <th>รวมสุทธิ</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${groupEmployees.map((emp, idx) => {
              const totals = calculateEmployeeTotals(emp);
              const deductionField = groupType === EmployeeGroupType.SOCIAL_SECURITY ? 'socialSecurity' : 'withholdingTax';
              return `
                <tr>
                  <td>${idx + 1}</td>
                  <td>
                    <input type="text" data-emp-field="employeeId" data-emp-id="${emp.id}" value="${escapeHtml(emp.employeeId)}" />
                  </td>
                  <td>
                    <input type="text" data-emp-field="fullName" data-emp-id="${emp.id}" value="${escapeHtml(emp.fullName)}" />
                  </td>
                  <td>
                    <input type="text" data-emp-field="bankInfo" data-emp-id="${emp.id}" data-subfield="bankAccountNumber" value="${escapeHtml(emp.bankInfo.bankAccountNumber)}" placeholder="เลขบัญชี" />
                  </td>
                  <td>
                    <input type="number" data-emp-field="earnings" data-emp-id="${emp.id}" data-subfield="salaryBase" value="${emp.earnings.salaryBase}" />
                  </td>
                  <td>
                    <input type="number" data-emp-field="earnings" data-emp-id="${emp.id}" data-subfield="otBase" value="${emp.earnings.otBase}" />
                  </td>
                  <td>
                    <input type="number" data-emp-field="earnings" data-emp-id="${emp.id}" data-subfield="positionAllowance" value="${emp.earnings.positionAllowance}" />
                  </td>
                  <td>
                    <input type="number" data-emp-field="earnings" data-emp-id="${emp.id}" data-subfield="mealAllowance" value="${emp.earnings.mealAllowance}" />
                  </td>
                  <td>
                    <input type="number" data-emp-field="earnings" data-emp-id="${emp.id}" data-subfield="transportAllowance" value="${emp.earnings.transportAllowance}" />
                  </td>
                  <td>
                    <input type="number" data-emp-field="earnings" data-emp-id="${emp.id}" data-subfield="service" value="${emp.earnings.service}" />
                  </td>
                  <td>
                    <input type="number" data-emp-field="earnings" data-emp-id="${emp.id}" data-subfield="incentive" value="${emp.earnings.incentive}" />
                  </td>
                  <td>
                    <input type="number" data-emp-field="deductions" data-emp-id="${emp.id}" data-subfield="${deductionField}" value="${emp.deductions[deductionField]}" />
                  </td>
                  <td>
                    <input type="number" data-emp-field="deductions" data-emp-id="${emp.id}" data-subfield="loanDeduction" value="${emp.deductions.loanDeduction}" />
                  </td>
                  <td>
                    <input type="number" data-emp-field="deductions" data-emp-id="${emp.id}" data-subfield="noWorkNoPay" value="${emp.deductions.noWorkNoPay}" />
                  </td>
                  <td class="net-pay">${formatCurrency(totals.netPay)}</td>
                  <td>
                    <button data-delete-employee="${emp.id}" class="btn btn-danger">X</button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `}
    </section>
  `;
}

// Render Employee Master List
function renderMasterEmployeeList() {
  const master = getEmployeeMaster();
  
  if (master.length === 0) {
    return '<p class="master-empty">ยังไม่มีพนักงานในมาสเตอร์ ดาวน์โหลด CSV Template เพื่อนำเข้าหลายคน หรือเพิ่มทีละคน</p>';
  }

  return master.map(emp => `
    <div class="master-item" data-master-id="${emp.id}">
      <div class="master-item-info">
        <span class="master-item-name">${escapeHtml(emp.fullName)}</span>
        <span class="master-item-badge ${emp.groupType === 'social_security' ? 'ss' : 'wt'}">
          ${emp.groupType === 'social_security' ? 'SS' : 'WT'}
        </span>
        <span class="master-item-bank"> | ${escapeHtml(emp.bankInfo?.bankAccountNumber || '-')} | ${escapeHtml(emp.bankInfo?.bankCode || '-')}</span>
      </div>
      <div class="master-item-actions">
        <button class="master-item-btn master-add-btn" data-add-from-master="${emp.id}">+ เพิ่ม</button>
        <button class="master-item-btn master-delete-btn" data-delete-from-master="${emp.id}">ลบ</button>
      </div>
    </div>
  `).join('');
}

// Add employee from master
function addFromMaster(masterId) {
  const master = getEmployeeMaster();
  const masterEmp = master.find(e => e.id === masterId);
  if (!masterEmp) return;

  const newEmp = createFromMaster(masterEmp);
  updateEmployees([...state.employees, newEmp]);
}

// Delete from master
function deleteFromMaster(masterId) {
  if (!confirm('ลบพนักงานจากมาสเตอร์?')) return;
  removeFromEmployeeMaster(masterId);
  document.getElementById('master-employee-list').innerHTML = renderMasterEmployeeList();
  attachMasterHandlers();
}

// Attach master section handlers
function attachMasterHandlers() {
  // Download Excel template
  const downloadExcelBtn = document.getElementById('download-excel-template');
  if (downloadExcelBtn) {
    downloadExcelBtn.onclick = async () => {
      try {
        const { blob, filename } = await generateEmployeeTemplate();
        downloadBlob(blob, filename);
      } catch (err) {
        alert('Failed to generate template: ' + err.message);
      }
    };
  }

  // Upload Excel button
  const uploadExcelBtn = document.getElementById('upload-excel-btn');
  const excelInput = document.getElementById('excel-upload-input');
  
  if (uploadExcelBtn && excelInput) {
    uploadExcelBtn.onclick = () => excelInput.click();
    
    excelInput.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const buffer = await file.arrayBuffer();
        const employees = await parseEmployeeTemplate(buffer);

        if (employees.length === 0) {
          alert('ไม่พบข้อมูลพนักงานในไฟล์');
          return;
        }

        // Add to master
        let added = 0;
        employees.forEach(emp => {
          addToEmployeeMaster(emp);
          added++;
        });

        alert(`เพิ่มพนักงาน ${added} คนจาก Excel`);
        document.getElementById('master-employee-list').innerHTML = renderMasterEmployeeList();
        attachMasterHandlers();
        excelInput.value = '';
      } catch (err) {
        alert('Failed to parse Excel: ' + err.message);
      }
    };
  }

  // Download CSV template
  const downloadBtn = document.getElementById('download-csv-template');
  if (downloadBtn) {
    downloadBtn.onclick = () => {
      const template = generateCSVTemplate();
      const blob = new Blob([template], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'employee_master_template.csv';
      a.click();
      URL.revokeObjectURL(url);
    };
  }

  // CSV upload button
  const uploadBtn = document.getElementById('upload-csv-btn');
  const csvInput = document.getElementById('csv-upload-input');
  
  if (uploadBtn && csvInput) {
    uploadBtn.onclick = () => csvInput.click();
    
    csvInput.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const text = await file.text();
      const { success, errors } = parseEmployeeCSV(text);

      if (errors.length > 0) {
        alert('Errors:\n' + errors.join('\n'));
        return;
      }

      if (success.length === 0) {
        alert('No valid employees found in CSV');
        return;
      }

      // Add to master
      let added = 0;
      success.forEach(emp => {
        addToEmployeeMaster(emp);
        added++;
      });

      alert(`เพิ่มพนักงาน ${added} คนจาก CSV`);
      document.getElementById('master-employee-list').innerHTML = renderMasterEmployeeList();
      attachMasterHandlers();
      csvInput.value = '';
    };
  }

  // Clear master button
  const clearMasterBtn = document.getElementById('clear-master-btn');
  if (clearMasterBtn) {
    clearMasterBtn.onclick = () => {
      if (!confirm('ล้างข้อมูลพนักงานมาสเตอร์ทั้งหมด?')) return;
      localStorage.removeItem('payroll_employee_master');
      document.getElementById('master-employee-list').innerHTML = renderMasterEmployeeList();
      attachMasterHandlers();
      alert('ล้างข้อมูลมาสเตอร์แล้ว');
    };
  }

  // Add from master buttons
  document.querySelectorAll('[data-add-from-master]').forEach(btn => {
    btn.onclick = () => addFromMaster(btn.dataset.addFromMaster);
  });

  // Delete from master buttons
  document.querySelectorAll('[data-delete-from-master]').forEach(btn => {
    btn.onclick = () => deleteFromMaster(btn.dataset.deleteFromMaster);
  });
}

// Export App component and init function
export function App() {
  return renderAppHTML();
}

export function initApp() {
  loadFromLocalStorage(); // Load saved draft on startup
  render();
}

// Expose clear function for button
window.clearLocalStorage = clearLocalStorage;
