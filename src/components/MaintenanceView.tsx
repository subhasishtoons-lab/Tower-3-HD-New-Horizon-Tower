import React, { useState } from 'react';
import { CheckCircle2, Pencil, Plus, Trash2, Wrench, X } from 'lucide-react';
import { useSociety } from '../context/SocietyContext';
import type {
  MaintenanceCategory,
  MaintenanceRequest,
  MaintenanceStatus,
  MaintenanceUrgency,
} from '../types/society';
import { formatDateTime, validateMaintenanceInput } from '../utils/billing';

const MAINTENANCE_CATEGORIES: MaintenanceCategory[] = [
  'Plumbing & Leakage',
  'Electrical Fixture',
  'Structural & Masonry',
  'Lift & Staircase',
  'Common Area & Gate',
];

const URGENCY_OPTIONS: MaintenanceUrgency[] = ['High', 'Medium', 'Low'];

export function MaintenanceView() {
  const {
    resident,
    isAdmin,
    maintenanceRequests,
    reportMaintenance,
    updateMaintenanceRequest,
    updateMaintenanceStatus,
    deleteMaintenanceRequest,
  } = useSociety();

  const [statusFilter, setStatusFilter] = useState<'all' | MaintenanceStatus>('all');
  const [showReportModal, setShowReportModal] = useState(false);
  const [editingRequest, setEditingRequest] = useState<MaintenanceRequest | null>(null);

  // Report / Full Edit Form
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState<MaintenanceCategory>('Structural & Masonry');
  const [urgency, setUrgency] = useState<MaintenanceUrgency>('High');
  const [description, setDescription] = useState('');
  const [editStatus, setEditStatus] = useState<MaintenanceStatus>('reported');
  const [editResolutionNote, setEditResolutionNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Resident Status Update Modal
  const [updatingItem, setUpdatingItem] = useState<MaintenanceRequest | null>(null);
  const [nextStatus, setNextStatus] = useState<MaintenanceStatus>('in_progress');
  const [resolutionNote, setResolutionNote] = useState('');

  if (!resident) return null;

  const filtered = maintenanceRequests.filter((m) =>
    statusFilter === 'all' ? true : m.status === statusFilter
  );

  const counts = {
    all: maintenanceRequests.length,
    reported: maintenanceRequests.filter((m) => m.status === 'reported').length,
    in_progress: maintenanceRequests.filter((m) => m.status === 'in_progress').length,
    resolved: maintenanceRequests.filter((m) => m.status === 'resolved').length,
  };

  const openReportNew = () => {
    setEditingRequest(null);
    setTitle('');
    setLocation('');
    setCategory('Structural & Masonry');
    setUrgency('High');
    setDescription('');
    setEditStatus('reported');
    setEditResolutionNote('');
    setErrors({});
    setShowReportModal(true);
  };

  const openEditRequest = (req: MaintenanceRequest) => {
    setEditingRequest(req);
    setTitle(req.title);
    setLocation(req.location);
    setCategory(req.category);
    setUrgency(req.urgency);
    setDescription(req.description);
    setEditStatus(req.status);
    setEditResolutionNote(req.resolutionNote);
    setErrors({});
    setShowReportModal(true);
  };

  const handleReportOrEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateMaintenanceInput({ title, location, description });
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      if (editingRequest) {
        await updateMaintenanceRequest(editingRequest.id, {
          title,
          location,
          category,
          urgency,
          description,
          status: editStatus,
          resolutionNote: editResolutionNote,
        });
      } else {
        await reportMaintenance({ title, location, category, urgency, description });
      }
      setEditingRequest(null);
      setTitle('');
      setLocation('');
      setDescription('');
      setShowReportModal(false);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updatingItem) return;
    setSaving(true);
    try {
      await updateMaintenanceStatus(updatingItem.id, nextStatus, resolutionNote);
      setUpdatingItem(null);
      setResolutionNote('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Maintenance Request Tracker</h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Report building damages, stairwell faults, or common-area repairs and track OIL wing
            resolution
          </p>
        </div>
        <button
          type="button"
          onClick={openReportNew}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#0F2942] rounded-lg hover:bg-[#173B5E] transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          Report Building Damage
        </button>
      </div>

      {/* Status Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
          {(
            [
              { id: 'all', label: `All (${counts.all})` },
              { id: 'reported', label: `Reported (${counts.reported})` },
              { id: 'in_progress', label: `In Progress (${counts.in_progress})` },
              { id: 'resolved', label: `Resolved (${counts.resolved})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500">
          Urgent utility faults: Electrical{' '}
          <span className="font-mono font-semibold text-slate-700">0374-2807396</span> · Gas/Water{' '}
          <span className="font-mono font-semibold text-slate-700">0374-2807222</span>
        </p>
      </div>

      {/* Request List */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <Wrench className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-900 mb-1">
            No maintenance requests in this view
          </p>
          <p className="text-xs text-slate-500 mb-4">
            Report any structural, plumbing, lift, or lighting damage to keep Tower 3 well
            maintained.
          </p>
          <button
            type="button"
            onClick={openReportNew}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0F2942] rounded-lg"
          >
            <Plus className="w-3.5 h-3.5" />
            Report Building Damage
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((req) => (
            <article key={req.id} className="bg-white border border-slate-200 rounded-xl p-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span
                      className={`font-semibold ${
                        req.status === 'resolved'
                          ? 'text-[#15803D]'
                          : req.status === 'in_progress'
                            ? 'text-[#B45309]'
                            : 'text-[#C81E1E]'
                      }`}
                    >
                      {req.status === 'resolved'
                        ? 'Resolved'
                        : req.status === 'in_progress'
                          ? 'In Progress'
                          : 'Reported'}
                    </span>
                    <span aria-hidden="true" className="text-slate-300">
                      ·
                    </span>
                    <span className="text-slate-700 font-medium">{req.category}</span>
                    <span aria-hidden="true" className="text-slate-300">
                      ·
                    </span>
                    <span
                      className={
                        req.urgency === 'High'
                          ? 'text-[#C81E1E] font-semibold'
                          : 'text-slate-600'
                      }
                    >
                      {req.urgency} Urgency
                    </span>
                    <span aria-hidden="true" className="text-slate-300">
                      ·
                    </span>
                    <span className="text-slate-500">{req.location}</span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">{req.title}</h2>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-start">
                  {isAdmin ? (
                    <>
                      <button
                        type="button"
                        aria-label={`Edit maintenance request ${req.title}`}
                        onClick={() => openEditRequest(req)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0F2942] border border-slate-300 rounded-lg hover:bg-slate-50"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Edit
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete maintenance request ${req.title}`}
                        onClick={() => void deleteMaintenanceRequest(req.id)}
                        className="p-2 text-slate-400 hover:text-[#C81E1E] rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  ) : req.status !== 'resolved' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setUpdatingItem(req);
                        setNextStatus(req.status === 'reported' ? 'in_progress' : 'resolved');
                        setResolutionNote(req.resolutionNote);
                      }}
                      className="px-3.5 py-2 text-xs font-semibold text-[#0F2942] border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
                    >
                      Update Status
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#15803D]">
                      <CheckCircle2 className="w-4 h-4" />
                      Closed
                    </span>
                  )}
                </div>
              </div>

              <p className="text-sm text-slate-700 leading-relaxed mt-3">{req.description}</p>

              {req.resolutionNote && (
                <div className="mt-4 p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
                  <span className="font-semibold text-slate-900">Progress / Resolution Note:</span>{' '}
                  {req.resolutionNote}
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span>
                  Reported by{' '}
                  <span className="font-semibold text-slate-800">{req.reporterName}</span> ·{' '}
                  <span className="font-mono">
                    {req.reporterUnit === 'ADM' ? 'Admin' : `Unit ${req.reporterUnit}`}
                  </span>
                </span>
                <span className="font-mono tabular-nums">
                  Logged {formatDateTime(req.createdAt)}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Report / Admin Edit Building Damage Modal */}
      {showReportModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-damage-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <h3 id="report-damage-title" className="text-lg font-bold text-slate-900">
                  {editingRequest
                    ? 'Edit Maintenance Request'
                    : 'Report Building Damage / Maintenance'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Logged for Tower 3 tracking & OIL Maintenance escalation
                </p>
              </div>
              <button
                type="button"
                aria-label="Close maintenance dialog"
                onClick={() => setShowReportModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReportOrEditSubmit} className="space-y-4 mt-4">
              <div>
                <label
                  htmlFor="mnt-title"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Damage / Issue Summary
                </label>
                <input
                  id="mnt-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Broken Staircase Handrail Bolt on Floor 3"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F2942]"
                />
                {errors.title && <p className="text-xs text-[#C81E1E] mt-1">{errors.title}</p>}
              </div>

              <div>
                <label
                  htmlFor="mnt-location"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Exact Location in Tower 3
                </label>
                <input
                  id="mnt-location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., Floor 3 Staircase Landing / Ground Bay / Terrace"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F2942]"
                />
                {errors.location && (
                  <p className="text-xs text-[#C81E1E] mt-1">{errors.location}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="mnt-category"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Category
                  </label>
                  <select
                    id="mnt-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as MaintenanceCategory)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    {MAINTENANCE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="mnt-urgency"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Urgency Level
                  </label>
                  <select
                    id="mnt-urgency"
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value as MaintenanceUrgency)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    {URGENCY_OPTIONS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="mnt-description"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Damage Description
                </label>
                <textarea
                  id="mnt-description"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what is damaged, safety concerns, and whether OIL wing was called..."
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F2942]"
                />
                {errors.description && (
                  <p className="text-xs text-[#C81E1E] mt-1">{errors.description}</p>
                )}
              </div>

              {editingRequest && (
                <>
                  <div>
                    <label
                      htmlFor="mnt-edit-status"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Status
                    </label>
                    <select
                      id="mnt-edit-status"
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as MaintenanceStatus)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="reported">Reported</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="mnt-edit-note"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Resolution / Action Note
                    </label>
                    <textarea
                      id="mnt-edit-note"
                      rows={2}
                      value={editResolutionNote}
                      onChange={(e) => setEditResolutionNote(e.target.value)}
                      placeholder="Progress update or completion remarks"
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F2942]"
                    />
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-semibold text-white bg-[#0F2942] rounded-lg hover:bg-[#173B5E] disabled:opacity-60"
                >
                  {saving ? 'Saving...' : editingRequest ? 'Save Changes' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resident Update Status Modal */}
      {updatingItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="update-mnt-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <h3 id="update-mnt-title" className="text-lg font-bold text-slate-900">
                Update Repair Status
              </h3>
              <button
                type="button"
                aria-label="Close update status dialog"
                onClick={() => setUpdatingItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStatusUpdate} className="space-y-4 mt-4">
              <p className="text-sm font-semibold text-slate-900">{updatingItem.title}</p>

              <div>
                <label
                  htmlFor="mnt-next-status"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  New Status
                </label>
                <select
                  id="mnt-next-status"
                  value={nextStatus}
                  onChange={(e) => setNextStatus(e.target.value as MaintenanceStatus)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  <option value="reported">Reported</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="mnt-res-note"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Action / Resolution Note
                </label>
                <textarea
                  id="mnt-res-note"
                  rows={3}
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="e.g., Reported to OIL Civil Maintenance, technician visited..."
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F2942]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setUpdatingItem(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-semibold text-white bg-[#0F2942] rounded-lg hover:bg-[#173B5E]"
                >
                  {saving ? 'Updating...' : 'Save Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
