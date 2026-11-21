export type NavSection =
  | 'overview'
  | 'bills'
  | 'notices'
  | 'maintenance'
  | 'discussions'
  | 'activity'
  | 'emergency';

export type ResidentRole = 'resident' | 'representative' | 'admin';

export interface ResidentProfile {
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  unitNumber: string; // "049" to "072"
  floor: number; // 1 to 6
  role: ResidentRole;
  authMode: 'firebase' | 'local';
  createdAt: string;
}

export interface UnitDirectoryEntry {
  unitNumber: string;
  floor: number;
  occupantName: string;
  isRepresentative?: boolean;
  repPhone?: string;
}

export type NoticeCategory =
  | 'Emergency Work'
  | 'Maintenance'
  | 'Society Meeting'
  | 'General';

export type NoticePriority = 'urgent' | 'normal';

export interface NoticeItem {
  id: string;
  societyId: 'tower3-duliajan';
  title: string;
  content: string;
  category: NoticeCategory;
  priority: NoticePriority;
  effectiveDate: string;
  authorUid: string;
  authorName: string;
  authorUnit: string;
  status: 'active' | 'archived';
  createdAt: string;
}

export type ExpenseCategory =
  | 'Common Area Repair'
  | 'Cleaning Supplies'
  | 'Security & Lighting'
  | 'Sanitation'
  | 'Miscellaneous';

export interface ExpenseItem {
  id: string;
  societyId: 'tower3-duliajan';
  title: string;
  category: ExpenseCategory;
  amount: number;
  perUnitShare: number;
  month: string; // YYYY-MM
  description: string;
  addedByUid: string;
  addedByName: string;
  addedByUnit: string;
  createdAt: string;
}

export type PaymentMethod = 'UPI' | 'Bank Transfer' | 'Cash to Representative';

export interface PaymentRecord {
  id: string;
  societyId: 'tower3-duliajan';
  month: string; // YYYY-MM
  unitNumber: string;
  residentUid: string;
  residentName: string;
  cleanerShare: number;
  extraExpensesShare: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  referenceNumber: string;
  status: 'paid';
  createdAt: string;
}

export type MaintenanceCategory =
  | 'Plumbing & Leakage'
  | 'Electrical Fixture'
  | 'Structural & Masonry'
  | 'Lift & Staircase'
  | 'Common Area & Gate';

export type MaintenanceUrgency = 'High' | 'Medium' | 'Low';
export type MaintenanceStatus = 'reported' | 'in_progress' | 'resolved';

export interface MaintenanceRequest {
  id: string;
  societyId: 'tower3-duliajan';
  title: string;
  location: string;
  category: MaintenanceCategory;
  urgency: MaintenanceUrgency;
  description: string;
  status: MaintenanceStatus;
  resolutionNote: string;
  reporterUid: string;
  reporterName: string;
  reporterUnit: string;
  createdAt: string;
  updatedAt: string;
}

export type DiscussionCategory =
  | 'Cleanliness'
  | 'Parking & Entry'
  | 'Building Upkeep'
  | 'Security'
  | 'General';

export interface DiscussionReply {
  id: string;
  societyId: 'tower3-duliajan';
  topicId: string;
  body: string;
  authorUid: string;
  authorName: string;
  authorUnit: string;
  createdAt: string;
}

export interface DiscussionTopic {
  id: string;
  societyId: 'tower3-duliajan';
  title: string;
  category: DiscussionCategory;
  body: string;
  authorUid: string;
  authorName: string;
  authorUnit: string;
  status: 'open' | 'resolved';
  replyCount: number;
  replies?: DiscussionReply[];
  createdAt: string;
  updatedAt: string;
}

export type ActivityActionType =
  | 'payment'
  | 'expense'
  | 'notice'
  | 'maintenance'
  | 'discussion'
  | 'account';

export interface ActivityEntry {
  id: string;
  societyId: 'tower3-duliajan';
  scope: 'personal' | 'society';
  actorUid: string;
  actorName: string;
  actorUnit: string;
  actionType: ActivityActionType;
  summary: string;
  targetSection: 'bills' | 'notices' | 'maintenance' | 'discussions' | 'overview' | 'emergency';
  createdAt: string;
}
