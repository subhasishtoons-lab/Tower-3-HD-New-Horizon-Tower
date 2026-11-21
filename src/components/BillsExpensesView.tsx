import React, { useState } from 'react';
import {
  CheckCircle2,
  Info,
  Pencil,
  Plus,
  ReceiptIndianRupee,
  Trash2,
  X,
} from 'lucide-react';
import { useSociety } from '../context/SocietyContext';
import {
  AVAILABLE_MONTHS,
  FIXED_CLEANER_SALARY,
  TOTAL_UNITS,
} from '../data/societyConstants';
import type { ExpenseCategory, ExpenseItem, PaymentMethod } from '../types/society';
import {
  calculateCollectionSummary,
  formatINR,
  formatShortDate,
  roundCurrency,
  validateExpenseInput,
  validatePaymentInput,
} from '../utils/billing';

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Common Area Repair',
  'Cleaning Supplies',
  'Security & Lighting',
  'Sanitation',
  'Miscellaneous',
];

const PAYMENT_METHODS: PaymentMethod[] = [
  'UPI',
  'Bank Transfer',
  'Cash to Representative',
];

export function BillsExpensesView() {
  const {
    resident,
    isAdmin,
    selectedMonth,
    setSelectedMonth,
    unitRoster,
    expenses,
    payments,
    addExpense,
    updateExpense,
    deleteExpense,
    payDues,
    deletePayment,
    updateUnitName,
  } = useSociety();

  const [floorFilter, setFloorFilter] = useState<'all' | number>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');

  // Add / Edit Expense Modal state
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);
  const [expTitle, setExpTitle] = useState('');
  const [expCategory, setExpCategory] = useState<ExpenseCategory>('Common Area Repair');
  const [expAmount, setExpAmount] = useState('');
  const [expDescription, setExpDescription] = useState('');
  const [expErrors, setExpErrors] = useState<Record<string, string>>({});
  const [expSaving, setExpSaving] = useState(false);

  // Pay Dues Modal state (for resident self-pay OR admin recording payment for a specific unit)
  const [showPayModal, setShowPayModal] = useState(false);
  const [payTargetUnit, setPayTargetUnit] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('UPI');
  const [payRef, setPayRef] = useState('');
  const [payErrors, setPayErrors] = useState<Record<string, string>>({});
  const [paySaving, setPaySaving] = useState(false);

  // Admin Edit Unit Name Modal state
  const [editingUnitNumber, setEditingUnitNumber] = useState<string | null>(null);
  const [editingUnitNameValue, setEditingUnitNameValue] = useState('');
  const [savingUnitName, setSavingUnitName] = useState(false);

  if (!resident) return null;

  const summary = calculateCollectionSummary(selectedMonth, expenses, payments, unitRoster);
  const myRow = isAdmin
    ? undefined
    : summary.rows.find((r) => r.unitNumber === resident.unitNumber);
  const monthLabel =
    AVAILABLE_MONTHS.find((m) => m.value === selectedMonth)?.label ?? selectedMonth;

  const filteredLedger = summary.rows.filter((row) => {
    if (floorFilter !== 'all' && row.floor !== floorFilter) return false;
    if (statusFilter !== 'all' && row.status !== statusFilter) return false;
    return true;
  });

  const openAddExpense = () => {
    setEditingExpense(null);
    setExpTitle('');
    setExpCategory('Common Area Repair');
    setExpAmount('');
    setExpDescription('');
    setExpErrors({});
    setShowExpenseModal(true);
  };

  const openEditExpense = (exp: ExpenseItem) => {
    setEditingExpense(exp);
    setExpTitle(exp.title);
    setExpCategory(exp.category);
    setExpAmount(String(exp.amount));
    setExpDescription(exp.description);
    setExpErrors({});
    setShowExpenseModal(true);
  };

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Number(expAmount);
    const validation = validateExpenseInput({
      title: expTitle,
      amount: numericAmount,
      month: selectedMonth,
      description: expDescription,
    });
    if (!validation.valid) {
      setExpErrors(validation.errors);
      return;
    }
    setExpErrors({});
    setExpSaving(true);
    try {
      if (editingExpense) {
        await updateExpense(editingExpense.id, {
          title: expTitle,
          category: expCategory,
          amount: numericAmount,
          month: selectedMonth,
          description: expDescription,
        });
      } else {
        await addExpense({
          title: expTitle,
          category: expCategory,
          amount: numericAmount,
          month: selectedMonth,
          description: expDescription,
        });
      }
      setEditingExpense(null);
      setExpTitle('');
      setExpAmount('');
      setExpDescription('');
      setShowExpenseModal(false);
    } finally {
      setExpSaving(false);
    }
  };

  const openPayModalForUnit = (unitNum: string) => {
    setPayTargetUnit(unitNum);
    setPayMethod('UPI');
    setPayRef('');
    setPayErrors({});
    setShowPayModal(true);
  };

  const handlePayDuesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validatePaymentInput({ referenceNumber: payRef });
    if (!validation.valid) {
      setPayErrors(validation.errors);
      return;
    }
    setPayErrors({});
    setPaySaving(true);
    try {
      const targetUnit = payTargetUnit ?? resident.unitNumber;
      const targetUnitEntry = unitRoster.find((u) => u.unitNumber === targetUnit);
      await payDues({
        month: selectedMonth,
        unitNumber: targetUnit,
        residentName: isAdmin ? targetUnitEntry?.occupantName ?? '' : resident.fullName,
        cleanerShare: summary.breakdown.cleanerSharePerUnit,
        extraExpensesShare: summary.breakdown.extraExpensesPerUnit,
        totalAmount: summary.breakdown.totalPayablePerUnit,
        paymentMethod: payMethod,
        referenceNumber: payRef,
      });
      setPayRef('');
      setPayTargetUnit(null);
      setShowPayModal(false);
    } finally {
      setPaySaving(false);
    }
  };

  const handleUnitNameSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUnitNumber) return;
    setSavingUnitName(true);
    try {
      await updateUnitName(editingUnitNumber, editingUnitNameValue);
      setEditingUnitNumber(null);
      setEditingUnitNameValue('');
    } finally {
      setSavingUnitName(false);
    }
  };

  const activePayUnit = payTargetUnit ?? resident.unitNumber;

  return (
    <div className="space-y-8">
      {/* Page Header & Month Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bills, Monthly Dues & Expenses</h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Equal 24-unit monthly maintenance ledger for Tower 3 (Units 049 – 072)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label htmlFor="billing-month-select" className="text-xs font-semibold text-slate-600">
            Billing Month
          </label>
          <select
            id="billing-month-select"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3.5 py-2 text-sm font-medium bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F2942]"
          >
            {AVAILABLE_MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* OIL India Resident Complex Policy Notice */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-start gap-3.5">
        <Info className="w-5 h-5 text-[#0F2942] shrink-0 mt-0.5" />
        <div className="text-sm text-slate-700 leading-relaxed">
          <span className="font-semibold text-slate-900">
            OIL India Ltd. Resident Complex Policy:
          </span>{' '}
          Tower 3 is an OIL India residential enclave, not a private property. There is{' '}
          <span className="font-semibold text-slate-900">
            no electricity, water, or gas charge
          </span>
          . Monthly maintenance covers strictly the fixed cleaner salary of{' '}
          <span className="font-mono font-semibold text-slate-900">
            {formatINR(FIXED_CLEANER_SALARY)}
          </span>{' '}
          shared equally across all 24 units (
          <span className="font-mono font-semibold text-slate-900">
            {formatINR(summary.breakdown.cleanerSharePerUnit)}
          </span>{' '}
          per resident). Any additional common building charge is recorded below under{' '}
          <span className="font-semibold text-slate-900">Different Expenses</span>.
        </div>
      </div>

      {/* Monthly Statement Card */}
      <section
        aria-label="Monthly maintenance bill breakdown"
        className="bg-white border border-slate-200 rounded-xl overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {isAdmin
                ? `Tower 3 Monthly Statement — ${monthLabel}`
                : `My Unit Statement — Unit ${resident.unitNumber} (Floor ${resident.floor})`}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {monthLabel} · Equal 1/24th share of Tower 3 maintenance pool
            </p>
          </div>

          {!isAdmin &&
            (myRow?.status === 'paid' ? (
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-[#15803D]">
                <CheckCircle2 className="w-4 h-4" />
                Paid on {myRow.payment ? formatShortDate(myRow.payment.createdAt) : 'Recorded'}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => openPayModalForUnit(resident.unitNumber)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#0F2942] rounded-lg hover:bg-[#173B5E] transition-colors whitespace-nowrap"
              >
                <ReceiptIndianRupee className="w-4 h-4" />
                Pay Dues ({formatINR(summary.breakdown.totalPayablePerUnit)})
              </button>
            ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-500 text-left bg-slate-50/70">
                <th className="py-3 px-6 font-semibold whitespace-nowrap">Line Item</th>
                <th className="py-3 px-6 font-semibold whitespace-nowrap">Policy / Split Rule</th>
                <th className="py-3 px-6 font-semibold text-right whitespace-nowrap">
                  Tower 3 Total
                </th>
                <th className="py-3 px-6 font-semibold text-right whitespace-nowrap">
                  Per Unit Share (1/24)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="py-3.5 px-6 font-medium text-slate-900">
                  Monthly Cleaner Salary (Fixed Maintenance)
                </td>
                <td className="py-3.5 px-6 text-slate-600">Fixed ₹11,000 ÷ 24 residents</td>
                <td className="py-3.5 px-6 text-right font-mono tabular-nums text-slate-700">
                  {formatINR(FIXED_CLEANER_SALARY)}
                </td>
                <td className="py-3.5 px-6 text-right font-mono tabular-nums font-semibold text-slate-900">
                  {formatINR(summary.breakdown.cleanerSharePerUnit)}
                </td>
              </tr>
              <tr>
                <td className="py-3.5 px-6 font-medium text-slate-900">
                  Electricity, Water & Domestic Gas
                </td>
                <td className="py-3.5 px-6 text-slate-600">Covered by OIL India Ltd. complex</td>
                <td className="py-3.5 px-6 text-right font-mono tabular-nums text-slate-500">
                  ₹0.00
                </td>
                <td className="py-3.5 px-6 text-right font-mono tabular-nums text-slate-500">
                  ₹0.00
                </td>
              </tr>
              <tr>
                <td className="py-3.5 px-6 font-medium text-slate-900">
                  Different Expenses ({summary.breakdown.extraExpenses.length} item
                  {summary.breakdown.extraExpenses.length === 1 ? '' : 's'})
                </td>
                <td className="py-3.5 px-6 text-slate-600">Shared equally across 24 units</td>
                <td className="py-3.5 px-6 text-right font-mono tabular-nums text-slate-700">
                  {formatINR(summary.breakdown.extraExpensesTotal)}
                </td>
                <td className="py-3.5 px-6 text-right font-mono tabular-nums font-semibold text-slate-900">
                  {formatINR(summary.breakdown.extraExpensesPerUnit)}
                </td>
              </tr>
              <tr className="bg-slate-50">
                <td className="py-4 px-6 font-bold text-slate-900" colSpan={2}>
                  Total Monthly Payable — {monthLabel}
                </td>
                <td className="py-4 px-6 text-right font-mono tabular-nums font-bold text-slate-900">
                  {formatINR(summary.breakdown.totalSocietyPool)}
                </td>
                <td className="py-4 px-6 text-right font-mono tabular-nums text-base font-bold text-[#0F2942]">
                  {formatINR(summary.breakdown.totalPayablePerUnit)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {myRow?.payment && (
          <div className="px-6 py-3.5 bg-emerald-50/60 border-t border-emerald-200 flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-900">
            <span>
              Receipt Reference:{' '}
              <span className="font-mono font-semibold">{myRow.payment.referenceNumber}</span> ·
              Method: <span className="font-semibold">{myRow.payment.paymentMethod}</span>
            </span>
            <span className="font-mono tabular-nums font-semibold">
              Paid Amount: {formatINR(myRow.payment.totalAmount)}
            </span>
          </div>
        )}
      </section>

      {/* Different Expenses Section (Add / Admin Edit / Delete) */}
      <section
        aria-label="Different Expenses Section"
        className="bg-white border border-slate-200 rounded-xl overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Different Expenses — {monthLabel}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Non-routine common society charges added for Tower 3 and divided equally among 24
              units
            </p>
          </div>
          <button
            type="button"
            onClick={openAddExpense}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#0F2942] rounded-lg hover:bg-[#173B5E] transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Add Expense
          </button>
        </div>

        {summary.breakdown.extraExpenses.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-slate-600 mb-3">
              No additional expenses logged for {monthLabel}. Only the fixed ₹11,000 cleaner salary
              applies.
            </p>
            <button
              type="button"
              onClick={openAddExpense}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#0F2942] border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              <Plus className="w-3.5 h-3.5" />
              Add First Expense
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500 text-left bg-slate-50/70">
                  <th className="py-3 px-6 font-semibold whitespace-nowrap">Expense & Details</th>
                  <th className="py-3 px-4 font-semibold whitespace-nowrap">Category</th>
                  <th className="py-3 px-4 font-semibold whitespace-nowrap">Added By</th>
                  <th className="py-3 px-4 font-semibold text-right whitespace-nowrap">
                    Total (₹)
                  </th>
                  <th className="py-3 px-6 font-semibold text-right whitespace-nowrap">
                    Per Unit (÷24)
                  </th>
                  <th className="py-3 px-4 font-semibold text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {summary.breakdown.extraExpenses.map((exp) => {
                  const canDelete = isAdmin || exp.addedByUid === resident.uid;
                  return (
                    <tr key={exp.id} className="hover:bg-slate-50/60">
                      <td className="py-3.5 px-6">
                        <p className="font-semibold text-slate-900">{exp.title}</p>
                        {exp.description && (
                          <p className="text-xs text-slate-500 mt-0.5 max-w-md">
                            {exp.description}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        {exp.category}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 whitespace-nowrap">
                        <span className="font-medium text-slate-800">{exp.addedByName}</span>
                        <span className="block font-mono text-slate-500">
                          {exp.addedByUnit === 'ADM' ? 'Admin' : `Unit ${exp.addedByUnit}`} ·{' '}
                          {formatShortDate(exp.createdAt)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums font-medium text-slate-900">
                        {formatINR(exp.amount)}
                      </td>
                      <td className="py-3.5 px-6 text-right font-mono tabular-nums font-semibold text-[#0F2942]">
                        {formatINR(roundCurrency(exp.amount / TOTAL_UNITS))}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1">
                          {isAdmin && (
                            <button
                              type="button"
                              aria-label={`Edit expense ${exp.title}`}
                              onClick={() => openEditExpense(exp)}
                              className="p-1.5 text-slate-500 hover:text-[#0F2942] rounded-md transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          {canDelete ? (
                            <button
                              type="button"
                              aria-label={`Delete expense ${exp.title}`}
                              onClick={() => void deleteExpense(exp.id)}
                              className="p-1.5 text-slate-400 hover:text-[#C81E1E] rounded-md transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            !isAdmin && <span className="text-xs text-slate-400">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 24-Unit Tower 3 Collection Ledger (049 to 072) */}
      <section
        aria-label="24-Unit Tower 3 Dues Ledger"
        className="bg-white border border-slate-200 rounded-xl overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              24-Unit Collection Ledger (Units 049 – 072)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 font-mono tabular-nums">
              {summary.paidCount} Paid · {summary.pendingCount} Pending · Collected{' '}
              {formatINR(summary.totalCollected)} / {formatINR(summary.breakdown.totalSocietyPool)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              aria-label="Filter ledger by floor"
              value={String(floorFilter)}
              onChange={(e) =>
                setFloorFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))
              }
              className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-lg"
            >
              <option value="all">All 6 Floors (24 Units)</option>
              {[1, 2, 3, 4, 5, 6].map((f) => (
                <option key={f} value={f}>
                  Floor {f}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(['all', 'paid', 'pending'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-colors ${
                    statusFilter === st
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-500 text-left bg-slate-50/70">
                <th className="py-3 px-6 font-semibold whitespace-nowrap">Unit</th>
                <th className="py-3 px-4 font-semibold whitespace-nowrap">Floor</th>
                <th className="py-3 px-4 font-semibold whitespace-nowrap">Resident Name</th>
                <th className="py-3 px-4 font-semibold text-right whitespace-nowrap">
                  Cleaner Share
                </th>
                <th className="py-3 px-4 font-semibold text-right whitespace-nowrap">
                  Extra Share
                </th>
                <th className="py-3 px-4 font-semibold text-right whitespace-nowrap">Total Due</th>
                <th className="py-3 px-6 font-semibold text-right whitespace-nowrap">Status</th>
                {isAdmin && (
                  <th className="py-3 px-4 font-semibold text-right whitespace-nowrap">
                    Admin Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredLedger.map((row) => {
                const isMe = !isAdmin && row.unitNumber === resident.unitNumber;
                return (
                  <tr
                    key={row.unitNumber}
                    className={isMe ? 'bg-slate-50/90' : 'hover:bg-slate-50/50'}
                  >
                    <td className="py-3 px-6 font-mono font-semibold tabular-nums text-slate-900 whitespace-nowrap">
                      {row.unitNumber}
                      {isMe && (
                        <span className="ml-2 text-[11px] font-sans font-semibold text-[#0F2942]">
                          (You)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono tabular-nums">
                      F{row.floor}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {row.occupantName ? (
                        row.occupantName
                      ) : (
                        <span className="text-slate-400 font-normal">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                      {formatINR(row.cleanerShare)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                      {formatINR(row.extraExpensesShare)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {formatINR(row.totalDue)}
                    </td>
                    <td className="py-3 px-6 text-right whitespace-nowrap">
                      {row.status === 'paid' ? (
                        <span className="text-xs font-semibold text-[#15803D]">
                          Paid · {row.payment ? formatShortDate(row.payment.createdAt) : ''}
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-[#B45309]">Pending</span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingUnitNumber(row.unitNumber);
                              setEditingUnitNameValue(row.occupantName);
                            }}
                            aria-label={`Edit name for Unit ${row.unitNumber}`}
                            className="text-xs font-medium text-[#0F2942] hover:underline"
                          >
                            Edit Name
                          </button>
                          <span aria-hidden="true" className="text-slate-300">
                            ·
                          </span>
                          {row.status === 'paid' && row.payment ? (
                            <button
                              type="button"
                              onClick={() => void deletePayment(row.payment!.id)}
                              aria-label={`Delete payment for Unit ${row.unitNumber}`}
                              className="text-xs font-medium text-[#C81E1E] hover:underline"
                            >
                              Reset Paid
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openPayModalForUnit(row.unitNumber)}
                              aria-label={`Mark Unit ${row.unitNumber} paid`}
                              className="text-xs font-medium text-[#15803D] hover:underline"
                            >
                              Mark Paid
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Add / Edit Different Expense Modal */}
      {showExpenseModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-expense-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <h3 id="add-expense-title" className="text-lg font-bold text-slate-900">
                  {editingExpense
                    ? `Edit Expense (${monthLabel})`
                    : `Add Common Expense (${monthLabel})`}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Automatically split equally across all 24 units (Units 049 – 072)
                </p>
              </div>
              <button
                type="button"
                aria-label="Close expense dialog"
                onClick={() => setShowExpenseModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExpenseSubmit} className="space-y-4 mt-4">
              <div>
                <label
                  htmlFor="expense-title"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Expense Title
                </label>
                <input
                  id="expense-title"
                  type="text"
                  value={expTitle}
                  onChange={(e) => setExpTitle(e.target.value)}
                  placeholder="e.g., Staircase LED Bulbs Replacement"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F2942]"
                />
                {expErrors.title && (
                  <p className="text-xs text-[#C81E1E] mt-1">{expErrors.title}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="expense-category"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Category
                  </label>
                  <select
                    id="expense-category"
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value as ExpenseCategory)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="expense-amount"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Total Cost (₹ INR)
                  </label>
                  <input
                    id="expense-amount"
                    type="number"
                    min="1"
                    step="0.01"
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value)}
                    placeholder="e.g., 1200"
                    className="w-full px-3.5 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F2942]"
                  />
                  {expErrors.amount && (
                    <p className="text-xs text-[#C81E1E] mt-1">{expErrors.amount}</p>
                  )}
                </div>
              </div>

              {Number(expAmount) > 0 && (
                <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 font-mono tabular-nums">
                  Equal share per resident (÷ 24):{' '}
                  <span className="font-bold text-[#0F2942]">
                    {formatINR(roundCurrency(Number(expAmount) / 24))}
                  </span>
                </p>
              )}

              <div>
                <label
                  htmlFor="expense-description"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Notes / Bill Details (Optional)
                </label>
                <textarea
                  id="expense-description"
                  rows={3}
                  value={expDescription}
                  onChange={(e) => setExpDescription(e.target.value)}
                  placeholder="Vendor name, floor location, or receipt remarks"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F2942]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={expSaving}
                  className="px-4 py-2 text-sm font-semibold text-white bg-[#0F2942] rounded-lg hover:bg-[#173B5E] disabled:opacity-60"
                >
                  {expSaving ? 'Saving...' : editingExpense ? 'Update Expense' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Dues / Record Unit Payment Modal */}
      {showPayModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pay-dues-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <h3 id="pay-dues-title" className="text-lg font-bold text-slate-900">
                  {isAdmin
                    ? `Record Dues Payment — Unit ${activePayUnit}`
                    : `Pay Monthly Dues — Unit ${activePayUnit}`}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{monthLabel} Society Maintenance</p>
              </div>
              <button
                type="button"
                aria-label="Close pay dues dialog"
                onClick={() => setShowPayModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-4 p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Cleaner Salary Share (Fixed)</span>
                <span className="font-mono tabular-nums text-slate-900">
                  {formatINR(summary.breakdown.cleanerSharePerUnit)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Different Expenses Share</span>
                <span className="font-mono tabular-nums text-slate-900">
                  {formatINR(summary.breakdown.extraExpensesPerUnit)}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 font-bold">
                <span className="text-slate-900">Total Payable</span>
                <span className="font-mono tabular-nums text-[#0F2942]">
                  {formatINR(summary.breakdown.totalPayablePerUnit)}
                </span>
              </div>
            </div>

            <form onSubmit={handlePayDuesSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="payment-method"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Payment Mode
                </label>
                <select
                  id="payment-method"
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="payment-ref"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  UPI Transaction ID / Bank UTR / Receipt Note
                </label>
                <input
                  id="payment-ref"
                  type="text"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  placeholder="e.g., UPI-4321987654"
                  className="w-full px-3.5 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F2942]"
                />
                {payErrors.referenceNumber && (
                  <p className="text-xs text-[#C81E1E] mt-1">{payErrors.referenceNumber}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paySaving}
                  className="px-4 py-2 text-sm font-semibold text-white bg-[#15803D] rounded-lg hover:bg-[#166534] disabled:opacity-60"
                >
                  {paySaving ? 'Recording...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Edit Unit Name Modal */}
      {editingUnitNumber && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-unit-name-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <h3 id="edit-unit-name-title" className="text-lg font-bold text-slate-900">
                Assign / Edit Resident Name — Unit {editingUnitNumber}
              </h3>
              <button
                type="button"
                aria-label="Close edit unit name dialog"
                onClick={() => setEditingUnitNumber(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUnitNameSave} className="space-y-4 mt-4">
              <div>
                <label
                  htmlFor="unit-name-input"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Resident Name (leave blank to clear)
                </label>
                <input
                  id="unit-name-input"
                  type="text"
                  value={editingUnitNameValue}
                  onChange={(e) => setEditingUnitNameValue(e.target.value)}
                  placeholder="Leave empty for unassigned unit"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F2942]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUnitNumber(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingUnitName}
                  className="px-4 py-2 text-sm font-semibold text-white bg-[#0F2942] rounded-lg hover:bg-[#173B5E]"
                >
                  {savingUnitName ? 'Saving...' : 'Save Name'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
