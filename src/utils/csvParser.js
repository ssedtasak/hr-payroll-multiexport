// CSV Parser Utility
// Parses CSV data for bulk employee import

import { EmployeeGroupType } from '../models/payroll.js';

/**
 * Parse CSV text into employee objects
 * Expected CSV format:
 * employeeId,fullName,bankCode,bankAccountNumber,bankAccountName,groupType
 * E001,สมชาย สมชื่อ,004,1234567890,สมชาย สมชื่อ,social_security
 */
export function parseEmployeeCSV(csvText) {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) {
    return { success: [], errors: ['CSV must have header and at least one data row'] };
  }

  // Parse header
  const header = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
  
  // Validate header
  const requiredFields = ['employeeid', 'fullname', 'bankaccountnumber'];
  const missingFields = requiredFields.filter(f => !header.includes(f));
  if (missingFields.length > 0) {
    return { 
      success: [], 
      errors: [`Missing required fields: ${missingFields.join(', ')}`]
    };
  }

  const employees = [];
  const errors = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line);
    const row = {};
    
    header.forEach((h, idx) => {
      row[h] = values[idx]?.trim() || '';
    });

    // Validate required fields
    if (!row.employeeid) {
      errors.push(`Row ${i + 1}: Missing employee ID`);
      continue;
    }
    if (!row.fullname) {
      errors.push(`Row ${i + 1}: Missing full name`);
      continue;
    }
    if (!row.bankaccountnumber) {
      errors.push(`Row ${i + 1}: Missing bank account number`);
      continue;
    }

    // Parse group type
    let groupType = EmployeeGroupType.SOCIAL_SECURITY;
    if (row.grouptype) {
      const gt = row.grouptype.toLowerCase();
      if (gt === 'withholding_tax' || gt === 'wt' || gt === 'หักณที่จ่าย') {
        groupType = EmployeeGroupType.WITHHOLDING_TAX;
      }
    }

    employees.push({
      employeeId: row.employeeid,
      fullName: row.fullname,
      bankCode: row.bankcode || '004',
      bankAccountNumber: row.bankaccountnumber,
      bankAccountName: row.bankaccountname || row.fullname,
      groupType,
    });
  }

  return { success: employees, errors };
}

/**
 * Parse a single CSV line handling quotes and escaped quotes
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      // Check for escaped quote ""
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  
  return result;
}

/**
 * Generate sample CSV template
 */
export function generateCSVTemplate() {
  return `employeeId,fullName,bankCode,bankAccountNumber,bankAccountName,groupType
E001,สมชาย สมชื่อ,004,1234567890,สมชาย สมชื่อ,social_security
E002,สมใจ สมใจ,004,9876543210,สมใจ สมใจ,withholding_tax`;
}
