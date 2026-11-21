import React from 'react';
import {
  Activity,
  Bell,
  Building2,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  PhoneCall,
  ReceiptIndianRupee,
  Wrench,
  X,
} from 'lucide-react';
import type { NavSection, ResidentProfile } from '../types/society';

interface SidebarProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  resident: ResidentProfile;
  onSignOut: () => void;
  urgentNoticesCount: number;
  openMaintenanceCount: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: Array<{
  id: NavSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'bills', label: 'Bills & Expenses', icon: ReceiptIndianRupee },
  { id: 'notices', label: 'Notice Board', icon: Bell },
  { id: 'maintenance', label: 'Maintenance Tracker', icon: Wrench },
  { id: 'discussions', label: 'Discussions', icon: MessageSquare },
  { id: 'activity', label: 'My Activity', icon: Activity },
  { id: 'emergency', label: 'Emergency & Directory', icon: PhoneCall },
];

export function Sidebar({
  activeSection,
  onSelectSection,
  resident,
  onSignOut,
  urgentNoticesCount,
  openMaintenanceCount,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const navContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      {/* Brand Header */}
      <div className="h-16 px-5 border-b border-slate-200 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#0F2942] text-white flex items-center justify-center shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">Tower 3 HD Society</p>
            <p className="text-[11px] text-slate-500 truncate">OIL India Ltd., Duliajan</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation menu"
          className="lg:hidden p-1.5 text-slate-500 hover:text-slate-900 rounded-md"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav aria-label="Primary portal navigation" className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          const countLabel =
            item.id === 'notices' && urgentNoticesCount > 0
              ? `${urgentNoticesCount}`
              : item.id === 'maintenance' && openMaintenanceCount > 0
                ? `${openMaintenanceCount}`
                : null;

          return (
            <button
              key={item.id}
              type="button"
              aria-current={isActive ? 'page' : undefined}
              onClick={() => {
                onSelectSection(item.id);
                onCloseMobile();
              }}
              className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-[#0F2942] text-white'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-3 min-w-0">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span className="truncate">{item.label}</span>
              </span>
              {countLabel && (
                <span
                  className={`text-xs font-mono tabular-nums ${
                    isActive
                      ? 'text-slate-200'
                      : item.id === 'notices'
                        ? 'text-[#C81E1E] font-semibold'
                        : 'text-slate-500'
                  }`}
                >
                  {countLabel}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Resident / Admin Profile & Sign Out Footer */}
      <div className="p-4 border-t border-slate-200 space-y-3 shrink-0">
        <div className="space-y-0.5">
          <p className="text-sm font-semibold text-slate-900 truncate">{resident.fullName}</p>
          <p className="text-xs text-slate-500 font-mono tabular-nums">
            {resident.role === 'admin'
              ? 'Admin · Full Edit Access'
              : `Unit ${resident.unitNumber} · Floor ${resident.floor}`}
          </p>
        </div>
        <button
          type="button"
          onClick={onSignOut}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 h-screen sticky top-0">
        {navContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative w-72 max-w-[85vw] h-full z-10">{navContent}</div>
        </div>
      )}
    </>
  );
}
