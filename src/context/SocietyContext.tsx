import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../firebase';
import {
  ADMIN_DEFAULT_PASSCODE,
  BOOTSTRAPPED_ADMIN_EMAIL,
  CURRENT_BILLING_MONTH,
  DEFAULT_UNIT_ROSTER,
  SEED_ACTIVITIES,
  SEED_DISCUSSIONS,
  SEED_EXPENSES,
  SEED_MAINTENANCE,
  SEED_NOTICES,
  SEED_PAYMENTS,
  SOCIETY_ID,
} from '../data/societyConstants';
import type {
  ActivityActionType,
  ActivityEntry,
  DiscussionCategory,
  DiscussionReply,
  DiscussionTopic,
  ExpenseCategory,
  ExpenseItem,
  MaintenanceCategory,
  MaintenanceRequest,
  MaintenanceStatus,
  MaintenanceUrgency,
  NoticeCategory,
  NoticeItem,
  NoticePriority,
  PaymentMethod,
  PaymentRecord,
  ResidentProfile,
  UnitDirectoryEntry,
} from '../types/society';
import { getFloorForUnit, roundCurrency } from '../utils/billing';

interface StoredLocalAccount {
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  unitNumber: string;
  floor: number;
  role: 'resident' | 'representative' | 'admin';
  passcode: string;
  createdAt: string;
}

interface LocalSocietyStore {
  unitRoster: UnitDirectoryEntry[];
  notices: NoticeItem[];
  expenses: ExpenseItem[];
  payments: PaymentRecord[];
  maintenanceRequests: MaintenanceRequest[];
  discussions: DiscussionTopic[];
  activities: ActivityEntry[];
}

// Bumped storage keys so any cached names on units 049-072 are cleanly cleared
const LOCAL_STORE_KEY = 'tower3_society_store_v2';
const LOCAL_ACCOUNTS_KEY = 'tower3_resident_accounts_v2';
const LOCAL_SESSION_KEY = 'tower3_active_session_v2';

function createSafeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now()}-${rand}`;
}

function timestampToIso(value: unknown): string {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (typeof value === 'string') return value;
  return new Date().toISOString();
}

function loadLocalStore(): LocalSocietyStore {
  try {
    const raw = localStorage.getItem(LOCAL_STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<LocalSocietyStore>;
      return {
        unitRoster:
          parsed.unitRoster && parsed.unitRoster.length === 24
            ? parsed.unitRoster
            : DEFAULT_UNIT_ROSTER,
        notices: parsed.notices ?? SEED_NOTICES,
        expenses: parsed.expenses ?? SEED_EXPENSES,
        payments: parsed.payments ?? SEED_PAYMENTS,
        maintenanceRequests: parsed.maintenanceRequests ?? SEED_MAINTENANCE,
        discussions: parsed.discussions ?? SEED_DISCUSSIONS,
        activities: parsed.activities ?? SEED_ACTIVITIES,
      };
    }
  } catch {
    // fallback to seed
  }
  return {
    unitRoster: DEFAULT_UNIT_ROSTER,
    notices: SEED_NOTICES,
    expenses: SEED_EXPENSES,
    payments: SEED_PAYMENTS,
    maintenanceRequests: SEED_MAINTENANCE,
    discussions: SEED_DISCUSSIONS,
    activities: SEED_ACTIVITIES,
  };
}

function saveLocalStore(store: LocalSocietyStore) {
  try {
    localStorage.setItem(LOCAL_STORE_KEY, JSON.stringify(store));
  } catch {
    // ignore storage quota
  }
}

function loadLocalAccounts(): StoredLocalAccount[] {
  try {
    const raw = localStorage.getItem(LOCAL_ACCOUNTS_KEY);
    if (raw) {
      return JSON.parse(raw) as StoredLocalAccount[];
    }
  } catch {
    // ignore
  }
  return DEFAULT_UNIT_ROSTER.map((u) => ({
    uid: `local-${u.unitNumber}`,
    fullName: `Unit ${u.unitNumber}`,
    email: '',
    phone: `9864000${u.unitNumber}`,
    unitNumber: u.unitNumber,
    floor: u.floor,
    role: 'resident',
    passcode: 'tower3',
    createdAt: '2026-01-01T00:00:00.000Z',
  }));
}

function saveLocalAccounts(accounts: StoredLocalAccount[]) {
  try {
    localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch {
    // ignore
  }
}

export interface SocietyContextValue {
  resident: ResidentProfile | null;
  isAdmin: boolean;
  pendingGoogleUser: FirebaseUser | null;
  authLoading: boolean;
  authError: string | null;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  unitRoster: UnitDirectoryEntry[];
  notices: NoticeItem[];
  expenses: ExpenseItem[];
  payments: PaymentRecord[];
  maintenanceRequests: MaintenanceRequest[];
  discussions: DiscussionTopic[];
  activities: ActivityEntry[];
  repliesByTopic: Record<string, DiscussionReply[]>;
  signInWithGoogle: () => Promise<void>;
  signInAsAdminWithGoogle: () => Promise<void>;
  completeGoogleRegistration: (data: {
    fullName: string;
    unitNumber: string;
    phone: string;
  }) => Promise<void>;
  loginWithUnitPasscode: (unitNumber: string, passcode: string) => { ok: boolean; error?: string };
  loginAsAdmin: (adminId: string, passcode: string) => { ok: boolean; error?: string };
  signupWithUnit: (data: {
    fullName: string;
    unitNumber: string;
    email: string;
    phone: string;
    passcode: string;
  }) => { ok: boolean; error?: string };
  signOut: () => Promise<void>;
  updateUnitName: (unitNumber: string, occupantName: string) => Promise<void>;
  createNotice: (data: {
    title: string;
    content: string;
    category: NoticeCategory;
    priority: NoticePriority;
    effectiveDate: string;
  }) => Promise<void>;
  updateNotice: (
    noticeId: string,
    data: {
      title: string;
      content: string;
      category: NoticeCategory;
      priority: NoticePriority;
      effectiveDate: string;
    }
  ) => Promise<void>;
  deleteNotice: (noticeId: string) => Promise<void>;
  addExpense: (data: {
    title: string;
    category: ExpenseCategory;
    amount: number;
    month: string;
    description: string;
  }) => Promise<void>;
  updateExpense: (
    expenseId: string,
    data: {
      title: string;
      category: ExpenseCategory;
      amount: number;
      month: string;
      description: string;
    }
  ) => Promise<void>;
  deleteExpense: (expenseId: string) => Promise<void>;
  payDues: (data: {
    month: string;
    unitNumber?: string;
    residentName?: string;
    cleanerShare: number;
    extraExpensesShare: number;
    totalAmount: number;
    paymentMethod: PaymentMethod;
    referenceNumber: string;
  }) => Promise<void>;
  deletePayment: (paymentId: string) => Promise<void>;
  reportMaintenance: (data: {
    title: string;
    location: string;
    category: MaintenanceCategory;
    urgency: MaintenanceUrgency;
    description: string;
  }) => Promise<void>;
  updateMaintenanceRequest: (
    requestId: string,
    data: {
      title: string;
      location: string;
      category: MaintenanceCategory;
      urgency: MaintenanceUrgency;
      description: string;
      status: MaintenanceStatus;
      resolutionNote: string;
    }
  ) => Promise<void>;
  updateMaintenanceStatus: (
    requestId: string,
    status: MaintenanceStatus,
    resolutionNote: string
  ) => Promise<void>;
  deleteMaintenanceRequest: (requestId: string) => Promise<void>;
  createDiscussion: (data: {
    title: string;
    category: DiscussionCategory;
    body: string;
  }) => Promise<string>;
  updateDiscussion: (
    topicId: string,
    data: {
      title: string;
      category: DiscussionCategory;
      body: string;
      status: 'open' | 'resolved';
    }
  ) => Promise<void>;
  deleteDiscussion: (topicId: string) => Promise<void>;
  addDiscussionReply: (topicId: string, body: string) => Promise<void>;
  deleteDiscussionReply: (topicId: string, replyId: string) => Promise<void>;
  resolveDiscussion: (topicId: string) => Promise<void>;
  deleteActivity: (activityId: string) => Promise<void>;
  subscribeTopicReplies: (topicId: string) => () => void;
}

const SocietyContext = createContext<SocietyContextValue | null>(null);

export function SocietyProvider({ children }: { children: React.ReactNode }) {
  const [resident, setResident] = useState<ResidentProfile | null>(null);
  const [pendingGoogleUser, setPendingGoogleUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(CURRENT_BILLING_MONTH);

  const [localStore, setLocalStore] = useState<LocalSocietyStore>(() => loadLocalStore());
  const [fbUnitDirectory, setFbUnitDirectory] = useState<Record<string, string>>({});
  const [fbNotices, setFbNotices] = useState<NoticeItem[]>([]);
  const [fbExpenses, setFbExpenses] = useState<ExpenseItem[]>([]);
  const [fbPayments, setFbPayments] = useState<PaymentRecord[]>([]);
  const [fbMaintenance, setFbMaintenance] = useState<MaintenanceRequest[]>([]);
  const [fbDiscussions, setFbDiscussions] = useState<DiscussionTopic[]>([]);
  const [fbActivities, setFbActivities] = useState<ActivityEntry[]>([]);
  const [fbRepliesByTopic, setFbRepliesByTopic] = useState<Record<string, DiscussionReply[]>>({});

  // Restore local session or ?autostart=1 on boot, and listen to Firebase Auth
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const autostart = params.get('autostart');

    if (autostart === 'admin') {
      const adminProfile: ResidentProfile = {
        uid: 'admin-tower3',
        fullName: 'Society Administrator',
        email: BOOTSTRAPPED_ADMIN_EMAIL,
        phone: '8876358668',
        unitNumber: 'ADM',
        floor: 0,
        role: 'admin',
        authMode: 'local',
        createdAt: '2026-01-01T00:00:00.000Z',
      };
      setResident(adminProfile);
      setAuthLoading(false);
    } else if (autostart === '1') {
      const demoResident: ResidentProfile = {
        uid: 'local-054',
        fullName: 'Unit 054',
        email: '',
        phone: '9864000054',
        unitNumber: '054',
        floor: 2,
        role: 'resident',
        authMode: 'local',
        createdAt: '2026-01-01T00:00:00.000Z',
      };
      setResident(demoResident);
      setAuthLoading(false);
    } else {
      try {
        const savedSession = localStorage.getItem(LOCAL_SESSION_KEY);
        if (savedSession) {
          const parsed = JSON.parse(savedSession) as ResidentProfile;
          if (parsed && parsed.uid && parsed.unitNumber) {
            setResident(parsed);
          }
        }
      } catch {
        // ignore invalid saved session
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      try {
        if (fbUser) {
          const isBootstrappedAdmin =
            fbUser.emailVerified && fbUser.email === BOOTSTRAPPED_ADMIN_EMAIL;
          try {
            const ref = doc(db, 'residents', fbUser.uid);
            const snap = await getDoc(ref);
            if (snap.exists()) {
              const d = snap.data();
              const role = isBootstrappedAdmin
                ? 'admin'
                : d.role === 'admin'
                  ? 'admin'
                  : d.role === 'representative'
                    ? 'representative'
                    : 'resident';
              const profile: ResidentProfile = {
                uid: fbUser.uid,
                fullName: String(d.fullName ?? fbUser.displayName ?? 'Resident'),
                email: String(d.email ?? fbUser.email ?? ''),
                phone: String(d.phone ?? ''),
                unitNumber: String(d.unitNumber ?? (role === 'admin' ? 'ADM' : '049')),
                floor: Number(d.floor ?? 0),
                role,
                authMode: 'firebase',
                createdAt: timestampToIso(d.createdAt),
              };
              setPendingGoogleUser(null);
              setResident(profile);
            } else if (isBootstrappedAdmin) {
              const adminProfile: ResidentProfile = {
                uid: fbUser.uid,
                fullName: fbUser.displayName || 'Society Administrator',
                email: fbUser.email || BOOTSTRAPPED_ADMIN_EMAIL,
                phone: '8876358668',
                unitNumber: 'ADM',
                floor: 0,
                role: 'admin',
                authMode: 'firebase',
                createdAt: new Date().toISOString(),
              };
              setPendingGoogleUser(null);
              setResident(adminProfile);
            } else {
              setPendingGoogleUser(fbUser);
              setResident(null);
            }
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            const isOffline =
              msg.includes('client is offline') ||
              msg.includes('unavailable') ||
              msg.includes('Failed to get document');
            if (isOffline) {
              if (isBootstrappedAdmin) {
                setPendingGoogleUser(null);
                setResident({
                  uid: fbUser.uid,
                  fullName: fbUser.displayName || 'Society Administrator',
                  email: fbUser.email || BOOTSTRAPPED_ADMIN_EMAIL,
                  phone: '8876358668',
                  unitNumber: 'ADM',
                  floor: 0,
                  role: 'admin',
                  authMode: 'firebase',
                  createdAt: new Date().toISOString(),
                });
              } else {
                setAuthError(
                  'Unable to reach Cloud Firestore right now. Please check your network connection or use Resident Unit Login.'
                );
              }
            } else {
              handleFirestoreError(err, OperationType.GET, `residents/${fbUser.uid}`);
            }
          }
        }
      } finally {
        setAuthLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Attach real-time Firestore listeners ONLY when authenticated via Firebase
  useEffect(() => {
    if (!resident || resident.authMode !== 'firebase') {
      return;
    }

    const unsubs: Array<() => void> = [];

    const directoryQuery = query(
      collection(db, 'unitDirectory'),
      where('societyId', '==', SOCIETY_ID)
    );
    unsubs.push(
      onSnapshot(
        directoryQuery,
        (snap) => {
          const map: Record<string, string> = {};
          for (const d of snap.docs) {
            const data = d.data();
            map[d.id] = String(data.occupantName ?? '');
          }
          setFbUnitDirectory(map);
        },
        (error) => handleFirestoreError(error, OperationType.LIST, 'unitDirectory')
      )
    );

    const noticesQuery = query(collection(db, 'notices'), where('societyId', '==', SOCIETY_ID));
    unsubs.push(
      onSnapshot(
        noticesQuery,
        (snap) => {
          const list: NoticeItem[] = snap.docs
            .map((d) => {
              const data = d.data();
              return {
                id: d.id,
                societyId: SOCIETY_ID,
                title: String(data.title ?? ''),
                content: String(data.content ?? ''),
                category: data.category as NoticeCategory,
                priority: data.priority as NoticePriority,
                effectiveDate: String(data.effectiveDate ?? ''),
                authorUid: String(data.authorUid ?? ''),
                authorName: String(data.authorName ?? ''),
                authorUnit: String(data.authorUnit ?? 'ADM'),
                status: (data.status as 'active' | 'archived') ?? 'active',
                createdAt: timestampToIso(data.createdAt),
              };
            })
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
          setFbNotices(list);
        },
        (error) => handleFirestoreError(error, OperationType.LIST, 'notices')
      )
    );

    const expensesQuery = query(collection(db, 'expenses'), where('societyId', '==', SOCIETY_ID));
    unsubs.push(
      onSnapshot(
        expensesQuery,
        (snap) => {
          const list: ExpenseItem[] = snap.docs
            .map((d) => {
              const data = d.data();
              return {
                id: d.id,
                societyId: SOCIETY_ID,
                title: String(data.title ?? ''),
                category: data.category as ExpenseCategory,
                amount: Number(data.amount ?? 0),
                perUnitShare: Number(data.perUnitShare ?? 0),
                month: String(data.month ?? CURRENT_BILLING_MONTH),
                description: String(data.description ?? ''),
                addedByUid: String(data.addedByUid ?? ''),
                addedByName: String(data.addedByName ?? ''),
                addedByUnit: String(data.addedByUnit ?? 'ADM'),
                createdAt: timestampToIso(data.createdAt),
              };
            })
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
          setFbExpenses(list);
        },
        (error) => handleFirestoreError(error, OperationType.LIST, 'expenses')
      )
    );

    const paymentsQuery = query(collection(db, 'payments'), where('societyId', '==', SOCIETY_ID));
    unsubs.push(
      onSnapshot(
        paymentsQuery,
        (snap) => {
          const list: PaymentRecord[] = snap.docs
            .map((d) => {
              const data = d.data();
              return {
                id: d.id,
                societyId: SOCIETY_ID,
                month: String(data.month ?? CURRENT_BILLING_MONTH),
                unitNumber: String(data.unitNumber ?? '049'),
                residentUid: String(data.residentUid ?? ''),
                residentName: String(data.residentName ?? ''),
                cleanerShare: Number(data.cleanerShare ?? 0),
                extraExpensesShare: Number(data.extraExpensesShare ?? 0),
                totalAmount: Number(data.totalAmount ?? 0),
                paymentMethod: data.paymentMethod as PaymentMethod,
                referenceNumber: String(data.referenceNumber ?? ''),
                status: 'paid' as const,
                createdAt: timestampToIso(data.createdAt),
              };
            })
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
          setFbPayments(list);
        },
        (error) => handleFirestoreError(error, OperationType.LIST, 'payments')
      )
    );

    const maintenanceQuery = query(
      collection(db, 'maintenanceRequests'),
      where('societyId', '==', SOCIETY_ID)
    );
    unsubs.push(
      onSnapshot(
        maintenanceQuery,
        (snap) => {
          const list: MaintenanceRequest[] = snap.docs
            .map((d) => {
              const data = d.data();
              return {
                id: d.id,
                societyId: SOCIETY_ID,
                title: String(data.title ?? ''),
                location: String(data.location ?? ''),
                category: data.category as MaintenanceCategory,
                urgency: data.urgency as MaintenanceUrgency,
                description: String(data.description ?? ''),
                status: (data.status as MaintenanceStatus) ?? 'reported',
                resolutionNote: String(data.resolutionNote ?? ''),
                reporterUid: String(data.reporterUid ?? ''),
                reporterName: String(data.reporterName ?? ''),
                reporterUnit: String(data.reporterUnit ?? 'ADM'),
                createdAt: timestampToIso(data.createdAt),
                updatedAt: timestampToIso(data.updatedAt),
              };
            })
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
          setFbMaintenance(list);
        },
        (error) => handleFirestoreError(error, OperationType.LIST, 'maintenanceRequests')
      )
    );

    const discussionsQuery = query(
      collection(db, 'discussions'),
      where('societyId', '==', SOCIETY_ID)
    );
    unsubs.push(
      onSnapshot(
        discussionsQuery,
        (snap) => {
          const list: DiscussionTopic[] = snap.docs
            .map((d) => {
              const data = d.data();
              return {
                id: d.id,
                societyId: SOCIETY_ID,
                title: String(data.title ?? ''),
                category: data.category as DiscussionCategory,
                body: String(data.body ?? ''),
                authorUid: String(data.authorUid ?? ''),
                authorName: String(data.authorName ?? ''),
                authorUnit: String(data.authorUnit ?? 'ADM'),
                status: (data.status as 'open' | 'resolved') ?? 'open',
                replyCount: Number(data.replyCount ?? 0),
                createdAt: timestampToIso(data.createdAt),
                updatedAt: timestampToIso(data.updatedAt),
              };
            })
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
          setFbDiscussions(list);
        },
        (error) => handleFirestoreError(error, OperationType.LIST, 'discussions')
      )
    );

    const activitiesQuery = query(
      collection(db, 'activities'),
      where('societyId', '==', SOCIETY_ID),
      where('scope', '==', 'society')
    );
    unsubs.push(
      onSnapshot(
        activitiesQuery,
        (snap) => {
          const list: ActivityEntry[] = snap.docs
            .map((d) => {
              const data = d.data();
              return {
                id: d.id,
                societyId: SOCIETY_ID,
                scope: (data.scope as 'personal' | 'society') ?? 'society',
                actorUid: String(data.actorUid ?? ''),
                actorName: String(data.actorName ?? ''),
                actorUnit: String(data.actorUnit ?? 'ADM'),
                actionType: data.actionType as ActivityActionType,
                summary: String(data.summary ?? ''),
                targetSection: data.targetSection as ActivityEntry['targetSection'],
                createdAt: timestampToIso(data.createdAt),
              };
            })
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
          setFbActivities(list);
        },
        (error) => handleFirestoreError(error, OperationType.LIST, 'activities')
      )
    );

    return () => {
      for (const unsub of unsubs) unsub();
    };
  }, [resident]);

  const updateLocalStore = useCallback((updater: (prev: LocalSocietyStore) => LocalSocietyStore) => {
    setLocalStore((prev) => {
      const next = updater(prev);
      saveLocalStore(next);
      return next;
    });
  }, []);

  const recordActivity = useCallback(
    async (
      actor: ResidentProfile,
      actionType: ActivityActionType,
      summary: string,
      targetSection: ActivityEntry['targetSection']
    ) => {
      const safeSummary = summary.slice(0, 295);
      if (actor.authMode === 'firebase') {
        const id = createSafeId('act');
        try {
          await setDoc(doc(db, 'activities', id), {
            societyId: SOCIETY_ID,
            scope: 'society',
            actorUid: actor.uid,
            actorName: actor.fullName.slice(0, 100),
            actorUnit: actor.unitNumber,
            actionType,
            summary: safeSummary,
            targetSection,
            createdAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `activities/${id}`);
        }
      } else {
        const entry: ActivityEntry = {
          id: createSafeId('act'),
          societyId: SOCIETY_ID,
          scope: 'society',
          actorUid: actor.uid,
          actorName: actor.fullName,
          actorUnit: actor.unitNumber,
          actionType,
          summary: safeSummary,
          targetSection,
          createdAt: new Date().toISOString(),
        };
        updateLocalStore((prev) => ({
          ...prev,
          activities: [entry, ...prev.activities],
        }));
      }
    },
    [updateLocalStore]
  );

  // --- Auth Flows ---

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;
      const isBootstrappedAdmin =
        fbUser.emailVerified && fbUser.email === BOOTSTRAPPED_ADMIN_EMAIL;
      const ref = doc(db, 'residents', fbUser.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const d = snap.data();
        const role = isBootstrappedAdmin
          ? 'admin'
          : d.role === 'admin'
            ? 'admin'
            : d.role === 'representative'
              ? 'representative'
              : 'resident';
        setResident({
          uid: fbUser.uid,
          fullName: String(d.fullName ?? fbUser.displayName ?? 'Resident'),
          email: String(d.email ?? fbUser.email ?? ''),
          phone: String(d.phone ?? ''),
          unitNumber: String(d.unitNumber ?? (role === 'admin' ? 'ADM' : '049')),
          floor: Number(d.floor ?? 0),
          role,
          authMode: 'firebase',
          createdAt: timestampToIso(d.createdAt),
        });
        setPendingGoogleUser(null);
      } else {
        setPendingGoogleUser(fbUser);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google Sign-In failed.';
      setAuthError(msg);
    }
  }, []);

  const signInAsAdminWithGoogle = useCallback(async () => {
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;
      if (!fbUser.emailVerified || fbUser.email !== BOOTSTRAPPED_ADMIN_EMAIL) {
        const adminDoc = await getDoc(doc(db, 'admins', fbUser.uid));
        if (!adminDoc.exists()) {
          await firebaseSignOut(auth);
          setAuthError(
            `Google account ${fbUser.email ?? ''} is not registered as a Tower 3 Administrator.`
          );
          return;
        }
      }
      setResident({
        uid: fbUser.uid,
        fullName: fbUser.displayName || 'Society Administrator',
        email: fbUser.email || BOOTSTRAPPED_ADMIN_EMAIL,
        phone: '8876358668',
        unitNumber: 'ADM',
        floor: 0,
        role: 'admin',
        authMode: 'firebase',
        createdAt: new Date().toISOString(),
      });
      setPendingGoogleUser(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google Admin Sign-In failed.';
      setAuthError(msg);
    }
  }, []);

  const completeGoogleRegistration = useCallback(
    async (data: { fullName: string; unitNumber: string; phone: string }) => {
      if (!pendingGoogleUser) return;
      const floor = getFloorForUnit(data.unitNumber);
      const payload = {
        uid: pendingGoogleUser.uid,
        fullName: data.fullName.trim().slice(0, 100),
        email: (pendingGoogleUser.email ?? '').slice(0, 160),
        phone: data.phone.trim().slice(0, 20),
        unitNumber: data.unitNumber,
        floor,
        role: 'resident' as const,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      try {
        await setDoc(doc(db, 'residents', pendingGoogleUser.uid), payload);
        const profile: ResidentProfile = {
          uid: pendingGoogleUser.uid,
          fullName: payload.fullName,
          email: payload.email,
          phone: payload.phone,
          unitNumber: payload.unitNumber,
          floor,
          role: 'resident',
          authMode: 'firebase',
          createdAt: new Date().toISOString(),
        };
        setPendingGoogleUser(null);
        setResident(profile);
        await recordActivity(
          profile,
          'account',
          `Registered Unit ${profile.unitNumber} (Floor ${floor}) on Tower 3 Portal`,
          'overview'
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `residents/${pendingGoogleUser.uid}`);
      }
    },
    [pendingGoogleUser, recordActivity]
  );

  const loginWithUnitPasscode = useCallback(
    (unitNumber: string, passcode: string): { ok: boolean; error?: string } => {
      const cleanUnit = unitNumber.trim();
      const cleanPin = passcode.trim();
      if (!cleanUnit || !cleanPin) {
        return { ok: false, error: 'Select your unit number and enter your resident password.' };
      }
      const accounts = loadLocalAccounts();
      const found = accounts.find((acc) => acc.unitNumber === cleanUnit);
      if (!found) {
        return { ok: false, error: `No resident account found for Unit ${cleanUnit}. Please sign up.` };
      }
      if (found.passcode !== cleanPin) {
        return {
          ok: false,
          error: 'Incorrect password for this unit. (Default pre-registered resident PIN is "tower3".)',
        };
      }
      const rosterEntry = localStore.unitRoster.find((u) => u.unitNumber === cleanUnit);
      const displayName = rosterEntry?.occupantName?.trim() || found.fullName;
      const profile: ResidentProfile = {
        uid: found.uid,
        fullName: displayName,
        email: found.email,
        phone: found.phone,
        unitNumber: found.unitNumber,
        floor: found.floor,
        role: found.role,
        authMode: 'local',
        createdAt: found.createdAt,
      };
      localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(profile));
      setResident(profile);
      setAuthError(null);
      return { ok: true };
    },
    [localStore.unitRoster]
  );

  const loginAsAdmin = useCallback(
    (adminEmail: string, passcode: string): { ok: boolean; error?: string } => {
      const email = adminEmail.trim().toLowerCase();
      const pin = passcode.trim();
      if (!email || !pin) {
        return { ok: false, error: 'Enter your personal email ID and Admin Password.' };
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { ok: false, error: 'Enter a valid personal email address.' };
      }
      if (email.endsWith('@oilindia.in') || email.includes('.oilindia.in')) {
        return {
          ok: false,
          error: 'Company @oilindia.in email addresses cannot be used. Please use your personal email ID.',
        };
      }
      if (pin !== ADMIN_DEFAULT_PASSCODE) {
        return {
          ok: false,
          error: 'Incorrect Admin password.',
        };
      }
      const adminProfile: ResidentProfile = {
        uid: 'admin-tower3',
        fullName: 'Society Administrator',
        email,
        phone: '8876358668',
        unitNumber: 'ADM',
        floor: 0,
        role: 'admin',
        authMode: 'local',
        createdAt: '2026-01-01T00:00:00.000Z',
      };
      localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(adminProfile));
      setResident(adminProfile);
      setAuthError(null);
      return { ok: true };
    },
    []
  );

  const signupWithUnit = useCallback(
    (data: {
      fullName: string;
      unitNumber: string;
      email: string;
      phone: string;
      passcode: string;
    }): { ok: boolean; error?: string } => {
      const floor = getFloorForUnit(data.unitNumber);
      const accounts = loadLocalAccounts();
      const cleanName = data.fullName.trim();
      const newAcc: StoredLocalAccount = {
        uid: `local-${data.unitNumber}-${Date.now()}`,
        fullName: cleanName,
        email: data.email.trim(),
        phone: data.phone.trim(),
        unitNumber: data.unitNumber,
        floor,
        role: 'resident',
        passcode: data.passcode.trim(),
        createdAt: new Date().toISOString(),
      };
      const updated = accounts.filter((a) => a.unitNumber !== data.unitNumber).concat(newAcc);
      saveLocalAccounts(updated);

      // Update unit directory name when resident signs up
      updateLocalStore((prev) => ({
        ...prev,
        unitRoster: prev.unitRoster.map((u) =>
          u.unitNumber === data.unitNumber ? { ...u, occupantName: cleanName } : u
        ),
      }));

      const profile: ResidentProfile = {
        uid: newAcc.uid,
        fullName: newAcc.fullName,
        email: newAcc.email,
        phone: newAcc.phone,
        unitNumber: newAcc.unitNumber,
        floor: newAcc.floor,
        role: 'resident',
        authMode: 'local',
        createdAt: newAcc.createdAt,
      };
      localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(profile));
      setResident(profile);
      void recordActivity(
        profile,
        'account',
        `Created resident owner account for Unit ${profile.unitNumber} (Floor ${floor})`,
        'overview'
      );
      return { ok: true };
    },
    [recordActivity, updateLocalStore]
  );

  const signOut = useCallback(async () => {
    localStorage.removeItem(LOCAL_SESSION_KEY);
    if (resident?.authMode === 'firebase' || pendingGoogleUser) {
      await firebaseSignOut(auth);
    }
    setPendingGoogleUser(null);
    setResident(null);
  }, [resident, pendingGoogleUser]);

  // --- Unit Roster Management (Admin CRUD for Units 049-072) ---

  const updateUnitName = useCallback(
    async (unitNumber: string, occupantName: string) => {
      if (!resident || resident.role !== 'admin') return;
      const clean = occupantName.trim().slice(0, 100);
      const floor = getFloorForUnit(unitNumber);

      if (resident.authMode === 'firebase') {
        try {
          await setDoc(doc(db, 'unitDirectory', unitNumber), {
            societyId: SOCIETY_ID,
            unitNumber,
            floor,
            occupantName: clean,
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `unitDirectory/${unitNumber}`);
        }
      } else {
        updateLocalStore((prev) => ({
          ...prev,
          unitRoster: prev.unitRoster.map((u) =>
            u.unitNumber === unitNumber ? { ...u, occupantName: clean } : u
          ),
        }));
      }

      await recordActivity(
        resident,
        'account',
        clean
          ? `Admin updated Unit ${unitNumber} resident name to ${clean}`
          : `Admin cleared resident name for Unit ${unitNumber}`,
        'emergency'
      );
    },
    [resident, updateLocalStore, recordActivity]
  );

  // --- Notices CRUD ---

  const createNotice = useCallback(
    async (data: {
      title: string;
      content: string;
      category: NoticeCategory;
      priority: NoticePriority;
      effectiveDate: string;
    }) => {
      if (!resident) return;
      const id = createSafeId('notice');
      if (resident.authMode === 'firebase') {
        try {
          await setDoc(doc(db, 'notices', id), {
            societyId: SOCIETY_ID,
            title: data.title.trim().slice(0, 140),
            content: data.content.trim().slice(0, 2000),
            category: data.category,
            priority: data.priority,
            effectiveDate: data.effectiveDate.trim().slice(0, 40),
            authorUid: resident.uid,
            authorName: resident.fullName.slice(0, 100),
            authorUnit: resident.unitNumber,
            status: 'active',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `notices/${id}`);
        }
      } else {
        const item: NoticeItem = {
          id,
          societyId: SOCIETY_ID,
          title: data.title.trim(),
          content: data.content.trim(),
          category: data.category,
          priority: data.priority,
          effectiveDate: data.effectiveDate.trim(),
          authorUid: resident.uid,
          authorName: resident.fullName,
          authorUnit: resident.unitNumber,
          status: 'active',
          createdAt: new Date().toISOString(),
        };
        updateLocalStore((prev) => ({ ...prev, notices: [item, ...prev.notices] }));
      }
      await recordActivity(
        resident,
        'notice',
        `Published ${data.category} notice: ${data.title.trim()}`,
        'notices'
      );
    },
    [resident, updateLocalStore, recordActivity]
  );

  const updateNotice = useCallback(
    async (
      noticeId: string,
      data: {
        title: string;
        content: string;
        category: NoticeCategory;
        priority: NoticePriority;
        effectiveDate: string;
      }
    ) => {
      if (!resident) return;
      if (resident.authMode === 'firebase') {
        try {
          await updateDoc(doc(db, 'notices', noticeId), {
            title: data.title.trim().slice(0, 140),
            content: data.content.trim().slice(0, 2000),
            category: data.category,
            priority: data.priority,
            effectiveDate: data.effectiveDate.trim().slice(0, 40),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `notices/${noticeId}`);
        }
      } else {
        updateLocalStore((prev) => ({
          ...prev,
          notices: prev.notices.map((n) =>
            n.id === noticeId
              ? {
                  ...n,
                  title: data.title.trim(),
                  content: data.content.trim(),
                  category: data.category,
                  priority: data.priority,
                  effectiveDate: data.effectiveDate.trim(),
                }
              : n
          ),
        }));
      }
      await recordActivity(resident, 'notice', `Edited notice: ${data.title.trim()}`, 'notices');
    },
    [resident, updateLocalStore, recordActivity]
  );

  const deleteNotice = useCallback(
    async (noticeId: string) => {
      if (!resident) return;
      if (resident.authMode === 'firebase') {
        try {
          await deleteDoc(doc(db, 'notices', noticeId));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `notices/${noticeId}`);
        }
      } else {
        updateLocalStore((prev) => ({
          ...prev,
          notices: prev.notices.filter((n) => n.id !== noticeId),
        }));
      }
      await recordActivity(resident, 'notice', `Deleted notice from Notice Board`, 'notices');
    },
    [resident, updateLocalStore, recordActivity]
  );

  // --- Expenses CRUD ---

  const addExpense = useCallback(
    async (data: {
      title: string;
      category: ExpenseCategory;
      amount: number;
      month: string;
      description: string;
    }) => {
      if (!resident) return;
      const id = createSafeId('exp');
      const perUnitShare = roundCurrency(data.amount / 24);
      if (resident.authMode === 'firebase') {
        try {
          await setDoc(doc(db, 'expenses', id), {
            societyId: SOCIETY_ID,
            title: data.title.trim().slice(0, 120),
            category: data.category,
            amount: roundCurrency(data.amount),
            perUnitShare,
            month: data.month,
            description: data.description.trim().slice(0, 600),
            addedByUid: resident.uid,
            addedByName: resident.fullName.slice(0, 100),
            addedByUnit: resident.unitNumber,
            createdAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `expenses/${id}`);
        }
      } else {
        const item: ExpenseItem = {
          id,
          societyId: SOCIETY_ID,
          title: data.title.trim(),
          category: data.category,
          amount: roundCurrency(data.amount),
          perUnitShare,
          month: data.month,
          description: data.description.trim(),
          addedByUid: resident.uid,
          addedByName: resident.fullName,
          addedByUnit: resident.unitNumber,
          createdAt: new Date().toISOString(),
        };
        updateLocalStore((prev) => ({ ...prev, expenses: [item, ...prev.expenses] }));
      }
      await recordActivity(
        resident,
        'expense',
        `Added society expense: ${data.title.trim()} (Rs. ${roundCurrency(data.amount).toLocaleString('en-IN')} · Rs. ${perUnitShare.toFixed(2)}/unit)`,
        'bills'
      );
    },
    [resident, updateLocalStore, recordActivity]
  );

  const updateExpense = useCallback(
    async (
      expenseId: string,
      data: {
        title: string;
        category: ExpenseCategory;
        amount: number;
        month: string;
        description: string;
      }
    ) => {
      if (!resident || resident.role !== 'admin') return;
      const perUnitShare = roundCurrency(data.amount / 24);
      if (resident.authMode === 'firebase') {
        try {
          await updateDoc(doc(db, 'expenses', expenseId), {
            title: data.title.trim().slice(0, 120),
            category: data.category,
            amount: roundCurrency(data.amount),
            perUnitShare,
            month: data.month,
            description: data.description.trim().slice(0, 600),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `expenses/${expenseId}`);
        }
      } else {
        updateLocalStore((prev) => ({
          ...prev,
          expenses: prev.expenses.map((e) =>
            e.id === expenseId
              ? {
                  ...e,
                  title: data.title.trim(),
                  category: data.category,
                  amount: roundCurrency(data.amount),
                  perUnitShare,
                  month: data.month,
                  description: data.description.trim(),
                }
              : e
          ),
        }));
      }
      await recordActivity(
        resident,
        'expense',
        `Admin updated expense: ${data.title.trim()} (Rs. ${roundCurrency(data.amount).toLocaleString('en-IN')})`,
        'bills'
      );
    },
    [resident, updateLocalStore, recordActivity]
  );

  const deleteExpense = useCallback(
    async (expenseId: string) => {
      if (!resident) return;
      if (resident.authMode === 'firebase') {
        try {
          await deleteDoc(doc(db, 'expenses', expenseId));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `expenses/${expenseId}`);
        }
      } else {
        updateLocalStore((prev) => ({
          ...prev,
          expenses: prev.expenses.filter((e) => e.id !== expenseId),
        }));
      }
      await recordActivity(resident, 'expense', `Deleted an expense item`, 'bills');
    },
    [resident, updateLocalStore, recordActivity]
  );

  // --- Payments CRUD ---

  const payDues = useCallback(
    async (data: {
      month: string;
      unitNumber?: string;
      residentName?: string;
      cleanerShare: number;
      extraExpensesShare: number;
      totalAmount: number;
      paymentMethod: PaymentMethod;
      referenceNumber: string;
    }) => {
      if (!resident) return;
      const targetUnit =
        resident.role === 'admin' && data.unitNumber ? data.unitNumber : resident.unitNumber;
      const targetName =
        data.residentName !== undefined
          ? data.residentName.trim()
          : resident.role === 'admin'
            ? ''
            : resident.fullName;
      const id = `pay-${data.month}-${targetUnit}-${Date.now()}`;

      if (resident.authMode === 'firebase') {
        try {
          await setDoc(doc(db, 'payments', id), {
            societyId: SOCIETY_ID,
            month: data.month,
            unitNumber: targetUnit,
            residentUid: resident.uid,
            residentName: targetName.slice(0, 100),
            cleanerShare: roundCurrency(data.cleanerShare),
            extraExpensesShare: roundCurrency(data.extraExpensesShare),
            totalAmount: roundCurrency(data.totalAmount),
            paymentMethod: data.paymentMethod,
            referenceNumber: data.referenceNumber.trim().slice(0, 80),
            status: 'paid',
            createdAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `payments/${id}`);
        }
      } else {
        const record: PaymentRecord = {
          id,
          societyId: SOCIETY_ID,
          month: data.month,
          unitNumber: targetUnit,
          residentUid: resident.uid,
          residentName: targetName,
          cleanerShare: roundCurrency(data.cleanerShare),
          extraExpensesShare: roundCurrency(data.extraExpensesShare),
          totalAmount: roundCurrency(data.totalAmount),
          paymentMethod: data.paymentMethod,
          referenceNumber: data.referenceNumber.trim(),
          status: 'paid',
          createdAt: new Date().toISOString(),
        };
        updateLocalStore((prev) => ({
          ...prev,
          payments: [
            record,
            ...prev.payments.filter(
              (p) => !(p.month === data.month && p.unitNumber === targetUnit)
            ),
          ],
        }));
      }
      await recordActivity(
        resident,
        'payment',
        `Recorded ${data.month} dues payment for Unit ${targetUnit} (Rs. ${roundCurrency(data.totalAmount).toFixed(2)}) via ${data.paymentMethod} · Ref ${data.referenceNumber.trim()}`,
        'bills'
      );
    },
    [resident, updateLocalStore, recordActivity]
  );

  const deletePayment = useCallback(
    async (paymentId: string) => {
      if (!resident || resident.role !== 'admin') return;
      if (resident.authMode === 'firebase') {
        try {
          await deleteDoc(doc(db, 'payments', paymentId));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `payments/${paymentId}`);
        }
      } else {
        updateLocalStore((prev) => ({
          ...prev,
          payments: prev.payments.filter((p) => p.id !== paymentId),
        }));
      }
      await recordActivity(resident, 'payment', `Admin removed a payment record`, 'bills');
    },
    [resident, updateLocalStore, recordActivity]
  );

  // --- Maintenance CRUD ---

  const reportMaintenance = useCallback(
    async (data: {
      title: string;
      location: string;
      category: MaintenanceCategory;
      urgency: MaintenanceUrgency;
      description: string;
    }) => {
      if (!resident) return;
      const id = createSafeId('mnt');
      if (resident.authMode === 'firebase') {
        try {
          await setDoc(doc(db, 'maintenanceRequests', id), {
            societyId: SOCIETY_ID,
            title: data.title.trim().slice(0, 140),
            location: data.location.trim().slice(0, 100),
            category: data.category,
            urgency: data.urgency,
            description: data.description.trim().slice(0, 1500),
            status: 'reported',
            resolutionNote: '',
            reporterUid: resident.uid,
            reporterName: resident.fullName.slice(0, 100),
            reporterUnit: resident.unitNumber,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `maintenanceRequests/${id}`);
        }
      } else {
        const now = new Date().toISOString();
        const item: MaintenanceRequest = {
          id,
          societyId: SOCIETY_ID,
          title: data.title.trim(),
          location: data.location.trim(),
          category: data.category,
          urgency: data.urgency,
          description: data.description.trim(),
          status: 'reported',
          resolutionNote: '',
          reporterUid: resident.uid,
          reporterName: resident.fullName,
          reporterUnit: resident.unitNumber,
          createdAt: now,
          updatedAt: now,
        };
        updateLocalStore((prev) => ({
          ...prev,
          maintenanceRequests: [item, ...prev.maintenanceRequests],
        }));
      }
      await recordActivity(
        resident,
        'maintenance',
        `Reported building damage: ${data.title.trim()} (${data.location.trim()})`,
        'maintenance'
      );
    },
    [resident, updateLocalStore, recordActivity]
  );

  const updateMaintenanceRequest = useCallback(
    async (
      requestId: string,
      data: {
        title: string;
        location: string;
        category: MaintenanceCategory;
        urgency: MaintenanceUrgency;
        description: string;
        status: MaintenanceStatus;
        resolutionNote: string;
      }
    ) => {
      if (!resident) return;
      if (resident.authMode === 'firebase') {
        try {
          await updateDoc(doc(db, 'maintenanceRequests', requestId), {
            title: data.title.trim().slice(0, 140),
            location: data.location.trim().slice(0, 100),
            category: data.category,
            urgency: data.urgency,
            description: data.description.trim().slice(0, 1500),
            status: data.status,
            resolutionNote: data.resolutionNote.trim().slice(0, 500),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `maintenanceRequests/${requestId}`);
        }
      } else {
        updateLocalStore((prev) => ({
          ...prev,
          maintenanceRequests: prev.maintenanceRequests.map((m) =>
            m.id === requestId
              ? {
                  ...m,
                  title: data.title.trim(),
                  location: data.location.trim(),
                  category: data.category,
                  urgency: data.urgency,
                  description: data.description.trim(),
                  status: data.status,
                  resolutionNote: data.resolutionNote.trim(),
                  updatedAt: new Date().toISOString(),
                }
              : m
          ),
        }));
      }
      await recordActivity(
        resident,
        'maintenance',
        `Edited maintenance request: ${data.title.trim()}`,
        'maintenance'
      );
    },
    [resident, updateLocalStore, recordActivity]
  );

  const updateMaintenanceStatus = useCallback(
    async (requestId: string, status: MaintenanceStatus, resolutionNote: string) => {
      if (!resident) return;
      if (resident.authMode === 'firebase') {
        try {
          await updateDoc(doc(db, 'maintenanceRequests', requestId), {
            status,
            resolutionNote: resolutionNote.trim().slice(0, 500),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `maintenanceRequests/${requestId}`);
        }
      } else {
        updateLocalStore((prev) => ({
          ...prev,
          maintenanceRequests: prev.maintenanceRequests.map((m) =>
            m.id === requestId
              ? {
                  ...m,
                  status,
                  resolutionNote: resolutionNote.trim(),
                  updatedAt: new Date().toISOString(),
                }
              : m
          ),
        }));
      }
      const label =
        status === 'in_progress' ? 'In Progress' : status === 'resolved' ? 'Resolved' : 'Reported';
      await recordActivity(
        resident,
        'maintenance',
        `Updated maintenance request status to ${label}`,
        'maintenance'
      );
    },
    [resident, updateLocalStore, recordActivity]
  );

  const deleteMaintenanceRequest = useCallback(
    async (requestId: string) => {
      if (!resident || resident.role !== 'admin') return;
      if (resident.authMode === 'firebase') {
        try {
          await deleteDoc(doc(db, 'maintenanceRequests', requestId));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `maintenanceRequests/${requestId}`);
        }
      } else {
        updateLocalStore((prev) => ({
          ...prev,
          maintenanceRequests: prev.maintenanceRequests.filter((m) => m.id !== requestId),
        }));
      }
      await recordActivity(
        resident,
        'maintenance',
        `Admin deleted a maintenance request`,
        'maintenance'
      );
    },
    [resident, updateLocalStore, recordActivity]
  );

  // --- Discussions CRUD ---

  const createDiscussion = useCallback(
    async (data: {
      title: string;
      category: DiscussionCategory;
      body: string;
    }): Promise<string> => {
      if (!resident) return '';
      const id = createSafeId('disc');
      if (resident.authMode === 'firebase') {
        try {
          await setDoc(doc(db, 'discussions', id), {
            societyId: SOCIETY_ID,
            title: data.title.trim().slice(0, 160),
            category: data.category,
            body: data.body.trim().slice(0, 2500),
            authorUid: resident.uid,
            authorName: resident.fullName.slice(0, 100),
            authorUnit: resident.unitNumber,
            status: 'open',
            replyCount: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `discussions/${id}`);
        }
      } else {
        const now = new Date().toISOString();
        const topic: DiscussionTopic = {
          id,
          societyId: SOCIETY_ID,
          title: data.title.trim(),
          category: data.category,
          body: data.body.trim(),
          authorUid: resident.uid,
          authorName: resident.fullName,
          authorUnit: resident.unitNumber,
          status: 'open',
          replyCount: 0,
          replies: [],
          createdAt: now,
          updatedAt: now,
        };
        updateLocalStore((prev) => ({
          ...prev,
          discussions: [topic, ...prev.discussions],
        }));
      }
      await recordActivity(
        resident,
        'discussion',
        `Opened common issue discussion: ${data.title.trim()}`,
        'discussions'
      );
      return id;
    },
    [resident, updateLocalStore, recordActivity]
  );

  const updateDiscussion = useCallback(
    async (
      topicId: string,
      data: {
        title: string;
        category: DiscussionCategory;
        body: string;
        status: 'open' | 'resolved';
      }
    ) => {
      if (!resident || resident.role !== 'admin') return;
      if (resident.authMode === 'firebase') {
        try {
          await updateDoc(doc(db, 'discussions', topicId), {
            title: data.title.trim().slice(0, 160),
            category: data.category,
            body: data.body.trim().slice(0, 2500),
            status: data.status,
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `discussions/${topicId}`);
        }
      } else {
        updateLocalStore((prev) => ({
          ...prev,
          discussions: prev.discussions.map((t) =>
            t.id === topicId
              ? {
                  ...t,
                  title: data.title.trim(),
                  category: data.category,
                  body: data.body.trim(),
                  status: data.status,
                  updatedAt: new Date().toISOString(),
                }
              : t
          ),
        }));
      }
      await recordActivity(
        resident,
        'discussion',
        `Admin edited discussion topic: ${data.title.trim()}`,
        'discussions'
      );
    },
    [resident, updateLocalStore, recordActivity]
  );

  const deleteDiscussion = useCallback(
    async (topicId: string) => {
      if (!resident || resident.role !== 'admin') return;
      if (resident.authMode === 'firebase') {
        try {
          await deleteDoc(doc(db, 'discussions', topicId));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `discussions/${topicId}`);
        }
      } else {
        updateLocalStore((prev) => ({
          ...prev,
          discussions: prev.discussions.filter((t) => t.id !== topicId),
        }));
      }
      await recordActivity(resident, 'discussion', `Admin deleted a discussion topic`, 'discussions');
    },
    [resident, updateLocalStore, recordActivity]
  );

  const addDiscussionReply = useCallback(
    async (topicId: string, body: string) => {
      if (!resident) return;
      const replyId = createSafeId('rep');
      if (resident.authMode === 'firebase') {
        const topic = fbDiscussions.find((t) => t.id === topicId);
        const nextCount = (topic?.replyCount ?? 0) + 1;
        try {
          const batch = writeBatch(db);
          batch.set(doc(db, 'discussions', topicId, 'replies', replyId), {
            societyId: SOCIETY_ID,
            topicId,
            body: body.trim().slice(0, 1500),
            authorUid: resident.uid,
            authorName: resident.fullName.slice(0, 100),
            authorUnit: resident.unitNumber,
            createdAt: serverTimestamp(),
          });
          batch.update(doc(db, 'discussions', topicId), {
            replyCount: nextCount,
            updatedAt: serverTimestamp(),
          });
          await batch.commit();
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `discussions/${topicId}/replies/${replyId}`);
        }
      } else {
        const reply: DiscussionReply = {
          id: replyId,
          societyId: SOCIETY_ID,
          topicId,
          body: body.trim(),
          authorUid: resident.uid,
          authorName: resident.fullName,
          authorUnit: resident.unitNumber,
          createdAt: new Date().toISOString(),
        };
        updateLocalStore((prev) => ({
          ...prev,
          discussions: prev.discussions.map((t) =>
            t.id === topicId
              ? {
                  ...t,
                  replyCount: (t.replies?.length ?? t.replyCount) + 1,
                  replies: [...(t.replies ?? []), reply],
                  updatedAt: new Date().toISOString(),
                }
              : t
          ),
        }));
      }
      await recordActivity(resident, 'discussion', `Replied in common issue discussion`, 'discussions');
    },
    [resident, fbDiscussions, updateLocalStore, recordActivity]
  );

  const deleteDiscussionReply = useCallback(
    async (topicId: string, replyId: string) => {
      if (!resident) return;
      if (resident.authMode === 'firebase') {
        try {
          await deleteDoc(doc(db, 'discussions', topicId, 'replies', replyId));
        } catch (err) {
          handleFirestoreError(
            err,
            OperationType.DELETE,
            `discussions/${topicId}/replies/${replyId}`
          );
        }
      } else {
        updateLocalStore((prev) => ({
          ...prev,
          discussions: prev.discussions.map((t) => {
            if (t.id !== topicId) return t;
            const nextReplies = (t.replies ?? []).filter((r) => r.id !== replyId);
            return {
              ...t,
              replies: nextReplies,
              replyCount: nextReplies.length,
            };
          }),
        }));
      }
    },
    [resident, updateLocalStore]
  );

  const resolveDiscussion = useCallback(
    async (topicId: string) => {
      if (!resident) return;
      if (resident.authMode === 'firebase') {
        try {
          await updateDoc(doc(db, 'discussions', topicId), {
            status: 'resolved',
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `discussions/${topicId}`);
        }
      } else {
        updateLocalStore((prev) => ({
          ...prev,
          discussions: prev.discussions.map((t) =>
            t.id === topicId
              ? { ...t, status: 'resolved', updatedAt: new Date().toISOString() }
              : t
          ),
        }));
      }
      await recordActivity(
        resident,
        'discussion',
        `Marked discussion topic as resolved`,
        'discussions'
      );
    },
    [resident, updateLocalStore, recordActivity]
  );

  const deleteActivity = useCallback(
    async (activityId: string) => {
      if (!resident || resident.role !== 'admin') return;
      if (resident.authMode === 'firebase') {
        try {
          await deleteDoc(doc(db, 'activities', activityId));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `activities/${activityId}`);
        }
      } else {
        updateLocalStore((prev) => ({
          ...prev,
          activities: prev.activities.filter((a) => a.id !== activityId),
        }));
      }
    },
    [resident, updateLocalStore]
  );

  const subscribeTopicReplies = useCallback(
    (topicId: string) => {
      if (!resident || resident.authMode !== 'firebase') {
        return () => {};
      }
      const q = query(
        collection(db, 'discussions', topicId, 'replies'),
        where('societyId', '==', SOCIETY_ID),
        where('topicId', '==', topicId)
      );
      return onSnapshot(
        q,
        (snap) => {
          const list: DiscussionReply[] = snap.docs
            .map((d) => {
              const data = d.data();
              return {
                id: d.id,
                societyId: SOCIETY_ID,
                topicId,
                body: String(data.body ?? ''),
                authorUid: String(data.authorUid ?? ''),
                authorName: String(data.authorName ?? ''),
                authorUnit: String(data.authorUnit ?? 'ADM'),
                createdAt: timestampToIso(data.createdAt),
              };
            })
            .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
          setFbRepliesByTopic((prev) => ({ ...prev, [topicId]: list }));
        },
        (error) => handleFirestoreError(error, OperationType.LIST, `discussions/${topicId}/replies`)
      );
    },
    [resident]
  );

  const isFirebase = resident?.authMode === 'firebase';
  const isAdmin = resident?.role === 'admin';

  const unitRoster = useMemo<UnitDirectoryEntry[]>(() => {
    if (!isFirebase) {
      return localStore.unitRoster;
    }
    return DEFAULT_UNIT_ROSTER.map((u) => ({
      ...u,
      occupantName: fbUnitDirectory[u.unitNumber] ?? '',
    }));
  }, [isFirebase, localStore.unitRoster, fbUnitDirectory]);

  const localRepliesMap = useMemo(() => {
    const map: Record<string, DiscussionReply[]> = {};
    for (const d of localStore.discussions) {
      map[d.id] = d.replies ?? [];
    }
    return map;
  }, [localStore.discussions]);

  const value: SocietyContextValue = {
    resident,
    isAdmin,
    pendingGoogleUser,
    authLoading,
    authError,
    selectedMonth,
    setSelectedMonth,
    unitRoster,
    notices: isFirebase ? fbNotices : localStore.notices,
    expenses: isFirebase ? fbExpenses : localStore.expenses,
    payments: isFirebase ? fbPayments : localStore.payments,
    maintenanceRequests: isFirebase ? fbMaintenance : localStore.maintenanceRequests,
    discussions: isFirebase ? fbDiscussions : localStore.discussions,
    activities: isFirebase ? fbActivities : localStore.activities,
    repliesByTopic: isFirebase ? fbRepliesByTopic : localRepliesMap,
    signInWithGoogle,
    signInAsAdminWithGoogle,
    completeGoogleRegistration,
    loginWithUnitPasscode,
    loginAsAdmin,
    signupWithUnit,
    signOut,
    updateUnitName,
    createNotice,
    updateNotice,
    deleteNotice,
    addExpense,
    updateExpense,
    deleteExpense,
    payDues,
    deletePayment,
    reportMaintenance,
    updateMaintenanceRequest,
    updateMaintenanceStatus,
    deleteMaintenanceRequest,
    createDiscussion,
    updateDiscussion,
    deleteDiscussion,
    addDiscussionReply,
    deleteDiscussionReply,
    resolveDiscussion,
    deleteActivity,
    subscribeTopicReplies,
  };

  return <SocietyContext.Provider value={value}>{children}</SocietyContext.Provider>;
}

export function useSociety() {
  const ctx = useContext(SocietyContext);
  if (!ctx) throw new Error('useSociety must be used within SocietyProvider');
  return ctx;
}
