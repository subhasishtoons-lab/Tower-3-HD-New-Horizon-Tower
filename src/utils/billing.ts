import {
  DEFAULT_UNIT_ROSTER,
  FIRST_UNIT_NUM,
  FIXED_CLEANER_SALARY,
  LAST_UNIT_NUM,
  TOTAL_UNITS,
  UNITS_PER_FLOOR,
} from '../data/societyConstants';
import type {
  ExpenseItem,
  PaymentRecord,
  UnitDirectoryEntry,
} from '../types/society';

export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatINR(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe);
}

export function isValidUnitNumber(unitNumber: string): boolean {
  return /^(049|05[0-9]|06[0-9]|07[0-2])$/.test(unitNumber.trim());
}

export function getFloorForUnit(unitNumber: string): number {
  if (!isValidUnitNumber(unitNumber)) {
    throw new Error(`Invalid Tower 3 unit number: ${unitNumber}. Must be between 049 and 072.`);
  }
  const numeric = Number.parseInt(unitNumber, 10);
  return Math.floor((numeric - FIRST_UNIT_NUM) / UNITS_PER_FLOOR) + 1;
}

export function generateTowerUnits(): UnitDirectoryEntry[] {
  const units: UnitDirectoryEntry[] = [];
  for (let num = FIRST_UNIT_NUM; num <= LAST_UNIT_NUM; num += 1) {
    const unitNumber = String(num).padStart(3, '0');
    const existing = DEFAULT_UNIT_ROSTER.find((entry) => entry.unitNumber === unitNumber);
    units.push(
      existing ?? {
        unitNumber,
        floor: getFloorForUnit(unitNumber),
        occupantName: '',
      }
    );
  }
  return units;
}

export interface MonthlyBillBreakdown {
  month: string;
  totalUnits: number;
  fixedCleanerSalaryTotal: number;
  cleanerSharePerUnit: number;
  electricityCharge: 0;
  waterCharge: 0;
  gasCharge: 0;
  extraExpenses: ExpenseItem[];
  extraExpensesTotal: number;
  extraExpensesPerUnit: number;
  totalSocietyPool: number;
  totalPayablePerUnit: number;
}

export function calculateMonthlyBill(
  month: string,
  allExpenses: ExpenseItem[]
): MonthlyBillBreakdown {
  const monthExpenses = allExpenses.filter((e) => e.month === month);
  const cleanerSharePerUnit = roundCurrency(FIXED_CLEANER_SALARY / TOTAL_UNITS);
  const extraExpensesTotal = roundCurrency(
    monthExpenses.reduce((sum, item) => sum + item.amount, 0)
  );
  const extraExpensesPerUnit = roundCurrency(extraExpensesTotal / TOTAL_UNITS);
  const totalSocietyPool = roundCurrency(FIXED_CLEANER_SALARY + extraExpensesTotal);
  const totalPayablePerUnit = roundCurrency(cleanerSharePerUnit + extraExpensesPerUnit);

  return {
    month,
    totalUnits: TOTAL_UNITS,
    fixedCleanerSalaryTotal: FIXED_CLEANER_SALARY,
    cleanerSharePerUnit,
    electricityCharge: 0,
    waterCharge: 0,
    gasCharge: 0,
    extraExpenses: monthExpenses,
    extraExpensesTotal,
    extraExpensesPerUnit,
    totalSocietyPool,
    totalPayablePerUnit,
  };
}

export interface UnitLedgerRow {
  unitNumber: string;
  floor: number;
  occupantName: string;
  cleanerShare: number;
  extraExpensesShare: number;
  totalDue: number;
  status: 'paid' | 'pending';
  payment?: PaymentRecord;
}

export interface CollectionSummary {
  breakdown: MonthlyBillBreakdown;
  paidCount: number;
  pendingCount: number;
  totalCollected: number;
  totalPending: number;
  collectionPercent: number;
  rows: UnitLedgerRow[];
}

export function calculateCollectionSummary(
  month: string,
  expenses: ExpenseItem[],
  payments: PaymentRecord[],
  roster: UnitDirectoryEntry[] = DEFAULT_UNIT_ROSTER
): CollectionSummary {
  const breakdown = calculateMonthlyBill(month, expenses);
  const monthPayments = payments.filter((p) => p.month === month && p.status === 'paid');
  const paymentByUnit = new Map<string, PaymentRecord>();

  for (const p of monthPayments) {
    paymentByUnit.set(p.unitNumber, p);
  }

  const rows: UnitLedgerRow[] = roster.map((unit) => {
    const payment = paymentByUnit.get(unit.unitNumber);
    const resolvedName = unit.occupantName.trim() || payment?.residentName?.trim() || '';
    return {
      unitNumber: unit.unitNumber,
      floor: unit.floor,
      occupantName: resolvedName,
      cleanerShare: breakdown.cleanerSharePerUnit,
      extraExpensesShare: breakdown.extraExpensesPerUnit,
      totalDue: breakdown.totalPayablePerUnit,
      status: payment ? 'paid' : 'pending',
      payment,
    };
  });

  const paidCount = rows.filter((r) => r.status === 'paid').length;
  const pendingCount = TOTAL_UNITS - paidCount;
  const totalCollected = roundCurrency(
    rows.reduce((sum, r) => sum + (r.payment ? r.payment.totalAmount : 0), 0)
  );
  const totalPending = roundCurrency(Math.max(0, breakdown.totalSocietyPool - totalCollected));
  const collectionPercent = Math.round((paidCount / TOTAL_UNITS) * 100);

  return {
    breakdown,
    paidCount,
    pendingCount,
    totalCollected,
    totalPending,
    collectionPercent,
    rows,
  };
}

// --- Blueprint-Synchronized Input Validators ---

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export function validateSignupInput(input: {
  fullName: string;
  unitNumber: string;
  phone: string;
  email: string;
  passcode?: string;
  requirePasscode?: boolean;
}): ValidationResult {
  const errors: Record<string, string> = {};
  const name = input.fullName.trim();
  const phone = input.phone.trim();
  const email = input.email.trim();
  const unit = input.unitNumber.trim();

  if (name.length < 2 || name.length > 100) {
    errors.fullName = 'Full name must be between 2 and 100 characters.';
  }
  if (!isValidUnitNumber(unit)) {
    errors.unitNumber = 'Select a valid Tower 3 unit between 049 and 072.';
  }
  if (!/^[0-9+\-\s]{10,20}$/.test(phone)) {
    errors.phone = 'Enter a valid 10-digit mobile or landline phone number.';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 160) {
    errors.email = 'Enter a valid email address.';
  }
  if (input.requirePasscode) {
    const pin = (input.passcode ?? '').trim();
    if (pin.length < 4 || pin.length > 24) {
      errors.passcode = 'Password / PIN must be at least 4 characters.';
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateNoticeInput(input: {
  title: string;
  content: string;
  effectiveDate: string;
}): ValidationResult {
  const errors: Record<string, string> = {};
  const title = input.title.trim();
  const content = input.content.trim();
  const effectiveDate = input.effectiveDate.trim();

  if (title.length < 3 || title.length > 140) {
    errors.title = 'Notice title must be between 3 and 140 characters.';
  }
  if (content.length < 5 || content.length > 2000) {
    errors.content = 'Notice details must be between 5 and 2,000 characters.';
  }
  if (effectiveDate.length < 1 || effectiveDate.length > 40) {
    errors.effectiveDate = 'Specify the effective date or schedule.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateExpenseInput(input: {
  title: string;
  amount: number;
  month: string;
  description: string;
}): ValidationResult {
  const errors: Record<string, string> = {};
  const title = input.title.trim();
  const description = input.description.trim();

  if (title.length < 3 || title.length > 120) {
    errors.title = 'Expense title must be between 3 and 120 characters.';
  }
  if (!Number.isFinite(input.amount) || input.amount <= 0 || input.amount > 500000) {
    errors.amount = 'Enter a valid amount between ₹1 and ₹5,00,000.';
  }
  if (!/^[0-9]{4}-[0-9]{2}$/.test(input.month)) {
    errors.month = 'Select a valid billing month (YYYY-MM).';
  }
  if (description.length > 600) {
    errors.description = 'Description cannot exceed 600 characters.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateMaintenanceInput(input: {
  title: string;
  location: string;
  description: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  if (input.title.trim().length < 3 || input.title.trim().length > 140) {
    errors.title = 'Issue title must be between 3 and 140 characters.';
  }
  if (input.location.trim().length < 2 || input.location.trim().length > 100) {
    errors.location = 'Specify the exact floor, landing, or building area.';
  }
  if (input.description.trim().length < 5 || input.description.trim().length > 1500) {
    errors.description = 'Provide at least 5 characters describing the building damage.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateDiscussionInput(input: {
  title: string;
  body: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  if (input.title.trim().length < 3 || input.title.trim().length > 160) {
    errors.title = 'Topic title must be between 3 and 160 characters.';
  }
  if (input.body.trim().length < 5 || input.body.trim().length > 2500) {
    errors.body = 'Describe the common issue in at least 5 characters.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function validatePaymentInput(input: {
  referenceNumber: string;
}): ValidationResult {
  const errors: Record<string, string> = {};
  const ref = input.referenceNumber.trim();
  if (ref.length < 3 || ref.length > 80) {
    errors.referenceNumber = 'Enter a valid UPI / Bank UTR or Receipt reference (min 3 characters).';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function formatShortDate(isoDate: string): string {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(isoDate: string): string {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
