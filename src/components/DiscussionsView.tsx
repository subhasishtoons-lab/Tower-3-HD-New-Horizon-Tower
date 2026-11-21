import React, { useEffect, useState } from 'react';
import { CheckCircle2, MessageSquare, Pencil, Plus, Send, Trash2, X } from 'lucide-react';
import { useSociety } from '../context/SocietyContext';
import type { DiscussionCategory, DiscussionTopic } from '../types/society';
import { formatDateTime, validateDiscussionInput } from '../utils/billing';

const DISCUSSION_CATEGORIES: DiscussionCategory[] = [
  'Cleanliness',
  'Parking & Entry',
  'Building Upkeep',
  'Security',
  'General',
];

function formatUnitAuthor(unit: string, name: string): string {
  if (unit === 'ADM') return name || 'Society Admin';
  const trimmed = name.trim();
  if (!trimmed || trimmed === `Unit ${unit}`) return `Unit ${unit}`;
  return `Unit ${unit} (${trimmed})`;
}

export function DiscussionsView() {
  const {
    resident,
    isAdmin,
    discussions,
    repliesByTopic,
    createDiscussion,
    updateDiscussion,
    deleteDiscussion,
    addDiscussionReply,
    deleteDiscussionReply,
    resolveDiscussion,
    subscribeTopicReplies,
  } = useSociety();

  const [categoryFilter, setCategoryFilter] = useState<'All' | DiscussionCategory>('All');
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(
    discussions[0]?.id ?? null
  );

  // Create / Edit Topic Modal
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [editingTopic, setEditingTopic] = useState<DiscussionTopic | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<DiscussionCategory>('Building Upkeep');
  const [body, setBody] = useState('');
  const [status, setStatus] = useState<'open' | 'resolved'>('open');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Reply box
  const [replyText, setReplyText] = useState('');
  const [replyError, setReplyError] = useState<string | null>(null);
  const [sendingReply, setSendingReply] = useState(false);

  const filtered = discussions.filter((d) =>
    categoryFilter === 'All' ? true : d.category === categoryFilter
  );

  const activeTopic =
    filtered.find((d) => d.id === selectedTopicId) ?? filtered[0] ?? null;

  useEffect(() => {
    if (!activeTopic) return;
    return subscribeTopicReplies(activeTopic.id);
  }, [activeTopic?.id, subscribeTopicReplies]);

  if (!resident) return null;

  const activeReplies = activeTopic ? repliesByTopic[activeTopic.id] ?? [] : [];

  const openCreateModal = () => {
    setEditingTopic(null);
    setTitle('');
    setCategory('Building Upkeep');
    setBody('');
    setStatus('open');
    setErrors({});
    setShowTopicModal(true);
  };

  const openEditModal = (topic: DiscussionTopic) => {
    setEditingTopic(topic);
    setTitle(topic.title);
    setCategory(topic.category);
    setBody(topic.body);
    setStatus(topic.status);
    setErrors({});
    setShowTopicModal(true);
  };

  const handleSaveTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateDiscussionInput({ title, body });
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      if (editingTopic) {
        await updateDiscussion(editingTopic.id, { title, category, body, status });
      } else {
        const newId = await createDiscussion({ title, category, body });
        if (newId) setSelectedTopicId(newId);
      }
      setTitle('');
      setBody('');
      setEditingTopic(null);
      setShowTopicModal(false);
    } finally {
      setSaving(false);
    }
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTopic) return;
    const trimmed = replyText.trim();
    if (trimmed.length < 2) {
      setReplyError('Enter a message of at least 2 characters.');
      return;
    }
    setReplyError(null);
    setSendingReply(true);
    try {
      await addDiscussionReply(activeTopic.id, trimmed);
      setReplyText('');
    } finally {
      setSendingReply(false);
    }
  };

  const canManageTopic =
    activeTopic !== null && (isAdmin || activeTopic.authorUid === resident.uid);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Common Issues Discussions</h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Open discussion topics with fellow Tower 3 residents on shared enclave matters
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#0F2942] rounded-lg hover:bg-[#173B5E] transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          New Discussion Topic
        </button>
      </div>

      {/* Category Filter */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
          {(['All', ...DISCUSSION_CATEGORIES] as const).map((cat) => (
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
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <MessageSquare className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-900 mb-1">No discussion topics yet</p>
          <p className="text-xs text-slate-500 mb-4">
            Start a topic to gather inputs from residents across Units 049 to 072.
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0F2942] rounded-lg"
          >
            <Plus className="w-3.5 h-3.5" />
            New Discussion Topic
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Topics List */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200">
              <p className="text-xs font-semibold text-slate-500">
                {filtered.length} Topic{filtered.length === 1 ? '' : 's'}
              </p>
            </div>
            <ul className="divide-y divide-slate-200">
              {filtered.map((topic) => {
                const isSelected = activeTopic?.id === topic.id;
                return (
                  <li key={topic.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedTopicId(topic.id)}
                      className={`w-full text-left p-5 transition-colors ${
                        isSelected ? 'bg-slate-100/90' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-xs mb-1">
                        <span className="font-semibold text-[#0F2942]">{topic.category}</span>
                        <span
                          className={`font-semibold ${
                            topic.status === 'resolved' ? 'text-[#15803D]' : 'text-slate-500'
                          }`}
                        >
                          {topic.status === 'resolved' ? 'Resolved' : 'Open'}
                        </span>
                      </div>
                      <span className="block text-sm font-bold text-slate-900 leading-snug">
                        {topic.title}
                      </span>
                      <p className="text-xs text-slate-500 mt-2 font-mono tabular-nums">
                        {formatUnitAuthor(topic.authorUnit, topic.authorName)} · {topic.replyCount}{' '}
                        repl{topic.replyCount === 1 ? 'y' : 'ies'}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Active Topic Thread */}
          {activeTopic && (
            <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="p-6 border-b border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-semibold text-[#0F2942]">{activeTopic.category}</span>
                      <span aria-hidden="true" className="text-slate-300">·</span>
                      <span
                        className={`font-semibold ${
                          activeTopic.status === 'resolved' ? 'text-[#15803D]' : 'text-[#B45309]'
                        }`}
                      >
                        {activeTopic.status === 'resolved' ? 'Resolved' : 'Open Discussion'}
                      </span>
                      <span aria-hidden="true" className="text-slate-300">·</span>
                      <span className="text-slate-500 font-mono tabular-nums">
                        {formatDateTime(activeTopic.createdAt)}
                      </span>
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">{activeTopic.title}</h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {activeTopic.status === 'open' &&
                      (canManageTopic || resident.role === 'representative') && (
                        <button
                          type="button"
                          onClick={() => void resolveDiscussion(activeTopic.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#15803D] border border-emerald-200 bg-emerald-50 rounded-lg hover:bg-emerald-100 whitespace-nowrap"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Mark Resolved
                        </button>
                      )}
                    {canManageTopic && (
                      <>
                        <button
                          type="button"
                          onClick={() => openEditModal(activeTopic)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 whitespace-nowrap"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteDiscussion(activeTopic.id)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-[#C81E1E] border border-red-200 rounded-lg hover:bg-red-50 whitespace-nowrap"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <p className="text-sm text-slate-700 leading-relaxed mt-4 whitespace-pre-line">
                  {activeTopic.body}
                </p>
                <p className="text-xs text-slate-500 mt-4">
                  Started by{' '}
                  <span className="font-semibold text-slate-800">
                    {formatUnitAuthor(activeTopic.authorUnit, activeTopic.authorName)}
                  </span>
                </p>
              </div>

              {/* Replies List */}
              <div className="p-6 space-y-4">
                <h3 className="text-xs font-semibold text-slate-500">
                  Resident Replies ({activeReplies.length})
                </h3>

                {activeReplies.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No replies yet. Share your view or suggestion below.
                  </p>
                ) : (
                  <ul className="space-y-4">
                    {activeReplies.map((rep) => {
                      const canDeleteReply = isAdmin || rep.authorUid === resident.uid;
                      return (
                        <li
                          key={rep.id}
                          className="p-4 bg-slate-50 border border-slate-200 rounded-lg"
                        >
                          <div className="flex items-center justify-between gap-2 text-xs mb-1.5">
                            <span className="font-semibold text-slate-900">
                              {formatUnitAuthor(rep.authorUnit, rep.authorName)}
                            </span>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-slate-500 font-mono tabular-nums">
                                {formatDateTime(rep.createdAt)}
                              </span>
                              {canDeleteReply && (
                                <button
                                  type="button"
                                  aria-label={`Delete reply by ${rep.authorName}`}
                                  onClick={() =>
                                    void deleteDiscussionReply(activeTopic.id, rep.id)
                                  }
                                  className="p-1 text-slate-400 hover:text-[#C81E1E] rounded transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-slate-700 leading-relaxed">{rep.body}</p>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {/* Reply Composer */}
                {activeTopic.status === 'open' ? (
                  <form onSubmit={handleReplySubmit} className="pt-4 border-t border-slate-200">
                    <label
                      htmlFor="discussion-reply-input"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      {isAdmin
                        ? 'Post a Reply as Society Admin'
                        : `Post a Reply as Unit ${resident.unitNumber}`}
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <input
                        id="discussion-reply-input"
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Write your reply to fellow residents..."
                        className="flex-1 px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F2942]"
                      />
                      <button
                        type="submit"
                        disabled={sendingReply}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#0F2942] rounded-lg hover:bg-[#173B5E] disabled:opacity-60 whitespace-nowrap"
                      >
                        <Send className="w-4 h-4" />
                        {sendingReply ? 'Posting...' : 'Post Reply'}
                      </button>
                    </div>
                    {replyError && <p className="text-xs text-[#C81E1E] mt-1">{replyError}</p>}
                  </form>
                ) : (
                  <p className="pt-4 border-t border-slate-200 text-xs text-slate-500">
                    This discussion topic has been marked resolved.
                  </p>
                )}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Create / Edit Topic Modal */}
      {showTopicModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="topic-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <h3 id="topic-modal-title" className="text-lg font-bold text-slate-900">
                  {editingTopic ? 'Edit Discussion Topic' : 'Open Common Issue Discussion'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Visible to all Tower 3 residents (Units 049 – 072)
                </p>
              </div>
              <button
                type="button"
                aria-label="Close discussion dialog"
                onClick={() => {
                  setEditingTopic(null);
                  setShowTopicModal(false);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTopic} className="space-y-4 mt-4">
              <div>
                <label
                  htmlFor="topic-title"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Topic Title
                </label>
                <input
                  id="topic-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Visitor Two-Wheeler Parking Alignment Near Gate"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F2942]"
                />
                {errors.title && <p className="text-xs text-[#C81E1E] mt-1">{errors.title}</p>}
              </div>

              <div className={editingTopic ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : ''}>
                <div>
                  <label
                    htmlFor="topic-category"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Category
                  </label>
                  <select
                    id="topic-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as DiscussionCategory)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    {DISCUSSION_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {editingTopic && (
                  <div>
                    <label
                      htmlFor="topic-status"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Status
                    </label>
                    <select
                      id="topic-status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value as 'open' | 'resolved')}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="open">Open</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="topic-body"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Details & Suggestion
                </label>
                <textarea
                  id="topic-body"
                  rows={4}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Explain the common issue and propose how Tower 3 residents can solve it together..."
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F2942]"
                />
                {errors.body && <p className="text-xs text-[#C81E1E] mt-1">{errors.body}</p>}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingTopic(null);
                    setShowTopicModal(false);
                  }}
                  className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-semibold text-white bg-[#0F2942] rounded-lg hover:bg-[#173B5E] disabled:opacity-60"
                >
                  {saving
                    ? 'Saving...'
                    : editingTopic
                      ? 'Save Changes'
                      : 'Publish Topic'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

