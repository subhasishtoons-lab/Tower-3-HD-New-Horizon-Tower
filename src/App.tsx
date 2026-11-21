/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Menu, Phone } from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SocietyProvider, useSociety } from './context/SocietyContext';
import { AuthScreen } from './components/AuthScreen';
import { Sidebar } from './components/Sidebar';
import { OverviewView } from './components/OverviewView';
import { BillsExpensesView } from './components/BillsExpensesView';
import { NoticeBoardView } from './components/NoticeBoardView';
import { MaintenanceView } from './components/MaintenanceView';
import { DiscussionsView } from './components/DiscussionsView';
import { ActivityView } from './components/ActivityView';
import { EmergencyContactsView } from './components/EmergencyContactsView';
import { SOCIETY_ADDRESS, SOCIETY_NAME } from './data/societyConstants';
import type { NavSection } from './types/society';

const SECTION_LABELS: Record<NavSection, string> = {
  overview: 'Overview',
  bills: 'Bills & Expenses',
  notices: 'Notice Board',
  maintenance: 'Maintenance Tracker',
  discussions: 'Discussions',
  activity: 'My Activity',
  emergency: 'Emergency & Directory',
};

function PortalShell() {
  const { resident, authLoading, notices, maintenanceRequests, signOut } = useSociety();
  const [activeSection, setActiveSection] = useState<NavSection>('overview');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F6F7F9] flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <p className="text-sm font-semibold text-[#0F2942]">{SOCIETY_NAME}</p>
          <p className="text-xs text-slate-500">Loading resident portal...</p>
        </div>
      </div>
    );
  }

  if (!resident) {
    return <AuthScreen />;
  }

  const urgentNoticesCount = notices.filter(
    (n) => n.status === 'active' && (n.priority === 'urgent' || n.category === 'Emergency Work')
  ).length;
  const openMaintenanceCount = maintenanceRequests.filter((m) => m.status !== 'resolved').length;

  return (
    <div className="min-h-screen bg-[#F6F7F9] flex">
      <Sidebar
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        resident={resident}
        onSignOut={() => void signOut()}
        urgentNoticesCount={urgentNoticesCount}
        openMaintenanceCount={openMaintenanceCount}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Contextual Workspace Top Bar */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-slate-500 hidden sm:inline whitespace-nowrap">
                {resident.role === 'admin' ? 'Tower 3 Admin' : 'Tower 3'}
              </span>
              <span className="text-slate-300 hidden sm:inline" aria-hidden="true">
                /
              </span>
              <span className="font-semibold text-slate-900 truncate">
                {SECTION_LABELS[activeSection]}
              </span>
            </nav>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <button
              type="button"
              onClick={() => setActiveSection('emergency')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#C81E1E] border border-red-200 bg-red-50/70 rounded-lg hover:bg-red-100/70 transition-colors whitespace-nowrap"
            >
              <Phone className="w-3.5 h-3.5" />
              Emergency Numbers
            </button>
          </div>
        </header>

        {/* Main Content Viewport */}
        <main className="flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          {activeSection === 'overview' && <OverviewView onNavigate={setActiveSection} />}
          {activeSection === 'bills' && <BillsExpensesView />}
          {activeSection === 'notices' && <NoticeBoardView />}
          {activeSection === 'maintenance' && <MaintenanceView />}
          {activeSection === 'discussions' && <DiscussionsView />}
          {activeSection === 'activity' && <ActivityView onNavigate={setActiveSection} />}
          {activeSection === 'emergency' && <EmergencyContactsView />}
        </main>

        {/* Quiet Official Footer */}
        <footer className="border-t border-slate-200 bg-white px-4 sm:px-6 lg:px-8 py-4 mt-auto">
          <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
            <span>{SOCIETY_ADDRESS}</span>
            <span className="font-mono tabular-nums whitespace-nowrap">
              24 Units (049–072) · OIL India Ltd. Complex
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SocietyProvider>
        <PortalShell />
      </SocietyProvider>
    </ErrorBoundary>
  );
}
