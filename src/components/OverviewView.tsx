import React from 'react';
import { ArrowRight, Bell, CheckCircle2, MapPin, Phone, Wrench } from 'lucide-react';
import { useSociety } from '../context/SocietyContext';
import {
  AVAILABLE_MONTHS,
  EMERGENCY_CONTACTS,
  FIXED_CLEANER_SALARY,
  SOCIETY_ADDRESS,
  TOWER_REPRESENTATIVES,
} from '../data/societyConstants';
import type { NavSection } from '../types/society';
import {
  calculateCollectionSummary,
  formatDateTime,
  formatINR,
} from '../utils/billing';

interface OverviewViewProps {
  onNavigate: (section: NavSection) => void;
}

export function OverviewView({ onNavigate }: OverviewViewProps) {
  const {
    resident,
    isAdmin,
    selectedMonth,
    unitRoster,
    expenses,
    payments,
    notices,
    maintenanceRequests,
    discussions,
    activities,
  } = useSociety();

  if (!resident) return null;

  const summary = calculateCollectionSummary(selectedMonth, expenses, payments, unitRoster);
  const myRow = isAdmin
    ? undefined
    : summary.rows.find((r) => r.unitNumber === resident.unitNumber);
  const monthLabel =
    AVAILABLE_MONTHS.find((m) => m.value === selectedMonth)?.label ?? selectedMonth;

  const activeNotices = notices.filter((n) => n.status === 'active').slice(0, 3);
  const openMaintenance = maintenanceRequests.filter((m) => m.status !== 'resolved');
  const openDiscussions = discussions.filter((d) => d.status === 'open');
  const myActivities = (
    isAdmin
      ? activities
      : activities.filter(
          (a) => a.actorUid === resident.uid || a.actorUnit === resident.unitNumber
        )
  ).slice(0, 4);

  return (
    <div className="space-y-8">
      {/* Focal Top Summary Strip */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-mono font-semibold text-[#0F2942]">
              {isAdmin ? 'Admin Control Panel' : `Unit ${resident.unitNumber}`}
            </span>
            {!isAdmin && (
              <>
                <span aria-hidden="true">·</span>
                <span>Floor {resident.floor}</span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <span>{monthLabel} Billing Cycle</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            {isAdmin ? 'Society Administration Dashboard' : `Welcome back, ${resident.fullName}`}
          </h1>
          <p className="text-sm text-slate-600 flex items-start gap-2">
            <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
            <span>{SOCIETY_ADDRESS}</span>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 shrink-0 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-200">
          {isAdmin ? (
            <>
              <div className="text-left sm:text-right">
                <p className="text-xs text-slate-500">{monthLabel} Society Pool</p>
                <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                  {formatINR(summary.breakdown.totalSocietyPool)}
                </p>
                <p className="text-xs font-semibold text-[#0F2942]">
                  Full Add / Edit / Delete Access
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('bills')}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#0F2942] rounded-lg hover:bg-[#173B5E] transition-colors whitespace-nowrap"
              >
                Manage Ledger & Expenses
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <div className="text-left sm:text-right">
                <p className="text-xs text-slate-500">Your {monthLabel} Total</p>
                <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                  {formatINR(summary.breakdown.totalPayablePerUnit)}
                </p>
                <p
                  className={`text-xs font-semibold ${
                    myRow?.status === 'paid' ? 'text-[#15803D]' : 'text-[#B45309]'
                  }`}
                >
                  {myRow?.status === 'paid' ? 'Paid · Receipt Recorded' : 'Payment Pending'}
                </p>
              </div>
              {myRow?.status === 'paid' ? (
                <button
                  type="button"
                  onClick={() => onNavigate('bills')}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-[#15803D] bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors whitespace-nowrap"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  View Receipt
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onNavigate('bills')}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#0F2942] rounded-lg hover:bg-[#173B5E] transition-colors whitespace-nowrap"
                >
                  Pay Monthly Dues
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>
      </section>

      {/* 4-Column KPI Strip */}
      <section
        aria-label="Tower 3 key metrics"
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
      >
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500">Fixed Cleaner Salary (÷ 24)</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1.5">
            {formatINR(summary.breakdown.cleanerSharePerUnit)}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {formatINR(FIXED_CLEANER_SALARY)} fixed · ₹0 utility charge
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500">Different Expenses Share</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1.5">
            {formatINR(summary.breakdown.extraExpensesPerUnit)}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {summary.breakdown.extraExpenses.length} item(s) · Total{' '}
            <span className="font-mono tabular-nums">
              {formatINR(summary.breakdown.extraExpensesTotal)}
            </span>
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500">Tower 3 Dues Collected</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1.5">
            {summary.paidCount} / 24 Units
          </p>
          <p className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
            {formatINR(summary.totalCollected)} of {formatINR(summary.breakdown.totalSocietyPool)}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500">Active Issues & Topics</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1.5">
            {openMaintenance.length} / {openDiscussions.length}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {openMaintenance.length} open repairs · {openDiscussions.length} open discussions
          </p>
        </div>
      </section>

      {/* Main 2-Column Content Split: Recent Notices & Activity / Maintenance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Recent Notices */}
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#0F2942]" />
              <h2 className="text-base font-bold text-slate-900">Digital Notice Board</h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('notices')}
              className="text-xs font-semibold text-[#0F2942] hover:underline whitespace-nowrap"
            >
              Open Board & Create Notice
            </button>
          </div>

          {activeNotices.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-slate-600 mb-3">No active notices posted yet.</p>
              <button
                type="button"
                onClick={() => onNavigate('notices')}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#0F2942] rounded-lg"
              >
                Create First Notice
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-slate-200">
              {activeNotices.map((notice) => (
                <li key={notice.id} className="p-6 hover:bg-slate-50/70 transition-colors">
                  <div className="flex flex-wrap items-center gap-2 text-xs mb-1.5">
                    <span
                      className={`font-semibold ${
                        notice.priority === 'urgent' || notice.category === 'Emergency Work'
                          ? 'text-[#C81E1E]'
                          : 'text-[#0F2942]'
                      }`}
                    >
                      {notice.category}
                      {notice.priority === 'urgent' ? ' (Urgent)' : ''}
                    </span>
                    <span aria-hidden="true" className="text-slate-300">·</span>
                    <span className="text-slate-500">{notice.effectiveDate}</span>
                    <span aria-hidden="true" className="text-slate-300">·</span>
                    <span className="text-slate-500 font-mono">
                      {notice.authorUnit === 'ADM'
                        ? notice.authorName || 'Society Administrator'
                        : notice.authorName && notice.authorName !== `Unit ${notice.authorUnit}`
                          ? `Unit ${notice.authorUnit} (${notice.authorName})`
                          : `Unit ${notice.authorUnit}`}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mb-1">{notice.title}</h3>
                  <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                    {notice.content}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Right Column: Recent Activity & Maintenance Summary */}
        <div className="lg:col-span-5 space-y-6">
          {/* My Recent Activity */}
          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
              <h2 className="text-base font-bold text-slate-900">
                {isAdmin ? 'Recent Tower 3 Activity' : 'Your Recent Activity'}
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('activity')}
                className="text-xs font-semibold text-[#0F2942] hover:underline whitespace-nowrap"
              >
                View All Activity
              </button>
            </div>
            {myActivities.length === 0 ? (
              <div className="p-6 text-sm text-slate-600">
                Your payments, maintenance reports, notices, and discussions will appear here as you
                use the portal.
              </div>
            ) : (
              <ul className="divide-y divide-slate-200">
                {myActivities.map((act) => (
                  <li key={act.id} className="px-6 py-3.5">
                    <p className="text-sm text-slate-800">{act.summary}</p>
                    <p className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
                      {formatDateTime(act.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Open Building Damages */}
          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-[#0F2942]" />
                <h2 className="text-base font-bold text-slate-900">Open Maintenance Reports</h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('maintenance')}
                className="text-xs font-semibold text-[#0F2942] hover:underline whitespace-nowrap"
              >
                Track Repairs
              </button>
            </div>
            {openMaintenance.length === 0 ? (
              <div className="p-6 text-sm text-slate-600">
                All building maintenance reports are currently resolved.
              </div>
            ) : (
              <ul className="divide-y divide-slate-200">
                {openMaintenance.slice(0, 3).map((item) => (
                  <li key={item.id} className="px-6 py-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900 truncate">{item.title}</p>
                      <span
                        className={`text-xs font-semibold shrink-0 ${
                          item.status === 'in_progress' ? 'text-[#B45309]' : 'text-[#C81E1E]'
                        }`}
                      >
                        {item.status === 'in_progress' ? 'In Progress' : 'Reported'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {item.location} ·{' '}
                      {item.reporterUnit === 'ADM' ? 'Society Admin' : `Unit ${item.reporterUnit}`}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      {/* Quick Emergency Numbers & Representatives Reference Strip */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">
            Emergency Helplines & Tower 3 Representatives
          </h2>
          <button
            type="button"
            onClick={() => onNavigate('emergency')}
            className="text-xs font-semibold text-[#0F2942] hover:underline self-start sm:self-auto"
          >
            Full Directory & 24-Unit Roster
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 pt-4">
          {EMERGENCY_CONTACTS.map((c) => (
            <div key={c.id} className="space-y-1">
              <p className="text-xs font-semibold text-slate-500">{c.service}</p>
              {c.numbers.map((num) => (
                <a
                  key={num}
                  href={`tel:${num.replace(/[^0-9+]/g, '')}`}
                  className="flex items-center gap-1.5 text-sm font-mono font-semibold tabular-nums text-[#C81E1E] hover:underline"
                >
                  <Phone className="w-3.5 h-3.5 shrink-0" />
                  {num}
                </a>
              ))}
            </div>
          ))}
          {TOWER_REPRESENTATIVES.map((rep) => (
            <div key={rep.id} className="space-y-1">
              <p className="text-xs font-semibold text-slate-500">Tower 3 Rep</p>
              <p className="text-sm font-semibold text-slate-900">{rep.name}</p>
              <a
                href={`tel:${rep.phone}`}
                className="flex items-center gap-1.5 text-sm font-mono font-semibold tabular-nums text-[#0F2942] hover:underline"
              >
                <Phone className="w-3.5 h-3.5 shrink-0" />
                {rep.phone}
              </a>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
