import React, { useState } from 'react';
import { Check, Copy, MapPin, Pencil, Phone, ShieldAlert, UserCheck, X } from 'lucide-react';
import { useSociety } from '../context/SocietyContext';
import {
  EMERGENCY_CONTACTS,
  SOCIETY_ADDRESS,
  SOCIETY_NAME,
  TOWER_REPRESENTATIVES,
} from '../data/societyConstants';
import type { UnitDirectoryEntry } from '../types/society';

export function EmergencyContactsView() {
  const { unitRoster, isAdmin, updateUnitName } = useSociety();
  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<'all' | number>('all');

  // Admin unit name editor modal
  const [editingUnit, setEditingUnit] = useState<UnitDirectoryEntry | null>(null);
  const [draftName, setDraftName] = useState('');
  const [savingUnit, setSavingUnit] = useState(false);

  const handleCopy = async (num: string) => {
    try {
      await navigator.clipboard.writeText(num);
      setCopiedNumber(num);
      setTimeout(() => setCopiedNumber(null), 1800);
    } catch {
      // Clipboard API unavailable in restricted context
    }
  };

  const openUnitEditor = (unit: UnitDirectoryEntry) => {
    setEditingUnit(unit);
    setDraftName(unit.occupantName);
  };

  const handleSaveUnitName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUnit) return;
    setSavingUnit(true);
    try {
      await updateUnitName(editingUnit.unitNumber, draftName.trim());
      setEditingUnit(null);
      setDraftName('');
    } finally {
      setSavingUnit(false);
    }
  };

  const floors = [1, 2, 3, 4, 5, 6].filter((f) =>
    selectedFloor === 'all' ? true : f === selectedFloor
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Emergency Contacts & Tower 3 Directory
        </h1>
        <p className="text-sm text-slate-600 mt-0.5">
          Direct OIL India Ltd. emergency desks, Tower 3 representatives, and 24-unit floor directory
        </p>
      </div>

      {/* Emergency Helplines */}
      <section aria-label="Emergency Contact Numbers" className="space-y-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-[#C81E1E]" />
          <h2 className="text-lg font-bold text-slate-900">Emergency Contact Numbers</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {EMERGENCY_CONTACTS.map((contact) => (
            <div
              key={contact.id}
              className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between gap-4"
            >
              <div>
                <p className="text-xs font-semibold text-[#C81E1E] mb-1">{contact.availability}</p>
                <h3 className="text-lg font-bold text-slate-900">{contact.service}</h3>
                <p className="text-sm text-slate-600 mt-1">{contact.description}</p>
              </div>

              <div className="space-y-2 pt-3 border-t border-slate-200">
                {contact.numbers.map((num) => (
                  <div key={num} className="flex items-center justify-between gap-3">
                    <a
                      href={`tel:${num.replace(/[^0-9+]/g, '')}`}
                      className="inline-flex items-center gap-2 text-lg font-mono font-bold tabular-nums text-[#C81E1E] hover:underline"
                    >
                      <Phone className="w-4 h-4 shrink-0" />
                      {num}
                    </a>
                    <button
                      type="button"
                      onClick={() => void handleCopy(num)}
                      aria-label={`Copy ${contact.service} number ${num}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50"
                    >
                      {copiedNumber === num ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#15803D]" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Tower 3 Representatives & Official Address */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section
          aria-label="Tower 3 Representatives"
          className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-4"
        >
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
            <UserCheck className="w-5 h-5 text-[#0F2942]" />
            <h2 className="text-base font-bold text-slate-900">Tower 3 Representatives</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {TOWER_REPRESENTATIVES.map((rep) => (
              <div key={rep.id} className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <p className="text-xs text-slate-500">{rep.role}</p>
                <p className="text-base font-bold text-slate-900 mt-1">{rep.name}</p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <a
                    href={`tel:${rep.phone}`}
                    className="inline-flex items-center gap-1.5 text-sm font-mono font-bold tabular-nums text-[#0F2942] hover:underline"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    {rep.phone}
                  </a>
                  <button
                    type="button"
                    onClick={() => void handleCopy(rep.phone)}
                    aria-label={`Copy ${rep.name} phone number ${rep.phone}`}
                    className="p-1.5 text-slate-500 hover:text-slate-900 rounded-md"
                  >
                    {copiedNumber === rep.phone ? (
                      <Check className="w-3.5 h-3.5 text-[#15803D]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section
          aria-label="Official Society Address"
          className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
              <MapPin className="w-5 h-5 text-[#0F2942]" />
              <h2 className="text-base font-bold text-slate-900">Official Complex Address</h2>
            </div>
            <p className="text-sm font-bold text-slate-900 mt-4">{SOCIETY_NAME}</p>
            <address className="not-italic text-sm text-slate-700 leading-relaxed mt-2">
              {SOCIETY_ADDRESS}
            </address>
          </div>
          <p className="text-xs text-slate-500 pt-4 mt-4 border-t border-slate-200">
            OIL India Ltd. Resident Complex · 6 Floors · 4 Residents per Floor · Units 049 to 072
          </p>
        </section>
      </div>

      {/* 24-Unit Floor Directory (Units 049 to 072) */}
      <section
        aria-label="Tower 3 Floor Directory"
        className="bg-white border border-slate-200 rounded-xl overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Tower 3 Unit Directory (24 Units · 049 – 072)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isAdmin
                ? '4 units per floor across 6 residential floors · Admin can assign, edit, or clear unit names'
                : '4 units per floor across 6 residential floors'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setSelectedFloor('all')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap ${
                selectedFloor === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              All Floors
            </button>
            {[1, 2, 3, 4, 5, 6].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setSelectedFloor(f)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap ${
                  selectedFloor === f ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                F{f}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-slate-200">
          {floors.map((floor) => {
            const floorUnits = unitRoster.filter((u) => u.floor === floor);
            if (floorUnits.length === 0) return null;
            return (
              <div key={floor} className="p-6">
                <p className="text-xs font-semibold text-slate-500 mb-3">
                  Floor {floor} · Units {floorUnits[0].unitNumber} –{' '}
                  {floorUnits[floorUnits.length - 1].unitNumber}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {floorUnits.map((unit) => (
                    <div
                      key={unit.unitNumber}
                      className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-mono font-bold tabular-nums text-[#0F2942]">
                          Unit {unit.unitNumber}
                        </span>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => openUnitEditor(unit)}
                            aria-label={`Edit resident name for Unit ${unit.unitNumber}`}
                            className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-slate-700 border border-slate-300 bg-white rounded hover:bg-slate-100 whitespace-nowrap"
                          >
                            <Pencil className="w-3 h-3" />
                            Edit
                          </button>
                        )}
                      </div>
                      <p
                        className={`text-sm mt-1.5 ${
                          unit.occupantName
                            ? 'font-medium text-slate-900'
                            : 'text-slate-400 italic'
                        }`}
                      >
                        {unit.occupantName || 'Unassigned'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Admin Edit Unit Name Modal */}
      {editingUnit && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-directory-unit-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <h3 id="edit-directory-unit-title" className="text-lg font-bold text-slate-900">
                  Update Unit {editingUnit.unitNumber}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Floor {editingUnit.floor} · Leave blank to keep this unit unassigned
                </p>
              </div>
              <button
                type="button"
                aria-label="Close edit unit dialog"
                onClick={() => setEditingUnit(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUnitName} className="space-y-4 mt-4">
              <div>
                <label
                  htmlFor="directory-unit-name-input"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Resident Name (Optional)
                </label>
                <input
                  id="directory-unit-name-input"
                  type="text"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  placeholder="Enter resident name or leave empty"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F2942]"
                />
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                {draftName.trim() ? (
                  <button
                    type="button"
                    onClick={() => setDraftName('')}
                    className="text-xs font-semibold text-[#C81E1E] hover:underline"
                  >
                    Clear Name
                  </button>
                ) : (
                  <span />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingUnit(null)}
                    className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingUnit}
                    className="px-4 py-2 text-sm font-semibold text-white bg-[#0F2942] rounded-lg hover:bg-[#173B5E] disabled:opacity-60"
                  >
                    {savingUnit ? 'Saving...' : 'Save Unit'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

