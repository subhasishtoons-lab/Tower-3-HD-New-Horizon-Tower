import React, { useState } from 'react';
import { Activity, ArrowUpRight, Trash2 } from 'lucide-react';
import { useSociety } from '../context/SocietyContext';
import type { ActivityActionType, NavSection } from '../types/society';
import { formatDateTime } from '../utils/billing';

interface ActivityViewProps {
  onNavigate: (section: NavSection) => void;
}

const ACTION_LABELS: Record<ActivityActionType, string> = {
  payment: 'Dues Payment',
  expense: 'Society Expense',
  notice: 'Notice Board',
  maintenance: 'Maintenance',
  discussion: 'Discussion',
  account: 'Account',
};

function formatActorLabel(unit: string, name: string): string {
  if (unit === 'ADM') return name || 'Society Admin';
  const trimmed = name.trim();
  if (!trimmed || trimmed === `Unit ${unit}`) return `Unit ${unit}`;
  return `Unit ${unit} (${trimmed})`;
}

export function ActivityView({ onNavigate }: ActivityViewProps) {
  const { resident, isAdmin, activities, deleteActivity } = useSociety();
  const [scope, setScope] = useState<'mine' | 'all'>(isAdmin ? 'all' : 'mine');
  const [typeFilter, setTypeFilter] = useState<'all' | ActivityActionType>('all');

  if (!resident) return null;

  const scoped = activities.filter((a) =>
    scope === 'mine'
      ? a.actorUid === resident.uid || a.actorUnit === resident.unitNumber
      : true
  );

  const filtered = scoped.filter((a) =>
    typeFilter === 'all' ? true : a.actionType === typeFilter
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {isAdmin ? 'Tower 3 Activity Log' : 'Resident Activity History'}
        </h1>
        <p className="text-sm text-slate-600 mt-0.5">
          {isAdmin
            ? 'Audit or remove recorded payments, expenses, notices, maintenance updates, and discussions'
            : 'Track your unit payments, added expenses, notices published, maintenance updates, and discussions'}
        </p>
      </div>

      {/* Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
          <button
            type="button"
            onClick={() => setScope('mine')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              scope === 'mine'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {isAdmin ? 'Admin Actions' : `My Activities (Unit ${resident.unitNumber})`}
          </button>
          <button
            type="button"
            onClick={() => setScope('all')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              scope === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Tower 3 Activity
          </button>
        </div>

        <select
          aria-label="Filter activities by type"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as 'all' | ActivityActionType)}
          className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-lg"
        >
          <option value="all">All Activity Types</option>
          <option value="payment">Dues Payments</option>
          <option value="expense">Different Expenses</option>
          <option value="notice">Notice Board</option>
          <option value="maintenance">Maintenance Tracker</option>
          <option value="discussion">Discussions</option>
          <option value="account">Account Events</option>
        </select>
      </div>

      {/* Activity List */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center">
            <Activity className="w-8 h-8 text-slate-400 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-900 mb-1">No recorded activities yet</p>
            <p className="text-xs text-slate-500">
              {scope === 'mine'
                ? isAdmin
                  ? 'Administrative edits, additions, and deletions will appear here.'
                  : `Actions taken by Unit ${resident.unitNumber} (paying bills, creating notices, reporting damages, or posting discussions) will appear here.`
                : 'No society activities match the selected filter.'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-200">
            {filtered.map((item) => (
              <li
                key={item.id}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-semibold text-[#0F2942]">
                      {ACTION_LABELS[item.actionType]}
                    </span>
                    <span aria-hidden="true" className="text-slate-300">·</span>
                    <span className="font-mono text-slate-600">
                      {formatActorLabel(item.actorUnit, item.actorName)}
                    </span>
                    <span aria-hidden="true" className="text-slate-300">·</span>
                    <span className="font-mono tabular-nums text-slate-500">
                      {formatDateTime(item.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-900">{item.summary}</p>
                </div>

                <div className="flex items-center gap-3 self-start sm:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => onNavigate(item.targetSection)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#0F2942] hover:underline whitespace-nowrap"
                  >
                    Open
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                  {isAdmin && (
                    <button
                      type="button"
                      aria-label={`Delete activity: ${item.summary}`}
                      onClick={() => void deleteActivity(item.id)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-[#C81E1E] border border-red-200 rounded-md hover:bg-red-50 whitespace-nowrap"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

