import React, { useState } from 'react';
import { AlertTriangle, Bell, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { useSociety } from '../context/SocietyContext';
import type { NoticeCategory, NoticeItem, NoticePriority } from '../types/society';
import { formatDateTime, validateNoticeInput } from '../utils/billing';

const NOTICE_CATEGORIES: NoticeCategory[] = [
  'Emergency Work',
  'Maintenance',
  'Society Meeting',
  'General',
];

export function NoticeBoardView() {
  const { resident, isAdmin, notices, createNotice, updateNotice, deleteNotice } = useSociety();

  const [categoryFilter, setCategoryFilter] = useState<'All' | NoticeCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Create / Edit Notice Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingNotice, setEditingNotice] = useState<NoticeItem | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<NoticeCategory>('Emergency Work');
  const [priority, setPriority] = useState<NoticePriority>('urgent');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [content, setContent] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  if (!resident) return null;

  const filteredNotices = notices.filter((n) => {
    if (categoryFilter !== 'All' && n.category !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.authorName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleOpenCreate = (defaultCategory: NoticeCategory = 'Emergency Work') => {
    setEditingNotice(null);
    setTitle('');
    setContent('');
    setEffectiveDate('');
    setCategory(defaultCategory);
    setPriority(defaultCategory === 'Emergency Work' ? 'urgent' : 'normal');
    setErrors({});
    setShowCreateModal(true);
  };

  const handleOpenEdit = (notice: NoticeItem) => {
    setEditingNotice(notice);
    setTitle(notice.title);
    setCategory(notice.category);
    setPriority(notice.priority);
    setEffectiveDate(notice.effectiveDate);
    setContent(notice.content);
    setErrors({});
    setShowCreateModal(true);
  };

  const handleCreateOrEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateNoticeInput({ title, content, effectiveDate });
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      if (editingNotice) {
        await updateNotice(editingNotice.id, {
          title,
          content,
          category,
          priority,
          effectiveDate,
        });
      } else {
        await createNotice({
          title,
          content,
          category,
          priority,
          effectiveDate,
        });
      }
      setEditingNotice(null);
      setTitle('');
      setContent('');
      setEffectiveDate('');
      setShowCreateModal(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with prominent Create Notice button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Digital Notice Board</h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Official announcements, utility alerts, and emergency work notices for Units 049 – 072
          </p>
        </div>
        <button
          type="button"
          onClick={() => handleOpenCreate('Emergency Work')}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#0F2942] rounded-lg hover:bg-[#173B5E] transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          Create Notice
        </button>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
          {(['All', ...NOTICE_CATEGORIES] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                categoryFilter === cat
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            aria-label="Search notices"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notices..."
            className="w-full pl-9 pr-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F2942]"
          />
        </div>
      </div>

      {/* Notice Feed */}
      {filteredNotices.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <Bell className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-900 mb-1">No matching notices found</p>
          <p className="text-xs text-slate-500 mb-4">
            Create a notice to alert Tower 3 residents about emergency work or building updates.
          </p>
          <button
            type="button"
            onClick={() => handleOpenCreate('Emergency Work')}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0F2942] rounded-lg"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Notice
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredNotices.map((notice) => {
            const isEmergency =
              notice.category === 'Emergency Work' || notice.priority === 'urgent';
            const canModify = isAdmin || notice.authorUid === resident.uid;

            return (
              <article
                key={notice.id}
                className={`bg-white border rounded-xl p-6 ${
                  isEmergency ? 'border-red-200 bg-red-50/20' : 'border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span
                        className={`inline-flex items-center gap-1 font-semibold ${
                          isEmergency ? 'text-[#C81E1E]' : 'text-[#0F2942]'
                        }`}
                      >
                        {isEmergency && <AlertTriangle className="w-3.5 h-3.5" />}
                        {notice.category}
                        {notice.priority === 'urgent' ? ' · Urgent' : ''}
                      </span>
                      <span aria-hidden="true" className="text-slate-300">
                        ·
                      </span>
                      <span className="text-slate-600 font-medium">
                        Schedule: {notice.effectiveDate}
                      </span>
                      <span aria-hidden="true" className="text-slate-300">
                        ·
                      </span>
                      <span className="text-slate-500 font-mono tabular-nums">
                        Posted {formatDateTime(notice.createdAt)}
                      </span>
                    </div>

                    <h2 className="text-lg font-bold text-slate-900">{notice.title}</h2>
                  </div>

                  {canModify && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        aria-label={`Edit notice ${notice.title}`}
                        onClick={() => handleOpenEdit(notice)}
                        className="p-2 text-slate-500 hover:text-[#0F2942] rounded-lg transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete notice ${notice.title}`}
                        onClick={() => void deleteNotice(notice.id)}
                        className="p-2 text-slate-400 hover:text-[#C81E1E] rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <p className="text-sm text-slate-700 leading-relaxed mt-3 whitespace-pre-line">
                  {notice.content}
                </p>

                <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    Issued by{' '}
                    <span className="font-semibold text-slate-800">{notice.authorName}</span> ·{' '}
                    <span className="font-mono">
                      {notice.authorUnit === 'ADM' ? 'Admin' : `Unit ${notice.authorUnit}`}
                    </span>
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Create / Edit Notice Modal */}
      {showCreateModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-notice-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <h3 id="create-notice-title" className="text-lg font-bold text-slate-900">
                  {editingNotice
                    ? 'Edit Notice'
                    : 'Create Notice / Emergency Work Alert'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Visible immediately to all 24 residents of Tower 3
                </p>
              </div>
              <button
                type="button"
                aria-label="Close notice dialog"
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrEditSubmit} className="space-y-4 mt-4">
              <div>
                <label
                  htmlFor="notice-title"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Notice Title
                </label>
                <input
                  id="notice-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Emergency Gas Pipeline Valve Repair"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F2942]"
                />
                {errors.title && <p className="text-xs text-[#C81E1E] mt-1">{errors.title}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="notice-category"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Category
                  </label>
                  <select
                    id="notice-category"
                    value={category}
                    onChange={(e) => {
                      const next = e.target.value as NoticeCategory;
                      setCategory(next);
                      if (next === 'Emergency Work') setPriority('urgent');
                    }}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    {NOTICE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="notice-priority"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Priority
                  </label>
                  <select
                    id="notice-priority"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as NoticePriority)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="urgent">Urgent / Emergency</option>
                    <option value="normal">Normal Announcement</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="notice-effective-date"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Effective Date / Work Timing
                </label>
                <input
                  id="notice-effective-date"
                  type="text"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  placeholder="e.g., Today 3:00 PM – 5:00 PM"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F2942]"
                />
                {errors.effectiveDate && (
                  <p className="text-xs text-[#C81E1E] mt-1">{errors.effectiveDate}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="notice-content"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Announcement Details
                </label>
                <textarea
                  id="notice-content"
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Provide clear instructions, affected floors/units, and contact details..."
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F2942]"
                />
                {errors.content && (
                  <p className="text-xs text-[#C81E1E] mt-1">{errors.content}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-semibold text-white bg-[#0F2942] rounded-lg hover:bg-[#173B5E] disabled:opacity-60"
                >
                  {saving ? 'Saving...' : editingNotice ? 'Save Changes' : 'Publish Notice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
